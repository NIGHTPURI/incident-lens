package io.incidentlens.common;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.assertj.core.api.Assertions.assertThat;

class JsonBodyLimitFilterTest {
    @Test void rejectsOversizedBodyWithoutContentLength() throws Exception {
        var request = new MockHttpServletRequest() { @Override public long getContentLengthLong() { return -1; } };
        request.setContentType("application/json"); request.setContent(new byte[32769]);
        var response = new MockHttpServletResponse(); var called = new AtomicBoolean();
        new JsonBodyLimitFilter().doFilter(request, response, (req, res) -> called.set(true));
        assertThat(response.getStatus()).isEqualTo(413); assertThat(called).isFalse();
    }
    @Test void rejectsOversizedJsonAndPreservesSmallJson() throws Exception {
        var filter = new JsonBodyLimitFilter(); var called = new AtomicBoolean();
        var request = new MockHttpServletRequest(); request.setContentType("application/json"); request.setContent(new byte[32769]);
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> called.set(true));
        assertThat(response.getStatus()).isEqualTo(413); assertThat(called).isFalse();
        request = new MockHttpServletRequest(); request.setContentType("application/json"); request.setContent("{\"value\":1}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
            assertThat(new String(req.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8)).isEqualTo("{\"value\":1}"); called.set(true);
        });
        assertThat(called).isTrue();
    }
}
