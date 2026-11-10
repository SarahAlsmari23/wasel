#!/usr/bin/env bash
# =============================================================================
# Wasel launch cleanup — BACKUP (read-only against the source database)
# =============================================================================
# Takes a complete logical backup (schema + data for public, auth and
# storage) with pg_dump, in PostgreSQL's custom format, and verifies it can be
# read back. Uses the official postgres:17 Docker image, so nothing needs to be
# installed locally.
#
#   WASEL_DB_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres' \
#     ./supabase/maintenance/launch-cleanup/backup.sh [output-dir]
#
# Use the *session* connection string (port 5432) from Supabase → Project
# Settings → Database. The URL contains the database password: pass it only
# through the environment, never commit it, and keep the backup files out of
# git (backups/ is git-ignored).
#
# The script never writes to the source database.
# =============================================================================
set -euo pipefail

: "${WASEL_DB_URL:?Set WASEL_DB_URL to the database connection string}"
OUT_DIR="${1:-backups/$(date -u +%Y%m%dT%H%M%SZ)}"
IMAGE="${PG_IMAGE:-postgres:17-alpine}"
mkdir -p "$OUT_DIR"
OUT_ABS="$(cd "$OUT_DIR" && pwd)"

echo "→ Dumping public, auth and storage schemas (schema + data)…"
docker run --rm --network host -e PGURL="$WASEL_DB_URL" -v "$OUT_ABS:/out" "$IMAGE" \
  sh -c 'pg_dump "$PGURL" --format=custom --no-owner --no-privileges \
           --schema=public --schema=auth --schema=storage \
           --file=/out/wasel-full.dump'

echo "→ Verifying the archive is complete and readable…"
docker run --rm -v "$OUT_ABS:/out" "$IMAGE" \
  sh -c 'pg_restore --list /out/wasel-full.dump > /out/wasel-full.toc'

for table in profiles conversations messages complaints complaint_versions \
             collected_information knowledge_documents government_entities; do
  if ! grep -q "TABLE DATA public $table " "$OUT_ABS/wasel-full.toc"; then
    echo "✗ Backup is missing data for public.$table" >&2
    exit 1
  fi
done
grep -q "TABLE DATA auth users " "$OUT_ABS/wasel-full.toc" || { echo "✗ Backup is missing auth.users" >&2; exit 1; }

( cd "$OUT_ABS" && shasum -a 256 wasel-full.dump > wasel-full.dump.sha256 )
echo "✓ Backup written: $OUT_ABS/wasel-full.dump ($(du -h "$OUT_ABS/wasel-full.dump" | cut -f1))"
echo "  Checksum: $(cut -d' ' -f1 "$OUT_ABS/wasel-full.dump.sha256")"
