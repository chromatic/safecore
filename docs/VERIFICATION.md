# Initial publication verification

Checks performed against the standalone source tree for 0.1.0-test.9:

- Nine core wallet suites, including independent Bitcore derivation, recovery,
  signing, transaction limits, network consistency, cache isolation, first-address
  pinning, QR parsing and the 25-second balance reporting gate.
- Sixteen isolated browser suites covering desktop/mobile layouts, creation,
  recovery, backup, deletion, asset selection, scanner lifecycle, Max, activity,
  reporting, cached/offline state and local reset. Mocked sends did not broadcast
  on either mainnet.
- Real browser-generated signatures accepted and mined by both Core binaries on
  disconnected temporary regtest chains, with zero network peers.
- Android liveTest build and lint: zero errors, six warnings; signed APK verified;
  manifest non-debuggable; exact allowlisted source/assets matched; no saved wallet
  or private signing material packaged. Existing dependency/deprecation warnings
  remain maintenance work, not evidence of a security audit.
- ElectrumX container build plus ten Whippet/history-compaction regression tests.
- Blockbook's complete native/RocksDB container build, including its PEP adapter.
- Compose syntax validation using placeholder configuration, not production values.
- Seven offline release-publisher tests: tag/hash/debug guards, draft publication,
  no overwriting published assets and no token forwarding to an untrusted host.
- Staged-source path/content guard and Gitleaks scan, with reviewed narrowly scoped
  public-fixture exceptions.

The generic multi-service deployment has not been brought up against newly synced
mainnet nodes as part of publication. Operators must perform the documented
readiness, TLS and firewall checks. A unit test, successful build or clean secret
scan does not establish production security or consensus compatibility.

GitHub's fresh browser environment exposed test assertions that read the previous
screen immediately after hash navigation. The affected wallet-list, receive,
deletion and icon tests now wait for rendered state, not an arbitrary delay.
The wallet's runtime behavior and released APK are unchanged by those test fixes.

The initial Blockbook Dockerfile used obsolete Debian Bullseye package URLs that
failed during this check. The standalone build uses Bookworm, removes unnecessary
container-host packages, bounds RocksDB compile parallelism and stops on dependency
download errors. It retains the imported Go 1.21 / RocksDB 7.7.2 compatibility
baseline; dependency/toolchain upgrades and vulnerability review remain necessary
before treating the explorer deployment as production-hardened.
