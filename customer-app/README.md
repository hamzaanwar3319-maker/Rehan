# Marketplace Bot Customer Desktop App

## Build
Run `npm install` and `npm run build:win` from this directory on Windows, or use the **Windows desktop builds** GitHub Actions workflow.

## Offline licensing
1. In Marketplace Bot Admin, generate 10-digit keys and choose **Export offline key pack**.
2. Send the exported JSON pack to the customer securely, together with the customer's 10-digit key.
3. The customer imports the pack once on the activation screen, then logs in using only the 10-digit key.
4. The key is marked used on that local installation and the signed plan duration is stored using Windows secure storage.

The first imported pack establishes the trusted Admin public key for that customer installation. Only import a pack received from your own Admin. Offline mode cannot check whether the same key was used on a different disconnected PC, and local clock tampering or copying app data can defeat local-only restrictions. No device ID is collected or sent. There is no activation server, HTTPS activation endpoint, or internet requirement for licensing.

## Listing workflow
- Create, edit and delete listing drafts with title, description, price, category, condition, availability, location, tags, delivery and up to 10 local image paths.
- Open Facebook Marketplace in a separate persistent browser profile for each saved account.
- **Prepare & upload** attempts to fill title, price and description and upload selected photos using the current Facebook page controls.
- Facebook frequently changes its interface. Field detection and photo upload are best-effort and must be checked in the Facebook window.
- The user must review the listing and click Facebook's final **Publish** button. The app does not submit listings unattended, bypass login, CAPTCHA, 2FA or other security checks.
- Facebook itself uses HTTPS; only the app's licensing and activation have been made fully offline.

## Other features
- Separate persistent Chromium session for each Facebook profile; users sign in manually.
- Task queue, activity log, encrypted local cookie archive and local backup/restore.
- Facebook passwords are never requested or stored. Cookie archive import does not inject cookies into sessions.

## Release QA still required
- Test offline key-pack import, valid/invalid keys, expiry and same-install key reuse on a clean Windows 10/11 PC.
- Test manual Facebook sign-in and listing preparation with a test account; verify fields and uploaded photos before manually publishing.
- Test Windows DPAPI/safeStorage behavior.