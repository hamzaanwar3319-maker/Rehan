# Marketplace Bot — Admin, Customer App and Activation Service

This repository contains three separate components:

- `desktop/`: fully offline Admin console for customer records, legacy signed licenses and 10-digit subscription-key batches.
- `customer-app/`: Windows customer desktop workspace for listing drafts, account-specific manual Facebook browser sessions, task tracking, local backup and activation.
- `activation-service/`: Node.js reference service for first online activation and globally one-time redemption.

## Build Windows installers
Use GitHub Actions → **Windows desktop builds** → Run workflow, or open a pull request touching either desktop app. The workflow builds separate Admin and customer EXE installers and uploads them as artifacts. Build success must be checked in the Actions run; no EXE should be assumed to exist before that.

For local builds, install Node.js 20+ and run `npm install` then `npm run build:win` from either `desktop/` or `customer-app/`.

## Admin key workflow
1. Launch Marketplace Bot Admin. On first launch, create the Admin username and a strong password.
2. Open **10-Digit Keys**, select 30/90/180/365 days and generate a batch of 10.
3. Export the JSON batch and register it with the activation service using the Admin API token over HTTPS.
4. Give one key to each customer.
5. Download the server redemption report from `GET /v1/admin/redemptions` and import it in Admin using **Import redemption report**. This updates local redeemed/expiry statuses.
6. Back up the Admin database and signing identity securely.

Admin remains offline. The online activation service is separate. Re-exporting the same Admin key file is safe: the service idempotently skips keys it has already imported, provided their duration matches.

## Activation service setup
See `activation-service/README.md`. Generate the Ed25519 key pair on the server with `node keygen.mjs`; keep `private-key.pem` secret and never commit it. Configure a random 32+ character `ADMIN_API_TOKEN`. Place the service behind HTTPS. It is a single-process reference service using a local JSON database; for production multi-instance deployment, use a transactional database with a unique key-hash constraint.

## Customer app activation
Before building a production customer release:
1. Copy the activation service's `public-key.pem` into `customer-app/activation-public-key.pem`.
2. Verify the public key fingerprint through a trusted channel.
3. Build and distribute the customer installer.
4. Customer enters the HTTPS activation URL and 10-digit key once. The app verifies the Ed25519 token and encrypts it using Windows secure storage. Later app starts check the signed expiry offline.

No PC ID is used. This means the local activation token and app data can be copied to another PC; this is the explicit trade-off for not binding keys to a device. Offline expiry checks can be affected by local clock tampering.

## Customer app features and boundaries
- Create/edit/delete listing drafts with title, description, price, category, condition, availability, location, tags, delivery and image file references.
- Copy prepared listing text for manual use.
- Separate persistent browser session per account profile; Facebook login is performed manually inside the profile.
- Manual task queue and local activity log.
- Cookie JSON archive import encrypted with Windows secure storage. It is an archive only; cookies are not injected into browser sessions.
- JSON backup/restore for drafts, account labels and task history. Activation token and cookie vault are intentionally excluded from portable backup.

**Facebook automation is not implemented.** The customer app does not automatically publish, relist, renew or delete Facebook Marketplace listings. It does not bypass CAPTCHA, 2FA, login controls or platform anti-abuse protections. The current workflow keeps the user in control and uses Facebook's own interface.

## Verification status
GitHub Actions workflows are configured to test activation-token verification and build both Windows installers on pull requests. A workflow configuration is not proof of a successful build: check the latest Actions run before distributing installers. Live activation deployment, service secrets, generated public-key pinning and real Facebook account QA are still operator tasks.
