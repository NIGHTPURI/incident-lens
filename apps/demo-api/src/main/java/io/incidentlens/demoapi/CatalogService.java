package io.incidentlens.demoapi;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.incidentlens.common.FaultState;
import io.incidentlens.common.FaultStore;
import io.incidentlens.common.RequestContext;
import io.incidentlens.common.SessionTelemetry;
import io.opentelemetry.api.GlobalOpenTelemetry;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Service
public class CatalogService {
    private static final Set<String> CATEGORIES = Set.of("books", "electronics", "games", "office");
    private final Map<String, ReentrantLock> locks = CATEGORIES.stream().collect(Collectors.toUnmodifiableMap(value -> value, value -> new ReentrantLock()));
    private final CatalogRepository catalog;
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final FaultStore faults;
    private final SessionTelemetry telemetry;
    public CatalogService(CatalogRepository catalog, StringRedisTemplate redis, ObjectMapper mapper, FaultStore faults, SessionTelemetry telemetry) {
        this.catalog = catalog; this.redis = redis; this.mapper = mapper; this.faults = faults; this.telemetry = telemetry;
    }
    public List<CatalogRepository.ProductView> find(String category) {
        if (!CATEGORIES.contains(category)) throw new IllegalArgumentException("Unknown category");
        FaultState state = faults.current(); String session = RequestContext.current().sessionId();
        if (state.active(FaultState.Scenario.DOWNSTREAM_LATENCY, session)) latency(state.boundedDelayMillis());
        boolean degradedQuery = state.active(FaultState.Scenario.DATABASE_DEGRADATION, session);
        boolean degradedCache = state.active(FaultState.Scenario.CACHE_DEGRADATION, session);
        if (degradedQuery || degradedCache) {
            telemetry.cache(false);
            telemetry.event(degradedQuery ? "INEFFICIENT_QUERY" : "CACHE_BYPASS", degradedQuery
                    ? "Catalog used 1 category scan and 50 individual detail queries; cache bypassed to isolate database work"
                    : "Redis cache and request coalescing bypassed; each catalog request loads MySQL");
            return catalog.find(category, degradedQuery);
        }
        String key = "incidentlens:catalog:v1:" + category;
        var cached = read(key);
        if (cached != null) { telemetry.cache(true); return cached; }
        ReentrantLock lock = locks.get(category);
        boolean acquired = false;
        try {
            acquired = lock.tryLock(2, TimeUnit.SECONDS);
            if (!acquired) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Catalog is busy; retry later");
            cached = read(key);
            if (cached != null) { telemetry.cache(true); return cached; }
            telemetry.cache(false);
            var result = catalog.find(category, false);
            try { redis.opsForValue().set(key, mapper.writeValueAsString(result), Duration.ofSeconds(ThreadLocalRandom.current().nextInt(25, 36))); }
            catch (Exception ex) { telemetry.event("CACHE_UNAVAILABLE", "Redis write failed; returning fresh MySQL result"); }
            return result;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt(); throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Request interrupted");
        } finally { if (acquired) lock.unlock(); }
    }
    private List<CatalogRepository.ProductView> read(String key) {
        try {
            String json = redis.opsForValue().get(key);
            return json == null ? null : mapper.readValue(json, new TypeReference<>() { });
        } catch (Exception ex) { telemetry.event("CACHE_UNAVAILABLE", "Redis read failed; using bounded MySQL fallback"); return null; }
    }
    private void latency(int milliseconds) {
        var span = GlobalOpenTelemetry.getTracer("incidentlens").spanBuilder("inventory.lookup").startSpan();
        try (var ignored = span.makeCurrent()) {
            Thread.sleep(Math.min(milliseconds, 1500));
            if (milliseconds > 1500) {
                telemetry.event("DOWNSTREAM_TIMEOUT", "Inventory simulation exceeded its 1500ms request budget");
                throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "Inventory lookup timed out");
            }
            telemetry.event("DOWNSTREAM_DELAY", "Inventory simulation delayed the request by " + milliseconds + "ms");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt(); throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Request interrupted");
        } finally { span.end(); }
    }
}
