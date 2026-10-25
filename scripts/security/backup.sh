#!/usr/bin/env bash
# Run only on a trusted, isolated runner. Secrets supplied by environment, never by Git.
set -euo pipefail
umask 077
: "${PGHOST:?}" "${PGUSER:?}" "${PGPASSWORD:?}" "${PGDATABASE:?}"
: "${AGE_RECIPIENT:?}" "${RCLONE_CONFIG_TEXT:?}"
export PGPORT="${PGPORT:-5432}" PGSSLMODE=verify-full
: "${PGSSLROOTCERT:?Provide the provider CA certificate file}"
for tool in pg_dump age rclone git python3; do command -v "$tool" >/dev/null; done
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export RCLONE_CONFIG="$work/rclone.conf"
printf '%s' "$RCLONE_CONFIG_TEXT" > "$RCLONE_CONFIG"
# vault must encrypt object names and contents; source must be the separate Supabase S3 endpoint.
rclone config dump | python3 -c 'import json,sys; c=json.load(sys.stdin); assert c["vault"]["type"]=="crypt"; assert c["source"]["type"]=="s3"'
stamp=$(date -u +%Y%m%dT%H%M%SZ)
# pg_dump fails if its version is too old; do not suppress failures.
pg_dump --no-owner --no-acl --format=custom --schema=public --schema=auth --schema=storage | age -r "$AGE_RECIPIENT" -o "$work/database.dump.age"
git bundle create "$work/site.bundle" --branches --tags
age -r "$AGE_RECIPIENT" -o "$work/site.bundle.age" "$work/site.bundle"
rclone copy "$work" "vault:$stamp/database-and-code" --include '*.age' --immutable --log-level ERROR
# Database backups alone do not contain Storage object bytes.
rclone copy source:property-media "vault:$stamp/property-media" --immutable --log-level ERROR
printf 'Backup completed: %s. Restoration must be tested separately.\n' "$stamp"
