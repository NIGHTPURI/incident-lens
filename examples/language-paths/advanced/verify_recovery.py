"""Real loopback process/restart/worker checks; no external Redis or Kafka claim."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import secrets
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parent

def verify(track):
    commands = {
        'python': ([sys.executable, '-m', 'uvicorn', 'entry:app', '--host', '127.0.0.1'], [sys.executable, 'worker.py']),
        'javascript': (['node', 'api.mjs'], ['node', 'worker.mjs']),
        'typescript': (['node', 'dist/server.mjs'], ['node', 'worker.mjs']),
    }
    folder = ROOT / ('javascript' if track == 'typescript' else track)
    with tempfile.TemporaryDirectory(prefix='incidentlens-recovery-') as directory:
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', 0)); port = probe.getsockname()[1]
        env = dict(os.environ, PRACTICE_DB=str(Path(directory)/'practice.db'), PORT=str(port),
                   PRACTICE_ALICE_TOKEN=secrets.token_urlsafe(32), PRACTICE_BOB_TOKEN=secrets.token_urlsafe(32))
        serve, work = commands[track]
        if track == 'python': serve = serve + ['--port', str(port)]
        processes = []
        logs = []
        def start(command):
            log = open(Path(directory) / f'process-{len(logs)}.log', 'w+')
            logs.append(log)
            process = subprocess.Popen(command, cwd=folder, env=env, stdout=log, stderr=log)
            processes.append(process)
            if command == work:
                for _ in range(300):
                    if 'worker_ready' in Path(log.name).read_text(): break
                    assert process.poll() is None, 'worker exited before readiness'
                    time.sleep(.1)
                else: raise AssertionError('worker readiness timeout')
            return process, log
        def stop(process):
            if process.poll() is None:
                process.terminate()
                try: process.wait(timeout=10)
                except subprocess.TimeoutExpired: process.kill(); process.wait(); raise AssertionError('graceful stop timed out')
            # Uvicorn 0.34.2 re-raises SIGTERM after completing lifespan shutdown.
            if track == 'python' and '-m' in process.args and process.returncode == -signal.SIGTERM:
                log = logs[processes.index(process)]; log.seek(0)
                assert 'Application shutdown complete.' in log.read(), 'Uvicorn did not complete shutdown'
            else:
                assert process.returncode == 0, f'{track} process exit: {process.returncode}'
        def request(path, body=None, owner=None, key=None):
            headers = {'Content-Type':'application/json'}
            if owner: headers['Authorization'] = 'Bearer '+env[f'PRACTICE_{owner.upper()}_TOKEN']
            if key: headers['Idempotency-Key'] = key
            req = urllib.request.Request(f'http://127.0.0.1:{port}'+path, data=json.dumps(body).encode() if body else None, headers=headers)
            try: response = urllib.request.urlopen(req, timeout=3)
            except urllib.error.HTTPError as error: response = error
            return response.status, json.load(response), response.headers
        def ready():
            for _ in range(100):
                try:
                    if request('/health')[0] == 200: return
                except (OSError, urllib.error.URLError): pass
                time.sleep(.1)
            raise AssertionError('API startup timeout')
        try:
            api, _ = start(serve); ready()
            assert request('/products/1')[0] == 200
            assert request('/products/9')[0] == 404
            assert request('/orders/1')[0] == 401
            status, order, headers = request('/orders', {'productId':1,'quantity':2}, 'alice', 'restart-1')
            assert status == 201 and order['status'] == 'accepted'
            request_id = headers['X-Request-Id']; order_id = order['id']
            assert request(f'/orders/{order_id}', owner='bob')[0] == 403
            assert request('/orders', {'productId':1,'quantity':3}, 'alice','restart-1')[0] == 409
            with ThreadPoolExecutor(max_workers=8) as pool:
                replies = list(pool.map(lambda _: request('/orders', {'productId':1,'quantity':2}, 'alice','parallel-1'), range(8)))
            assert sorted(r[0] for r in replies) == [200]*7+[201]
            assert len({r[1]['id'] for r in replies}) == 1
            stop(api)
            api, _ = start(serve); ready()
            status, replay, _ = request('/orders', {'productId':1,'quantity':2}, 'alice','restart-1')
            assert status == 200 and replay['id'] == order_id
            assert request(f'/orders/{order_id}', owner='alice')[1]['status'] == 'accepted'
            worker, log = start(work)
            for _ in range(100):
                if request(f'/orders/{order_id}', owner='alice')[1]['status'] == 'fulfilled': break
                time.sleep(.1)
            else: raise AssertionError('worker did not fulfill pending order')
            stop(worker); log.seek(0); output = log.read()
            assert request_id in output and f'"orderId": {order_id}' in output.replace(':', ': ').replace(':  ', ': ')
            assert env['PRACTICE_ALICE_TOKEN'] not in output
            # Drain the parallel order too before checking a restarted worker has no work.
            parallel_id = replies[0][1]['id']
            worker, second = start(work)
            for _ in range(100):
                if request(f'/orders/{parallel_id}', owner='alice')[1]['status'] == 'fulfilled': break
                time.sleep(.1)
            else: raise AssertionError('parallel order not recovered')
            stop(worker)
            worker, third = start(work); time.sleep(1.2); stop(worker); third.seek(0)
            assert 'local_outbox_processed' not in third.read(), 'restarted worker duplicated effect'
            stop(api)
            print(json.dumps({'track':track,'verified':['HTTP','401/403','replay/409','8 parallel requests','API restart','pending recovery','worker restart','request/order/event log correlation','graceful stop']}))
        finally:
            for process in processes:
                if process.poll() is None: process.terminate(); process.wait(timeout=10)
            for log in logs: log.close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('track', choices=['python','javascript','typescript'])
    verify(parser.parse_args().track)
