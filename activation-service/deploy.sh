#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Engine and Docker Compose first."
  exit 1
fi
if [ ! -f .env ]; then
  if ! command -v openssl >/dev/null 2>&1; then echo "OpenSSL is required to create an admin token."; exit 1; fi
  printf 'ADMIN_API_TOKEN=%s\n' "$(openssl rand -hex 32)" > .env
  chmod 600 .env
  echo "Created .env with a random Admin API token. Save it securely."
fi
if [ ! -f private-key.pem ] || [ ! -f public-key.pem ]; then
  if [ -f private-key.pem ] || [ -f public-key.pem ]; then
    echo "Only one signing key file exists. Restore the matching key pair; refusing to overwrite."
    exit 1
  fi
  docker run --rm -v "$PWD:/keys" -w /keys node:20-alpine node keygen.mjs
fi
mkdir -p data
if [ "$(id -u)" -eq 0 ]; then chown 1000:1000 data; fi
docker compose up -d --build
echo "Activation API container started. Configure HTTPS Nginx and DNS before public use."
