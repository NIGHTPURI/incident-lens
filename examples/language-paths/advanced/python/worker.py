"""Separate local outbox poller with graceful shutdown; not Kafka."""
import json
import os
import signal
from threading import Event
from store import Store
stopped = Event()
for sig in (signal.SIGINT, signal.SIGTERM):
    signal.signal(sig, lambda *_: stopped.set())
store = Store(os.environ.get("PRACTICE_DB", "practice.db"))
print(json.dumps({"event": "worker_ready"}), flush=True)
while not stopped.is_set():
    try:
        if not store.process_one():
            stopped.wait(1)
    except Exception as error:
        print(json.dumps({"event": "worker_error", "type": type(error).__name__}), flush=True)
        stopped.wait(1)
