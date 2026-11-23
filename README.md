# Marketplace Bot Admin — Offline Edition

This is the source project for a Windows desktop admin tool. It is not yet a prebuilt Windows installer: the current build environment is Linux and could not download the Electron build dependencies. Build the Windows installer on a Windows PC using `BUILD-WINDOWS.bat`.

## Included
- First-run admin account setup (password hashed with scrypt)
- Local-only customer and license records
- Signed Ed25519 license files tied to a customer-supplied device ID
- 7/30/90/180/365-day subscription durations
- Renewals, local revocation records, search/filter
- Backup and restore
- Private signing key encrypted with Windows secure storage (DPAPI via Electron safeStorage)
- Public-key export for embedding in the customer application
- No cloud, hosted API, or recurring server bill

## Build the Windows installer
1. On Windows 10/11, install Node.js LTS.
2. Extract this project ZIP.
3. Double-click `BUILD-WINDOWS.bat`.
4. When it finishes, find the installer in `desktop\\release`.

The first build needs internet access to download Electron and packaging dependencies. After building, the installed admin application itself runs offline.

## Offline license workflow
1. Customer opens the customer bot and copies their Device ID.
2. Admin creates a license with customer name, Device ID and duration.
3. Admin exports the `.mblicense` file and sends it to the customer.
4. The customer app must embed the matching public key and verify the Ed25519 signature, product, device ID and expiry locally.
5. Renewal creates a newly signed license file that the customer imports.

## Offline limitations
- No remote revocation: an exported offline license remains usable until expiry unless the customer app receives a replacement/deny-list update.
- No automatic remote renewal; the renewed signed file must be delivered manually.
- Customer clock changes can affect expiry checks while fully offline. Strong time anti-tampering requires periodic online checks or trusted hardware/time.
- Keep your admin PC and Windows user account secure. The private signing key is encrypted using Windows secure storage. A backup restored under a different Windows user/device may not be able to decrypt that key; preserve the original PC/user profile or use a controlled key migration procedure.
- This admin tool does not automate Facebook publishing and does not collect Facebook passwords or cookies.


## 10-digit key batch generator
- Admin can generate batches of 10 unique 10-digit numeric keys for 30, 90, 180 or 365 days.
- Keys are stored in the existing local database; existing customer, legacy license and signing records are preserved.
- Keys can be copied or exported as JSON.
- **Not yet implemented:** global one-time redemption, first online activation, server-side expiry tracking, redemption synchronization, and customer-app signed-token verification. Until an activation service is connected, these are local key records only and must not be advertised as globally protected one-time licenses.
