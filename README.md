# SafeCore

An extensible, self-custodial Android wallet for Layer-1 coins, launching with
Pepecoin and Whippet, with self-hostable Electrum and Blockbook backends.

This is a development prerelease, not an audited production wallet. Use small,
expendable amounts and keep an independent recovery backup.

[Download the Android prerelease](https://github.com/lostinbtc/safecore/releases)
or run the browser preview from a local checkout:

```sh
python3 whippet/scripts/serve.py
```

Open `http://localhost:8787`. See the wallet guide before importing recovery
material. Use an independent offline backup; browser storage is not a backup.

## Components

- `whippet/`: the SafeCore wallet, Android project, browser preview and tests.
  The directory name is historical; the app is named SafeCore.
- `services/electrumx/`: the ElectrumX fork with Pepecoin and Whippet support.
- `services/blockbook/`: the Pepecoin Blockbook fork and its source.
- `infra/`: self-hosted deployment templates and node configuration examples.
- `docs/`: architecture, operations, compatibility and release instructions.

Pepecoin and Whippet each need their own fully synchronized Core node, ElectrumX
process and database. A single ElectrumX instance does not index both chains.
Blockbook indexes Pepecoin separately and provides explorer/API functionality;
Whippet does not currently have a bundled Blockbook adapter or explorer.

The wallet derives keys and signs on-device. Indexers receive public address
queries and signed transactions, never recovery phrases or private keys.

## Start here

- [Wallet behavior and build instructions](whippet/README.md)
- [Self-hosting](docs/SELF_HOSTING.md)
- [Architecture and boundaries](docs/ARCHITECTURE.md)
- [Security and current limitations](SECURITY.md)
- [Licenses and third-party notices](THIRD_PARTY_NOTICES.md)
- [APK release and verification](docs/RELEASES.md)

Core nodes must finish synchronization and transaction indexing before the
backend is usable. Starting containers is not proof of readiness. This repository
contains source and templates, not blockchain databases, wallets, TLS private
keys, RPC credentials or Android signing keys.

Currently implemented assets are PEP and WHT. Dogecoin is a disabled coming-soon
entry. Adding another asset requires protocol, derivation, address-validation,
indexer and transaction tests; it is not just an icon or configuration change.
