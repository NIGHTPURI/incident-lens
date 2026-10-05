"""Loopback-only, in-memory catalog/order learning API. Not production security."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from json import JSONDecodeError, dumps, loads
from os import environ
from threading import Lock
from urllib.parse import urlsplit


class Store:
    def __init__(self):
        self.lock = Lock()
        self.orders = {}
        self.keys = {}

    def create(self, key, product_id, quantity):
        if not key:
            return 400, {"error": "Idempotency-Key required"}
        if type(product_id) is not int or product_id != 1:
            return 404, {"error": "product not found"}
        if type(quantity) is not int or not 1 <= quantity <= 100:
            return 400, {"error": "quantity must be 1..100"}
        with self.lock:
            fingerprint = (product_id, quantity)
            if key in self.keys:
                old_fingerprint, old_id = self.keys[key]
                return (200, self.orders[old_id]) if fingerprint == old_fingerprint else (409, {"error": "key reused for different order"})
            order_id = len(self.orders) + 1
            order = {"id": order_id, "productId": product_id, "quantity": quantity, "total": 1200 * quantity, "status": "accepted"}
            self.orders[order_id] = order
            self.keys[key] = (fingerprint, order_id)
            return 201, order


store = Store()


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, body):
        data = dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/health":
            return self.respond(200, {"status": "up"})
        if path == "/products/1":
            return self.respond(200, {"id": 1, "price": 1200})
        if path.startswith("/products/"):
            return self.respond(404, {"error": "product not found"})
        if path.startswith("/orders/"):
            try:
                order_id = int(path.removeprefix("/orders/"))
            except ValueError:
                return self.respond(400, {"error": "order ID must be an integer"})
            with store.lock:
                order = store.orders.get(order_id)
            return self.respond(200, order) if order else self.respond(404, {"error": "order not found"})
        return self.respond(404, {"error": "route not found"})

    def do_POST(self):
        if urlsplit(self.path).path != "/orders":
            return self.respond(404, {"error": "route not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 4096:
                raise ValueError("body size")
            body = loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError("object required")
        except (JSONDecodeError, ValueError):
            return self.respond(400, {"error": "valid JSON object required (max 4096 bytes)"})
        status, result = store.create(self.headers.get("Idempotency-Key", ""), body.get("productId"), body.get("quantity"))
        return self.respond(status, result)


if __name__ == "__main__":
    port = int(environ.get("PORT", "18182"))
    print(f"practice API: http://127.0.0.1:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
