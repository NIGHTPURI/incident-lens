package io.incidentlens.control;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
class JsonCodec {
    final ObjectMapper mapper;
    JsonCodec(ObjectMapper mapper) { this.mapper = mapper; }
    String write(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (Exception e) { throw new IllegalStateException("Cannot serialize application value", e); }
    }
    <T> T read(String value, Class<T> type) {
        try { return mapper.readValue(value, type); }
        catch (Exception e) { throw new IllegalStateException("Cannot decode persisted application value", e); }
    }
    Map<String, Double> metrics(String value) {
        if (value == null) return null;
        try { return mapper.readValue(value, new TypeReference<>() {}); }
        catch (Exception e) { throw new IllegalStateException("Cannot decode experiment metrics", e); }
    }
}
