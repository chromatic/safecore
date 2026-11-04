"""Check tracked/indexed publishable files, without printing matching secrets.

This is a narrow packaging guard, not a replacement for secret scanning/review.
Public crypto test vectors in upstream tests are expected and remain intact.
"""
import json
from pathlib import Path, PurePosixPath
import re
import subprocess

root = Path(__file__).resolve().parents[1]
names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
problems = []
for name in filter(None, names):
    path = PurePosixPath(name)
    if (path.name == '.env' or path.suffix in {'.apk', '.aab', '.jks', '.keystore', '.key', '.pem', '.db', '.sqlite', '.sqlite3'}
            or path.name == 'local.properties' or name.endswith(('.local.json', '.local.conf'))
            or any(part in {'node_modules', '.gradle', '__pycache__', 'test-results'} for part in path.parts)):
        problems.append((name, 'private/runtime/generated path'))
    raw = (root / name).read_bytes()
    if len(raw) > 25 * 1024 * 1024:
        problems.append((name, 'unexpected large source file'))
    try:
        content = raw.decode('utf8')
    except UnicodeDecodeError:
        continue
    checks = {
        'private-key block': r'-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----',
        'GitHub credential': r'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}',
        'AWS access key': r'AKIA[A-Z0-9]{16}',
        'personal home path': r'/(?:home|Users)/[A-Za-z0-9_.-]+/',
    }
    for kind, expression in checks.items():
        if re.search(expression, content):
            problems.append((name, kind))

for required in ['services/blockbook/COPYING', 'services/electrumx/LICENCE',
                 'whippet/www/assets/ethers.LICENSE', 'whippet/www/assets/qrcode.LICENSE',
                 'whippet/www/assets/jsQR.LICENSE']:
    if required not in names:
        problems.append((required, 'required notice not tracked'))

for name, reason in problems:
    print(f'FAIL {name}: {reason}')
if problems:
    raise SystemExit(1)
print(f'PASS: {len(list(filter(None, names)))} tracked files pass publication path/content checks.')
