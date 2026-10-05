import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from api import create_app
from store import Store


class OrderApiTests(unittest.TestCase):
    def test_unauthenticated_forbidden_and_local_metrics(self):
        with tempfile.TemporaryDirectory() as directory:
            store = Store(str(Path(directory) / "isolated.db"))
            tokens = {"alice": "local-alice-token-very-long-only-for-tests", "bob": "local-bob-token-very-long-only-for-tests"}
            with TestClient(create_app(store, tokens)) as client:
                self.assertEqual(client.get("/orders/1").status_code, 401)
                first = client.post("/orders", headers={"Authorization": f"Bearer {tokens['alice']}", "Idempotency-Key": "one"}, json={"productId": 1, "quantity": 2})
                self.assertEqual(first.status_code, 201)
                order_id = first.json()["id"]
                self.assertEqual(client.get(f"/orders/{order_id}", headers={"Authorization": f"Bearer {tokens['bob']}"}).status_code, 403)
                self.assertEqual(client.get("/metrics", headers={"Authorization": f"Bearer {tokens['alice']}"}).json()["outboxPending"], 1)


if __name__ == "__main__":
    unittest.main()
