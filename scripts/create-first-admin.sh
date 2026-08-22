#!/usr/bin/env bash
# =============================================================================
# One-time helper: calls the app's /api/setup/bootstrap-admin route to create
# the family and the very first admin account. See README.md "Creating the
# first admin account" for full context.
#
# Usage:
#   APP_URL="https://riburaju.com" \
#   ADMIN_BOOTSTRAP_SECRET="the-value-from-your-.env" \
#   ./scripts/create-first-admin.sh
#
# You'll be prompted for the family name, currency, admin email, admin
# password, and admin display name. Nothing is echoed for the password.
# =============================================================================
set -euo pipefail

APP_URL="${APP_URL:-http://localhost:3000}"

if [ -z "${ADMIN_BOOTSTRAP_SECRET:-}" ]; then
  echo "ADMIN_BOOTSTRAP_SECRET is not set. Export it first (same value as in your .env)." >&2
  exit 1
fi

read -rp "Family name: " FAMILY_NAME
read -rp "Currency [AED]: " CURRENCY
CURRENCY="${CURRENCY:-AED}"
read -rp "Admin email: " ADMIN_EMAIL
read -rsp "Admin password: " ADMIN_PASSWORD
echo
read -rp "Admin display name: " ADMIN_NAME

curl -sS -X POST "${APP_URL%/}/api/setup/bootstrap-admin" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "secret": "${ADMIN_BOOTSTRAP_SECRET}",
  "familyName": "${FAMILY_NAME}",
  "currency": "${CURRENCY}",
  "adminEmail": "${ADMIN_EMAIL}",
  "adminPassword": "${ADMIN_PASSWORD}",
  "adminName": "${ADMIN_NAME}"
}
JSON

echo
echo "Done. Now remove or rotate ADMIN_BOOTSTRAP_SECRET in your deployment's environment variables."
