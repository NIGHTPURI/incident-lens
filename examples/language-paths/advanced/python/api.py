"""FastAPI exercise boundary. The tokens are local fixtures, not signed identities."""
import json
import logging
import os
import secrets
import time
from threading import Lock
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from store import Store
from cache import Cache

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("catalog_practice")
scheme = HTTPBearer(auto_error=False)


class OrderInput(BaseModel):
    productId: int
    quantity: int = Field(ge=1, le=100)


def create_app(store: Store, tokens: dict[str, str]):
    if len(tokens) != 2 or any(len(token) < 24 for token in tokens.values()) or len(set(tokens.values())) != 2:
        raise ValueError("two distinct exercise tokens of at least 24 characters required")
    app = FastAPI(title="Catalog practice (local only)")
    metrics = {"requests": 0, "errors": 0, "duration_ms_sum": 0.0}
    gate = Lock()
    cache = Cache()

    def actor(auth: HTTPAuthorizationCredentials | None = Depends(scheme)):
        if auth is None:
            raise HTTPException(status_code=401, detail="bearer token required")
        for owner, token in tokens.items():
            if secrets.compare_digest(auth.credentials, token):
                return owner
        raise HTTPException(status_code=401, detail="invalid bearer token")

    @app.middleware("http")
    async def observe(request: Request, call_next):
        started = time.perf_counter()
        request_id = str(uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        elapsed = (time.perf_counter() - started) * 1000
        with gate:
            metrics["requests"] += 1
            metrics["errors"] += int(response.status_code >= 400)
            metrics["duration_ms_sum"] += elapsed
        log.info(json.dumps({"requestId": request_id, "path": request.url.path, "status": response.status_code, "elapsedMs": round(elapsed, 2)}))
        response.headers["X-Request-Id"] = request_id
        return response

    @app.get("/health")
    def health():
        return {"status": "up"}

    @app.get("/products/{product_id}")
    def product(product_id: int):
        found = cache.get_or_load(product_id, lambda: store.product(product_id))
        if found is None:
            raise HTTPException(status_code=404, detail="product not found")
        return found

    @app.post("/orders")
    def create_order(body: OrderInput, response: Response, request: Request, owner: str = Depends(actor), idempotency_key: str | None = Header(None)):
        status, result = store.create(owner, idempotency_key or "", body.productId, body.quantity, request_id=request.state.request_id)
        response.status_code = status
        return result

    @app.get("/orders/{order_id}")
    def get_order(order_id: int, owner: str = Depends(actor)):
        found = store.find(order_id)
        if not found:
            raise HTTPException(status_code=404, detail="order not found")
        if found[0] != owner:
            raise HTTPException(status_code=403, detail="order access denied")
        return found[1]

    @app.get("/metrics")
    def local_metrics(_owner: str = Depends(actor)):
        with gate:
            snapshot = dict(metrics)
        return {**snapshot, "cache": cache.snapshot(), "outboxPending": store.pending(), "scope": "one API process; not Prometheus"}

    return app


def environment_app():
    tokens = {"alice": os.environ.get("PRACTICE_ALICE_TOKEN", ""), "bob": os.environ.get("PRACTICE_BOB_TOKEN", "")}
    return create_app(Store(os.environ.get("PRACTICE_DB", "practice.db")), tokens)
