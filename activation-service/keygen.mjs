import crypto from 'node:crypto';
import fs from 'node:fs';
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
fs.writeFileSync('./private-key.pem',privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600,flag:'wx'});
fs.writeFileSync('./public-key.pem',publicKey.export({type:'spki',format:'pem'}),{mode:0o644,flag:'wx'});
console.log('Ed25519 signing keys created. Back up private-key.pem securely; never commit it.');
