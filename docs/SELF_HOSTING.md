# Self-hosting the backends

These are operator templates, not a one-click production deployment. The Android
app works with configured public services; users do not need to run a server.
No private operator addresses or credentials are provided here.

## Requirements and boundaries

Use a Linux host with Docker Engine/Compose v2, adequate SSD space, memory and
bandwidth for two full chains and three indexes. Size from actual chain/index
growth; the 256 MB cache settings are not total-memory limits. Blockbook's native
RocksDB build is resource-intensive. Back up host configuration before deploying.

Install and fully sync Pepecoin Core and Whippet Core independently using their
upstream build instructions. References used for this snapshot:

- [Pepecoin Core](https://github.com/lostinbtc/pepecoin), commit
  `bbea128343dc4902eaf020683cbd52a4328d2000`.
- [Whippet Core](https://github.com/chromatic/whippet-experimental-blockchain),
  v1.4.0 / `5714663d99a4ee5e79ab4f5b2354e4eab5acc38e`.

Core source, chain data and binaries are not vendored. Review upstream updates
and consensus requirements; these references are compatibility records, not a
promise that old versions remain secure. Use dedicated non-custodial indexing
nodes, not a funded Core wallet.

Both nodes require `server=1`, `txindex=1`, `prune=0`. Enabling txindex on an old
database may require a node reindex. Merge the examples in `infra/` deliberately;
never overwrite a running node's configuration or data directory blindly.

The example RPC bindings are loopback-only for safety. Docker clients cannot
reach host loopback through `host.docker.internal`: configure each Core to listen
on a private host/Docker bridge interface, allow only the actual Compose subnet,
and enforce host firewall rules. Inspect that subnet with Docker network tools.
Use distinct strong RPC passwords per chain. Never expose ports 33873 or 33665
to the Internet. The Compose `host-gateway` mapping is for host nodes, not remote
public RPC. For separate node hosts, use a private network/tunnel and adjust URLs.

## Configure and start

From the repository root:

```sh
cd infra
cp .env.example .env
cp blockbook.example.json blockbook.local.json
chmod 600 .env blockbook.local.json
```

Edit both files locally. Set the correct private node addresses, RPC users and
passwords. URL-encode special characters in the Electrum daemon URLs. Set
Blockbook to the same PEP node with its PEP credentials, not WHT credentials.
The checked-in examples are unusable placeholders. Do not paste the resulting
configuration into issues or commit it.

Supply a trusted, hostname-valid TLS certificate and private key as
`infra/certs/fullchain.pem` and `infra/certs/privkey.pem`, or set `TLS_CERT_DIR`
to an absolute directory containing them. Mount complete resolved files, or the
full certificate tree if using symlinks; dangling renewal symlinks will fail.
Protect the directory/key from other users. Do not use self-signed certificates
or disable certificate validation in a distributed wallet. Arrange certificate
renewal and restart the Electrum containers after renewal.

```sh
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
```

`config --quiet` validates without printing expanded secrets. A running container
is not proof of readiness. Initial indexing may take a long time. The stack has
three separate named data volumes and a two-minute graceful stop period.
Do not run `docker compose down -v` on an existing deployment.

Public listeners are PEP WSS on 50004 and WHT WSS on 50005, configurable in `.env`.
Electrum's administrative RPC remains inside each container on loopback.
Blockbook listens on host loopback 9130 only; its internal/admin HTTP listener
is not enabled. PEP Core must also publish `hashblock` and `hashtx` notifications
on a private Docker-reachable ZeroMQ listener (example port 33338). Update the
loopback-only example binding to that private interface and firewall it: ZeroMQ
does not authenticate clients. Blockbook also performs periodic resynchronization.
To publish the explorer, adapt `blockbook-nginx.conf.example` to a host reverse
proxy with a valid TLS certificate, rate limits and access monitoring. Do not
publish an unauthenticated node RPC through that proxy.

## Check readiness before connecting a wallet

1. On each node, confirm mainnet, the expected genesis hash, no initial download,
   advancing tip and txindex readiness using that node's local CLI.
2. Inspect each Electrum log for its selected coin and indexed height. Compare
   `blockchain.headers.subscribe` to the corresponding node tip. Verify the
   `server.features` genesis hash over WSS. Logs can contain operational details;
   redact before sharing.
3. Query Blockbook on loopback: `curl -fsS http://127.0.0.1:9130/api/v2/`.
   Confirm PEP identity, synchronization and backend/index heights. Do not treat
   an HTTP 200 alone as a healthy index.
4. Check TLS using the public hostname and a separate client. Confirm RPC/admin
   ports are unreachable externally. Start with read-only wallet queries; no
   payment is needed to validate connectivity.

Expected genesis hashes:

| Chain | Genesis hash |
| --- | --- |
| PEP | `37981c0c48b8d48965376c8a42ece9a0838daadb93ff975cb091f57f8c2a5faa` |
| WHT | `863714e1c1a15526a0081a35097c56e28dbd43ef97f76fec0ccd5a7510326292` |

## Point your own wallet build at the services

Update the public WSS defaults in `whippet/www/network.js` and the `connect-src`
policy in `whippet/www/index.html` together. Keep the per-chain genesis checks.
The default app endpoints are public client configuration, not secret RPC URLs.
Never embed RPC passwords in the wallet.

For a different PEP explorer, update its URL in `whippet/www/app.js` and the exact
HTTPS host/path allowlist in Android `MainActivity.java`; update corresponding
browser/native tests too. This generic proxy serves Blockbook at `/`, whose
transaction path is `/tx/<txid>`, not necessarily the default app's path.
Do not broaden Android to arbitrary external navigation. Rebuild the APK and
verify its assets; JavaScript is bundled, not remotely updated. Use your own
package/signing identity for independently distributed forks.

## Maintenance and recovery

Monitor disk headroom, node/index heights, TLS expiry, errors, memory and restart
counts. Electrum's startup guard checks the legacy history flush counter and
compacts offline at 50,000 or resumes an interrupted compaction. Never run a
second compactor against a live database. Do not bypass a guard failure.

Before upgrades, record source/image versions and back up configuration plus
consistent stopped-volume snapshots. Protect backups as secrets. Stop cleanly
before filesystem-level index copies; never restore one chain's index into the
other. Retain previous images and matching database snapshots for rollback;
database migrations may make a binary-only downgrade unsafe. Restart and repeat
the readiness checks. Indexes can be rebuilt from nodes; they are not seed backups.

Failure triage: daemon-connection errors usually mean RPC binding/auth/firewall;
wrong genesis means wrong coin/node; TLS failures mean certificate/hostname/time;
stale balances require checking both node and index tip, not clearing the user's
wallet. Never delete a wallet or reset a chain database as a first troubleshooting
step. This repository does not deploy to or change any existing operator host.
