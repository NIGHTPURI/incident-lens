from pathlib import Path
import subprocess, socket, time, urllib.request, urllib.error, json
r=Path(__file__).resolve().parents[2]
base=r/'examples/beginner'
cases=[('Basics',[], 'Notebook: 2400\ntrue\n2'),('Totals',[], '1200\n2400\n3600'),('Catalog',[], '1700'),('ParseQuantity',[], '2400'),('ParseQuantity',['3'],'3600'),('ParseQuantity',['two'],'Invalid quantity: two'),('ParseQuantity',['0'],'Invalid quantity: 0')]
for name,args,expected in cases:
    result=subprocess.run(['java',str(base/'java'/f'{name}.java'),*args],capture_output=True,text=True,timeout=25,check=True)
    assert result.stdout.strip()==expected, (name,result.stdout)
print('PASS: 7 Java source-file execution cases',flush=True)
with socket.socket() as probe:
    probe.bind(('127.0.0.1',18181))
server=subprocess.Popen(['java',str(base/'http/TinyServer.java')],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
    for attempt in range(100):
        if server.poll() is not None: raise RuntimeError(server.stderr.read())
        try:
            with socket.create_connection(('127.0.0.1',18181),timeout=.1): break
        except OSError: time.sleep(.1)
    else: raise RuntimeError('example server did not start')
    cases=[('/total?quantity=2','GET',200,{'total':2400}),('/total?quantity=10','GET',200,{'total':12000}),('/total','GET',400,None),('/total?quantity=0','GET',400,None),('/total?quantity=11','GET',400,None),('/total?quantity=two','GET',400,None),('/missing','GET',404,None),('/total?quantity=2','POST',405,None)]
    for path,method,expected_status,body in cases:
        request=urllib.request.Request('http://127.0.0.1:18181'+path,method=method)
        try: response=urllib.request.urlopen(request,timeout=3)
        except urllib.error.HTTPError as error: response=error
        with response:
            assert response.status==expected_status,(path,response.status)
            result=json.load(response)
            if body is not None: assert result==body,(path,result)
            else: assert 'error' in result
    print('PASS: 8 real HTTP cases against this script-owned toy server',flush=True)
finally:
    server.terminate()
    server.communicate(timeout=10)
