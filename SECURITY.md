# Security and prerelease status

SafeCore is development software. It has not had an independent security audit.
Use expendable amounts, retain offline recovery backups, and verify a known
receiving address after restore. No guarantee of fund safety is made.

Do not post recovery words, private keys, passwords, backup JSON, RPC credentials,
certificate private keys, signing keys or wallet storage in issues or screenshots.
Use GitHub's private vulnerability reporting if enabled. If it is unavailable,
request a private contact channel without disclosing exploit details publicly.

The wallet trusts its configured chain services for reported chain state. TLS and
genesis checks do not turn it into a full-node/SPV verifier. Public endpoints and
client network requests are visible to users/operators; they are not secrets.
Self-hosting reduces third-party dependence but requires secure node, RPC, TLS,
indexer, operating-system and backup administration.

Password protection is optional. Without it, the seed recipe is stored in
plaintext locally and in backups. Screenshots/debugging are disabled in the
published prerelease but are not a substitute for encryption. Uninstalling may
erase the only local copy; use an independent recovery backup first.

The prerelease APK uses a development signing identity, not a production release
key. Check release hashes and the signing-certificate fingerprint before install.
Do not uninstall a funded wallet merely to bypass an Android signature mismatch.
Review dependencies and upstream security updates before public server deployment.

Maintainers: keep operational values in ignored local files; review the staged
tree and artifact contents before every push. Ignore rules do not scrub existing
Git history. A secret scan is a useful check, not proof that no secret exists.

`.gitleaks.toml` narrowly allows known public upstream test vectors, on-chain
data and shared defaults in the byte-identical ethers bundle. Exceptions match
both an exact file path and an exact value; entire test directories are not
excluded. They are not credentials for the deployed infrastructure. Review any
change to those exceptions rather than suppressing a new finding blindly.
