package io.incidentlens.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

public class CorrelationFilter extends OncePerRequestFilter {
    private final SessionTelemetry telemetry;
    public CorrelationFilter(SessionTelemetry telemetry) { this.telemetry = telemetry; }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        RequestContext context = RequestContext.from(request.getHeader("X-Incident-Id"), request.getHeader("X-Experiment-Phase"),
                request.getHeader("X-Correlation-Id"));
        response.setHeader("X-Correlation-Id", context.correlationId());
        long start = System.nanoTime(); boolean failed = false;
        try (var ignored = RequestContext.install(context);
             var correlation = MDC.putCloseable("correlationId", context.correlationId());
             var incident = MDC.putCloseable("incidentId", context.sessionId());
             var phase = MDC.putCloseable("experimentPhase", context.phase())) {
            try { chain.doFilter(request, response); }
            catch (Exception ex) { failed = true; throw ex; }
            finally {
                if (request.getRequestURI().startsWith("/api/")) telemetry.request(System.nanoTime() - start, failed || response.getStatus() >= 400);
            }
        } catch (ServletException | IOException ex) { throw ex; }
        catch (Exception ex) { throw new ServletException(ex); }
    }
}
