import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

// A deliberately small, local-only read API. No database or product writes.
class TinyServer {
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 18181), 0);
        server.createContext("/", exchange -> {
            int status;
            String body;
            if (!exchange.getRequestURI().getPath().equals("/total")) {
                status = 404;
                body = "{\"error\":\"not found\"}";
            } else if (!exchange.getRequestMethod().equals("GET")) {
                status = 405;
                exchange.getResponseHeaders().set("Allow", "GET");
                body = "{\"error\":\"method not allowed\"}";
            } else {
                try {
                    String query = exchange.getRequestURI().getRawQuery();
                    if (query == null || !query.matches("quantity=[0-9]+")) throw new IllegalArgumentException();
                    int quantity = Integer.parseInt(query.substring("quantity=".length()));
                    if (quantity < 1 || quantity > 10) throw new IllegalArgumentException();
                    status = 200;
                    body = "{\"total\":" + 1200 * quantity + "}";
                } catch (IllegalArgumentException invalid) {
                    status = 400;
                    body = "{\"error\":\"quantity must be an integer from 1 to 10\"}";
                }
            }
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(status, bytes.length);
            try (var output = exchange.getResponseBody()) { output.write(bytes); }
        });
        Runtime.getRuntime().addShutdownHook(new Thread(() -> server.stop(0)));
        server.start();
        System.out.println("Listening on http://127.0.0.1:18181");
    }
}
