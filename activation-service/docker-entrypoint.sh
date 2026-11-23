#!/bin/sh
set -eu
mkdir -p /data
chown -R node:node /data
cp /run/secrets/activation_private_key /tmp/activation-private-key.pem
cp /run/secrets/activation_public_key /tmp/activation-public-key.pem
chown node:node /tmp/activation-private-key.pem /tmp/activation-public-key.pem
chmod 600 /tmp/activation-private-key.pem
chmod 644 /tmp/activation-public-key.pem
export TOKEN_PRIVATE_KEY_FILE=/tmp/activation-private-key.pem
export TOKEN_PUBLIC_KEY_FILE=/tmp/activation-public-key.pem
exec su-exec node node server.mjs
