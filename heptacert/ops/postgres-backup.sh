#!/bin/sh

set -eu

backup_dir=/backups
retention_days="${HEPTACERT_BACKUP_RETENTION_DAYS:-7}"

case "$retention_days" in
  ''|*[!0-9]*)
    echo "HEPTACERT_BACKUP_RETENTION_DAYS must be a non-negative integer" >&2
    exit 1
    ;;
esac

latest_backup() {
  find "$backup_dir" -maxdepth 1 -type f -name 'heptacert_auto_*.dump' -print \
    | sort \
    | tail -n 1
}

if [ "${1:-}" = "--check" ]; then
  latest="$(latest_backup)"
  if [ -z "$latest" ]; then
    echo "No automatic HeptaCert database backup exists" >&2
    exit 1
  fi

  if ! find "$latest" -mmin -1500 -print | grep -q .; then
    echo "Latest HeptaCert database backup is older than 25 hours: $latest" >&2
    exit 1
  fi

  pg_restore --list "$latest" >/dev/null
  exit 0
fi

: "${PGPASSWORD:?PGPASSWORD must be set}"
: "${POSTGRES_USER:?POSTGRES_USER must be set}"
: "${POSTGRES_DB:?POSTGRES_DB must be set}"

mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%d_%H%M%S)"
temporary="$backup_dir/.heptacert_auto_${timestamp}.dump.tmp"
final="$backup_dir/heptacert_auto_${timestamp}.dump"

cleanup() {
  rm -f "$temporary"
}
trap cleanup EXIT HUP INT TERM

pg_dump \
  --host=db \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=custom \
  --file="$temporary"

test -s "$temporary"
pg_restore --list "$temporary" >/dev/null
mv "$temporary" "$final"
trap - EXIT HUP INT TERM

find "$backup_dir" \
  -maxdepth 1 \
  -type f \
  -name 'heptacert_auto_*.dump' \
  -mtime "+$retention_days" \
  -delete

echo "Created and verified PostgreSQL backup: $final"
