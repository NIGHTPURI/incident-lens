package io.incidentlens.common;

import java.util.UUID;
import java.util.regex.Pattern;

public record RequestContext(String sessionId, String phase, String correlationId) {
    private static final Pattern IDENTIFIER = Pattern.compile("[a-zA-Z0-9._:-]{1,96}");
    private static final ThreadLocal<RequestContext> CURRENT = new ThreadLocal<>();
    public static String safe(String value, String fallback) {
        return value != null && IDENTIFIER.matcher(value).matches() ? value : fallback;
    }
    public static RequestContext from(String session, String phase, String correlation) {
        String normalizedPhase = "BEFORE".equals(phase) || "AFTER".equals(phase) ? phase : "NONE";
        return new RequestContext(safe(session, "unscoped"), normalizedPhase, safe(correlation, UUID.randomUUID().toString()));
    }
    public static RequestContext current() {
        RequestContext result = CURRENT.get();
        return result == null ? from(null, null, null) : result;
    }
    public static AutoCloseable install(RequestContext context) {
        RequestContext previous = CURRENT.get(); CURRENT.set(context);
        return () -> { if (previous == null) CURRENT.remove(); else CURRENT.set(previous); };
    }
}
