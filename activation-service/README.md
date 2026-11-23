# Marketplace Bot Activation Service

Node.js 20+ reference service. This is separate from the fully offline Admin. Admin exports a key batch JSON; an operator imports it to this online service once. The server stores only SHA-256 key hashes and atomically redeems each key once. Customer activation requires internet; the signed token can then be verified offline.

## Setup
1. Copy .env.example to .env and set a random ADMIN_API_TOKEN with at least 32 characters. Load env vars using your hosting process manager or a dotenv loader (no dependency is bundled).
2. Run `node keygen.mjs` once to create Ed25519 signing keys. Keep private-key.pem secret and backed up. Never commit it.
3. Set HOST=0.0.0.0 only behind a correctly configured HTTPS reverse proxy. Do not expose plain HTTP publicly.
4. `npm start`.

## Import keys
POST the exported Admin JSON to `/v1/admin/import-keys` with Authorization: Bearer <ADMIN_API_TOKEN>. Use HTTPS. Import rejects duplicate keys and duplicate imports.

## Customer activation
POST `{"key":"1234567890"}` to `/v1/activate`. Successful redemption returns a signed activation token. A second attempt returns HTTP 409.

## Security / production checklist
- Use HTTPS, firewall, strong secret, rate limiting/WAF, backups and monitoring.
- Put service behind reverse proxy and add request throttling before public launch.
- The reference service uses atomic serialized writes within one Node process; run a single instance only. For multiple replicas, migrate to PostgreSQL transactions with a unique key-hash constraint.
- Do not accept customer identity or PC ID; a token can be copied to another PC because the owner explicitly chose no device binding. This is a deliberate trade-off.
- The customer-app helper is not yet wired into the customer Electron app. Pin the public key in a trusted app release before production.
- Admin's local status does not automatically synchronize; server summary is authoritative after batch import.
