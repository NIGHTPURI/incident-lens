package io.incidentlens.common;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapGetter;
import java.util.HashMap;
import java.util.Map;

public final class TraceContext {
    private TraceContext() { }
    public static String traceId() {
        var context = Span.current().getSpanContext();
        return context.isValid() ? context.getTraceId() : null;
    }
    public static String capture() {
        Map<String, String> carrier = new HashMap<>();
        GlobalOpenTelemetry.getPropagators().getTextMapPropagator().inject(Context.current(), carrier, Map::put);
        return carrier.get("traceparent");
    }
    public static Scope restore(String traceparent) {
        Map<String, String> carrier = traceparent == null ? Map.of() : Map.of("traceparent", traceparent);
        Context context = GlobalOpenTelemetry.getPropagators().getTextMapPropagator().extract(Context.current(), carrier,
                new TextMapGetter<Map<String, String>>() {
                    public Iterable<String> keys(Map<String, String> map) { return map.keySet(); }
                    public String get(Map<String, String> map, String key) { return map == null ? null : map.get(key); }
                });
        return context.makeCurrent();
    }
}
