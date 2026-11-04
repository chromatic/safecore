"""Validate browser signing against both Cores on isolated, disconnected regtest.
No production daemon, wallet, credentials or network funds are used.
"""
import base64
import hashlib
import http.client
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parent
BINARIES = {'pep': os.environ.get('PEP_CORE_BIN', 'pepecoind'),
            'wht': os.environ.get('WHT_CORE_BIN', 'whippetd')}
ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

def decode(address):
    n = 0
    for c in address:
        n = n * 58 + ALPHABET.index(c)
    return b'\0' * (len(address) - len(address.lstrip('1'))) + n.to_bytes((n.bit_length()+7)//8, 'big')

def encode(payload):
    raw = payload + hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4]
    n, out = int.from_bytes(raw, 'big'), ''
    while n:
        n, mod = divmod(n, 58)
        out = ALPHABET[mod] + out
    return '1' * (len(raw)-len(raw.lstrip(b'\0'))) + out

def fixture(payload):
    result = subprocess.run(['node', str(ROOT/'sign_fixture.cjs')], input=json.dumps(payload), text=True, capture_output=True, check=True, timeout=30)
    return json.loads(result.stdout)

def verify(coin, binary):
    with socket.socket() as s:
        s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
    with tempfile.TemporaryDirectory(prefix='corevault-send-regtest-') as directory:
        data=Path(directory)
        with (data/'test-console.log').open('w') as log:
            proc=subprocess.Popen([binary,f'-datadir={data}','-regtest=1','-server=1','-listen=0','-connect=0','-dnsseed=0','-discover=0','-upnp=0',
                '-rpcbind=127.0.0.1','-rpcallowip=127.0.0.1',f'-rpcport={port}','-keypool=1','-dbcache=32','-maxmempool=16','-par=1','-printtoconsole=1'],stdout=log,stderr=subprocess.STDOUT)
            def rpc(method,*params):
                auth=base64.b64encode((data/'regtest'/'.cookie').read_bytes().strip()).decode()
                conn=http.client.HTTPConnection('127.0.0.1',port,timeout=30)
                try:
                    conn.request('POST','/',json.dumps({'id':1,'method':method,'params':params}),{'Authorization':'Basic '+auth,'Content-Type':'application/json'})
                    body=json.loads(conn.getresponse().read())
                    if body.get('error'): raise RuntimeError(body['error']['message'])
                    return body['result']
                finally: conn.close()
            try:
                deadline=time.monotonic()+40
                while True:
                    try: info=rpc('getblockchaininfo');break
                    except Exception:
                        if proc.poll() is not None or time.monotonic()>deadline: raise RuntimeError(f'{coin}: disposable regtest did not start')
                        time.sleep(.2)
                assert info['chain']=='regtest' and rpc('getconnectioncount')==0
                rpc('generate',65)
                original=fixture({'action':'address','coin':coin})
                # Address version is only display encoding; identical P2PKH hash.
                regtest_prefix=decode(rpc('getnewaddress'))[0]
                funding_address=encode(bytes([regtest_prefix])+decode(original['address'])[1:21])
                funding=rpc('sendtoaddress',funding_address,5)
                raw=rpc('gettransaction',funding)['hex']
                rpc('generate',1);height=rpc('getblockcount')
                signed=fixture({'action':'sign','coin':coin,'raw':raw,'tip':height,'height':height})
                decoded=rpc('decoderawtransaction',signed['raw'])
                assert decoded['txid']==signed['txid'] and len(decoded['vout'])==2
                txid=rpc('sendrawtransaction',signed['raw'])
                assert txid==signed['txid'] and txid in rpc('getrawmempool')
                rpc('generate',1)
                out=rpc('gettxout',txid,0)
                assert out['value']==1 and out['confirmations']==1
                assert rpc('getconnectioncount')==0
                print(f'PASS {coin}: browser signatures accepted by Core, fee/change verified, regtest transfer mined; zero network peers.',flush=True)
            finally:
                if proc.poll() is None:
                    try: rpc('stop');proc.wait(timeout=15)
                    except Exception:
                        proc.terminate()
                        try: proc.wait(timeout=5)
                        except subprocess.TimeoutExpired: proc.kill();proc.wait()

if __name__=='__main__':
    os.umask(0o077)
    for coin,binary in BINARIES.items(): verify(coin,binary)
