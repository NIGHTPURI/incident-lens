"""Loopback HTTP contract for the dependency-free Python/Node intro examples."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.request
import urllib.error

track = sys.argv[1]
folder = Path(__file__).parent / track
command = [sys.executable, 'app.py'] if track == 'python' else ['node', 'app.mjs']
with socket.socket() as probe:
    probe.bind(('127.0.0.1', 0)); port = probe.getsockname()[1]
process = subprocess.Popen(command, cwd=folder, env=dict(os.environ, PORT=str(port)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def request(path, quantity=None):
    req = urllib.request.Request(f'http://127.0.0.1:{port}'+path,
        data=json.dumps({'productId':1,'quantity':quantity}).encode() if quantity is not None else None,
        headers={'Content-Type':'application/json','Idempotency-Key':'intro-1'})
    try: response = urllib.request.urlopen(req, timeout=3)
    except urllib.error.HTTPError as error: response = error
    return response.status, json.load(response)
try:
    for _ in range(100):
        try:
            if request('/health')[0] == 200: break
        except OSError: time.sleep(.1)
    else: raise AssertionError('intro server startup timeout')
    assert request('/products/1') == (200, {'id':1,'price':1200})
    assert request('/products/9')[0] == 404
    status, order = request('/orders',2)
    assert status == 201 and order['total'] == 2400 and order['status'] == 'accepted'
    assert request('/orders',2) == (200,order)
    assert request('/orders',3)[0] == 409
    assert request('/orders',0)[0] == 400
    assert request('/orders/'+str(order['id'])) == (200,order)
    print(f'{track} intro: actual HTTP 200/201/400/404/409 passed')
finally:
    process.terminate(); process.wait(timeout=10)
