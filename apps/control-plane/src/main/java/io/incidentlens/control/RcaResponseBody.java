package io.incidentlens.control;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;

/** Bounds accumulated response bytes before decoding the provider's JSON. */
final class RcaResponseBody implements HttpResponse.BodySubscriber<String> {
    static final int MAX_BYTES = 65_536;
    private final CompletableFuture<String> body = new CompletableFuture<>();
    private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    private final String rejection;
    private Flow.Subscription subscription;

    private RcaResponseBody(HttpResponse.ResponseInfo response) {
        rejection = response.statusCode() != 200 ? "Provider returned unusable status"
            : response.headers().firstValueAsLong("Content-Length").orElse(0) > MAX_BYTES
                ? "Provider response exceeds byte budget" : null;
    }

    static HttpResponse.BodyHandler<String> handler() { return RcaResponseBody::new; }

    @Override public CompletionStage<String> getBody() { return body; }

    @Override public void onSubscribe(Flow.Subscription incoming) {
        if (subscription != null) { incoming.cancel(); return; }
        subscription = incoming;
        if (rejection != null) reject(rejection);
        else subscription.request(1);
    }

    @Override public void onNext(List<ByteBuffer> buffers) {
        if (body.isDone()) return;
        long incomingBytes = 0;
        for (ByteBuffer buffer : buffers) {
            incomingBytes += buffer.remaining();
            if (incomingBytes > MAX_BYTES - bytes.size()) {
                reject("Provider response exceeds byte budget");
                return;
            }
        }
        // Copy only accepted bytes; do not retain buffers owned by the HTTP client.
        for (ByteBuffer buffer : buffers) {
            byte[] chunk = new byte[buffer.remaining()];
            buffer.get(chunk);
            bytes.writeBytes(chunk);
        }
        subscription.request(1);
    }

    @Override public void onError(Throwable error) {
        body.completeExceptionally(error);
        bytes.reset();
    }

    @Override public void onComplete() {
        if (!body.isDone()) body.complete(bytes.toString(StandardCharsets.UTF_8));
        bytes.reset();
    }

    private void reject(String reason) {
        subscription.cancel();
        onError(new IOException(reason));
    }
}
