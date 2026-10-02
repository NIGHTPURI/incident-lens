package io.incidentlens.control;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.io.IOException;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.Flow;
import static org.assertj.core.api.Assertions.*;

class RcaResponseBodyTest {
    @Test void acceptsExactlyTheByteBudgetAcrossChunks() {
        var body = subscriber(200, Map.of("Content-Length", List.of("65536")));
        var subscription = new RecordingSubscription();
        body.onSubscribe(subscription);
        body.onNext(List.of(ByteBuffer.wrap(new byte[32_768])));
        body.onNext(List.of(ByteBuffer.wrap(new byte[32_768])));
        assertThat(body.getBody().toCompletableFuture()).isNotDone();
        body.onComplete();
        assertThat(body.getBody().toCompletableFuture().join()).hasSize(65_536);
        assertThat(subscription.cancelled).isFalse();
    }

    @ParameterizedTest @ValueSource(strings = {"absent", "1", "65536"})
    void cancelsBeforeConsumingTheFirstByteOverBudgetEvenWithoutAccurateLength(String length) {
        var headers = length.equals("absent") ? Map.<String, List<String>>of() : Map.of("Content-Length", List.of(length));
        var body = subscriber(200, headers);
        var subscription = new RecordingSubscription();
        body.onSubscribe(subscription);
        body.onNext(List.of(ByteBuffer.wrap(new byte[65_536])));
        var excess = ByteBuffer.wrap(new byte[1]);
        body.onNext(List.of(excess));
        assertThat(subscription.cancelled).isTrue();
        assertThat(excess.position()).isZero();
        assertThat(body.getBody().toCompletableFuture()).isCompletedExceptionally();
        // Neither late delivery nor completion can replace a failed partial body with success.
        body.onNext(List.of(ByteBuffer.wrap(new byte[10])));
        body.onComplete();
        assertThatThrownBy(() -> body.getBody().toCompletableFuture().join()).hasRootCauseMessage("Provider response exceeds byte budget");
    }

    @Test void checksTheWholeBatchBeforeCopyingAnyBuffer() {
        var body = subscriber(200, Map.of());
        var subscription = new RecordingSubscription(); body.onSubscribe(subscription);
        var first = ByteBuffer.wrap(new byte[40_000]); var second = ByteBuffer.wrap(new byte[40_000]);
        body.onNext(List.of(first, second));
        assertThat(subscription.cancelled).isTrue();
        assertThat(first.position()).isZero(); assertThat(second.position()).isZero();
    }

    @Test void declaredOversizeCancelsWithoutRequestingBodyData() {
        var body = subscriber(200, Map.of("Content-Length", List.of("65537")));
        var subscription = new RecordingSubscription(); body.onSubscribe(subscription);
        assertThat(subscription.cancelled).isTrue();
        assertThat(subscription.requested).isZero();
        assertThat(body.getBody().toCompletableFuture()).isCompletedExceptionally();
    }

    @ParameterizedTest @ValueSource(ints = {302, 400, 429, 503})
    void rejectsErrorStatusWithoutReadingPotentiallySensitiveBody(int status) {
        var body = subscriber(status, Map.of());
        var subscription = new RecordingSubscription(); body.onSubscribe(subscription);
        assertThat(subscription.cancelled).isTrue();
        assertThat(subscription.requested).isZero();
        assertThatThrownBy(() -> body.getBody().toCompletableFuture().join()).hasRootCauseMessage("Provider returned unusable status");
    }

    @Test void decodesUtf8OnlyAfterAllByteFragmentsArrive() {
        var body = subscriber(200, Map.of()); body.onSubscribe(new RecordingSubscription());
        String text = "장애 원인 🔍";
        for (byte b : text.getBytes(StandardCharsets.UTF_8)) body.onNext(List.of(ByteBuffer.wrap(new byte[]{b})));
        body.onComplete();
        assertThat(body.getBody().toCompletableFuture().join()).isEqualTo(text);
    }

    @Test void limitsBytesRatherThanKoreanCharacterCount() {
        byte[] text = "가".repeat(21_846).getBytes(StandardCharsets.UTF_8);
        var body = subscriber(200, Map.of()); var subscription = new RecordingSubscription(); body.onSubscribe(subscription);
        body.onNext(List.of(ByteBuffer.wrap(text)));
        assertThat(text).hasSize(65_538);
        assertThat(subscription.cancelled).isTrue();
        assertThat(body.getBody().toCompletableFuture()).isCompletedExceptionally();
    }

    @Test void transportFailureCannotReturnPartialText() {
        var body = subscriber(200, Map.of()); body.onSubscribe(new RecordingSubscription());
        body.onNext(List.of(ByteBuffer.wrap("partial".getBytes(StandardCharsets.UTF_8))));
        body.onError(new IOException("connection lost")); body.onComplete();
        assertThatThrownBy(() -> body.getBody().toCompletableFuture().join()).hasRootCauseMessage("connection lost");
    }

    @Test void handlesEmptyBodyAndDuplicateSubscription() {
        var body = subscriber(200, Map.of()); var original = new RecordingSubscription(); var duplicate = new RecordingSubscription();
        body.onSubscribe(original); body.onSubscribe(duplicate); body.onNext(List.of()); body.onComplete();
        assertThat(duplicate.cancelled).isTrue(); assertThat(original.cancelled).isFalse();
        assertThat(body.getBody().toCompletableFuture().join()).isEmpty();
    }

    static HttpResponse.BodySubscriber<String> subscriber(int status, Map<String, List<String>> headers) {
        return RcaResponseBody.handler().apply(info(status, headers));
    }
    static HttpResponse.ResponseInfo info(int status, Map<String, List<String>> headers) {
        return new HttpResponse.ResponseInfo() {
            public int statusCode() { return status; }
            public HttpHeaders headers() { return HttpHeaders.of(headers, (key, value) -> true); }
            public HttpClient.Version version() { return HttpClient.Version.HTTP_1_1; }
        };
    }
    static class RecordingSubscription implements Flow.Subscription {
        boolean cancelled;
        long requested;
        public void request(long count) { requested += count; }
        public void cancel() { cancelled = true; }
    }
}
