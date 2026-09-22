package io.incidentlens.demoapi;

import io.incidentlens.common.OrderCreated;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfiguration {
    @Bean NewTopic ordersTopic() { return TopicBuilder.name(OrderCreated.TOPIC).partitions(3).replicas(1).build(); }
    @Bean NewTopic ordersDlqTopic() { return TopicBuilder.name(OrderCreated.DLQ).partitions(3).replicas(1).build(); }
}
