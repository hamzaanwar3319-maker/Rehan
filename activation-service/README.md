# Marketplace Bot Activation Service

Node.js 20+ reference service. The offline Admin exports a JSON key batch; an operator imports it to this online activation authority. The server stores SHA-256 key hashes and atomically redeems each key once within a single Node process. Customer first activation requires internet; the signed token can then be verified offline.

## Native setup
1. Copy .env.example to .env and set ADMIN_API_TOKEN to a random secret of at least 32 characters. Load environment variables using your service manager.
2. Run `node keygen.mjs` once to create Ed25519 signing keys. Keep private-key.pem secret and backed up. Never commit it.
3. Set HOST=0.0.0.0 only behind a correctly configured HTTPS reverse proxy. Do not expose plain HTTP publicly.
4. Run `npm start`.

## Docker deployment
1. On a Linux VPS, install Docker Engine and the Docker Compose plugin.
2. Clone this repository and enter activation-service.
3. Copy .env.example to .env and set a long random ADMIN_API_TOKEN.
4. Run `node keygen.mjs` once on the server (or securely provision an existing key pair). Never copy private-key.pem into a public repository.
5. Create the data directory: `mkdir -p data`. The container entrypoint adjusts its ownership before dropping privileges.
6. Configure the Nginx HTTPS virtual host using nginx.conf.example. Replace activation.example.com with your real domain and configure a valid TLS certificate.
7. Run `docker compose up -d --build`. The API binds only to 127.0.0.1:8787; public traffic must pass through HTTPS Nginx.
8. Test `https://your-domain/health` and protect the VPS, .env, private key and data backups.

## Import Admin key batches
Export the JSON batch from the offline Admin. Transfer it securely to the VPS and run:

```bash
curl --fail-with-body -X POST https://your-domain/v1/admin/import-keys \
  -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @marketplace-bot-license-keys.json
```

The response reports how many new keys were imported. Re-importing the same batch is idempotent: already known keys with the same duration are skipped, not reset.

## Customer activation
The customer app posts `{"key":"1234567890"}` to `/v1/activate`. Successful redemption returns an Ed25519-signed token. A second attempt returns HTTP 409. Customer app release must pin the matching public key in customer-app/activation-public-key.pem before building.

## Sync redemption status back to offline Admin
From the VPS, download the report:

```bash
curl --fail -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN" \
  https://your-domain/v1/admin/redemptions \
  -o marketplace-bot-redemption-report.json
```

Transfer the JSON report to the offline Admin PC and choose **10-Digit Keys → Import redemption report**. Admin matches SHA-256 hashes to its local key records and updates redeemed and expiry dates. The report contains hashes, not raw keys.

## Production security requirements
- Use HTTPS, firewall, strong secret, backups and monitoring.
- Add a production WAF/reverse-proxy rate limit and alerting.
- This JSON-backed service is single-instance only. For multiple replicas, migrate to PostgreSQL transactions with a unique key-hash constraint.
- Keep the private signing key outside source control and limit access to it.
- No PC binding is used; a customer can copy their activation token and app data to another PC. This is the deliberate no-device-ID trade-off.
- Offline expiry enforcement is affected by local clock tampering unless periodic online checks are required.
- Admin local status is updated by importing redemption reports; the Admin itself remains fully offline.
