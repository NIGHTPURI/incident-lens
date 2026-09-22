package io.incidentlens.demoapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.incidentlens.common.*;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CatalogServiceTest {
    private final CatalogRepository repository = mock(CatalogRepository.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    @SuppressWarnings("unchecked") private final ValueOperations<String, String> values = mock(ValueOperations.class);
    private final FaultStore faults = mock(FaultStore.class);
    private final SessionTelemetry telemetry = new SessionTelemetry(new SimpleMeterRegistry());
    private final List<CatalogRepository.ProductView> products = List.of(new CatalogRepository.ProductView(1, "book", BigDecimal.TEN, "description"));
    private CatalogService service() {
        when(redis.opsForValue()).thenReturn(values);
        when(repository.find("books", false)).thenReturn(products);
        when(repository.find("books", true)).thenReturn(products);
        return new CatalogService(repository, redis, new ObjectMapper(), faults, telemetry);
    }
    @Test void concurrentColdRequestsCoalesceIntoOneDatabaseLoad() throws Exception {
        var cache = new ConcurrentHashMap<String, String>();
        var initialReads = ConcurrentHashMap.<Long>newKeySet();
        var allRequestsMissed = new CountDownLatch(16);
        when(values.get(anyString())).thenAnswer(invocation -> {
            String value = cache.get(invocation.getArgument(0));
            if (initialReads.add(Thread.currentThread().threadId())) {
                allRequestsMissed.countDown();
                if (!allRequestsMissed.await(5, TimeUnit.SECONDS)) throw new AssertionError("Concurrent requests did not reach the cold cache");
            }
            return value;
        });
        doAnswer(invocation -> { cache.put(invocation.getArgument(0), invocation.getArgument(1)); return null; })
                .when(values).set(anyString(), anyString(), any(Duration.class));
        when(faults.current()).thenReturn(FaultState.inactive());
        var service = service();
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(16)) {
            var tasks = new ArrayList<java.util.concurrent.Future<List<CatalogRepository.ProductView>>>();
            for (int n = 0; n < 16; n++) tasks.add(executor.submit(() -> { start.await(); return service.find("books"); }));
            start.countDown();
            for (var task : tasks) assertThat(task.get(5, TimeUnit.SECONDS)).containsExactlyElementsOf(products);
        }
        verify(repository, times(1)).find("books", false);
    }
    @Test void cacheFaultBypassesCoalescingAndDisablingRestoresCaching() throws Exception {
        var cache = new ConcurrentHashMap<String, String>();
        when(values.get(anyString())).thenAnswer(invocation -> cache.get(invocation.getArgument(0)));
        doAnswer(invocation -> { cache.put(invocation.getArgument(0), invocation.getArgument(1)); return null; })
                .when(values).set(anyString(), anyString(), any(Duration.class));
        when(faults.current()).thenReturn(new FaultState("s", FaultState.Scenario.CACHE_DEGRADATION, true, 0, Instant.now().plusSeconds(60)));
        var service = service();
        try (var context = RequestContext.install(RequestContext.from("s", "BEFORE", "test"))) {
            service.find("books"); service.find("books"); service.find("books");
        }
        when(faults.current()).thenReturn(FaultState.inactive());
        try (var context = RequestContext.install(RequestContext.from("s", "AFTER", "test"))) {
            service.find("books"); service.find("books"); service.find("books");
        }
        verify(repository, times(4)).find("books", false);
        assertThat(telemetry.snapshot("test", "s", "BEFORE", Map.of()).metrics().get("cacheHitRate")).isZero();
        assertThat(telemetry.snapshot("test", "s", "AFTER", Map.of()).metrics().get("cacheHitRate")).isCloseTo(2.0 / 3, org.assertj.core.data.Offset.offset(.001));
    }
    @Test void databaseFaultActuallyUsesTheDegradedQueryPath() throws Exception {
        when(faults.current()).thenReturn(new FaultState("s", FaultState.Scenario.DATABASE_DEGRADATION, true, 0, Instant.now().plusSeconds(60)));
        var service = service();
        try (var context = RequestContext.install(RequestContext.from("s", "BEFORE", "test"))) { service.find("books"); }
        verify(repository).find("books", true); verifyNoInteractions(values);
    }
    @Test void boundedDownstreamDelayIsObservableAndCanRecover() throws Exception {
        when(faults.current()).thenReturn(new FaultState("s", FaultState.Scenario.DOWNSTREAM_LATENCY, true, 40, Instant.now().plusSeconds(60)));
        var service = service();
        try (var context = RequestContext.install(RequestContext.from("s", "BEFORE", "test"))) {
            long start = System.nanoTime(); service.find("books");
            assertThat(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start)).isGreaterThanOrEqualTo(35);
        }
        when(faults.current()).thenReturn(FaultState.inactive());
        try (var context = RequestContext.install(RequestContext.from("s", "AFTER", "test"))) { service.find("books"); }
        assertThat(telemetry.snapshot("test", "s", "BEFORE", Map.of()).events()).extracting(SessionTelemetry.Event::type).contains("DOWNSTREAM_DELAY");
        assertThat(telemetry.snapshot("test", "s", "AFTER", Map.of()).events()).extracting(SessionTelemetry.Event::type).doesNotContain("DOWNSTREAM_DELAY");
    }
    @Test void redisOutageReturnsFreshDatabaseData() {
        when(values.get(anyString())).thenThrow(new org.springframework.data.redis.RedisConnectionFailureException("offline"));
        when(faults.current()).thenReturn(FaultState.inactive());
        assertThat(service().find("books")).containsExactlyElementsOf(products);
    }
}
