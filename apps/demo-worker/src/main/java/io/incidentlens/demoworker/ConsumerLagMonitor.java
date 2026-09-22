package io.incidentlens.demoworker;

import io.incidentlens.common.OrderCreated;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PreDestroy;
import org.apache.kafka.clients.admin.Admin;
import org.apache.kafka.clients.admin.ListOffsetsResult;
import org.apache.kafka.clients.admin.OffsetSpec;
import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Component
public class ConsumerLagMonitor {
    private final Admin admin;
    private final boolean enabled;
    private volatile double lag = Double.NaN;
    public ConsumerLagMonitor(@Value("${spring.kafka.bootstrap-servers}") String bootstrap, MeterRegistry meters,
                              @Value("${incidentlens.worker.lag.enabled:true}") boolean enabled) {
        this.enabled = enabled;
        this.admin = Admin.create(Map.of("bootstrap.servers", bootstrap, "default.api.timeout.ms", 3000, "request.timeout.ms", 2000));
        meters.gauge("incidentlens.kafka.consumer.lag", this, monitor -> monitor.lag);
    }
    @Scheduled(fixedDelayString = "${incidentlens.worker.lag-interval-ms:2000}")
    public void refresh() {
        if (!enabled) return;
        try {
            var descriptions = admin.describeTopics(java.util.List.of(OrderCreated.TOPIC)).allTopicNames().get(3, TimeUnit.SECONDS);
            Map<TopicPartition, OffsetSpec> request = new HashMap<>();
            descriptions.get(OrderCreated.TOPIC).partitions().forEach(partition -> request.put(new TopicPartition(OrderCreated.TOPIC, partition.partition()), OffsetSpec.latest()));
            Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> ends = admin.listOffsets(request).all().get(3, TimeUnit.SECONDS);
            var committed = admin.listConsumerGroupOffsets("incidentlens-fulfillment-v1").partitionsToOffsetAndMetadata().get(3, TimeUnit.SECONDS);
            long total = 0;
            for (var entry : ends.entrySet()) total += Math.max(0, entry.getValue().offset() - (committed.containsKey(entry.getKey()) ? committed.get(entry.getKey()).offset() : 0));
            lag = total;
        } catch (Exception ex) { lag = Double.NaN; }
    }
    public Double current() { return Double.isFinite(lag) ? lag : null; }
    @PreDestroy public void close() { admin.close(java.time.Duration.ofSeconds(1)); }
}
