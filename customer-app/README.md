# Marketplace Bot customer activation integration

This module is a reference activation client, not yet wired into the Electron customer UI or installer.

- First activation sends the 10-digit key to the activation service over HTTPS.
- The service atomically redeems a key once and returns an Ed25519-signed token.
- The customer app verifies the signature and expiry locally using a public key pinned in a trusted app release, then saves the token using the app's OS-protected secret storage.
- The customer app does not send a PC ID, Facebook password, or Facebook cookies.

Before production, replace the example service URL with your HTTPS deployment, pin the service public key in the application, and store the token with Windows DPAPI/safeStorage. Do not trust the public key returned by the same response in production; pin the expected key from a trusted release build. Offline expiry enforcement is subject to local clock tampering unless periodic online checks are required.
