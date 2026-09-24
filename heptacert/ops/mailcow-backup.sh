#!/bin/sh

set -eu

mailcow_root="${MAILCOW_ROOT:-/srv/mailcow}"
backup_dir="${MAILCOW_BACKUP_DIR:-/mnt/HC_Volume_105029103/server-backups/mailcow}"
retention_days="${MAILCOW_BACKUP_RETENTION_DAYS:-7}"
helper="$mailcow_root/helper-scripts/backup_and_restore.sh"

case "$retention_days" in
  ''|*[!0-9]*)
    echo "MAILCOW_BACKUP_RETENTION_DAYS must be a non-negative integer" >&2
    exit 1
    ;;
esac

latest_backup() {
  find "$backup_dir" \
    -mindepth 1 \
    -maxdepth 1 \
    -type d \
    -name 'mailcow-*' \
    -print \
    | sort \
    | tail -n 1
}

check_backup() {
  latest="$(latest_backup)"
  if [ -z "$latest" ]; then
    echo "No Mailcow backup exists in $backup_dir" >&2
    exit 1
  fi

  if ! find "$latest" -maxdepth 0 -mmin -1500 -print | grep -q .; then
    echo "Latest Mailcow backup is older than 25 hours: $latest" >&2
    exit 1
  fi

  for required_file in \
    mailcow.conf \
    backup_vmail.tar.zst \
    backup_mariadb.tar.zst \
    backup_redis.tar.zst \
    backup_rspamd.tar.zst \
    backup_postfix.tar.zst \
    backup_crypt.tar.zst
  do
    if [ ! -s "$latest/$required_file" ]; then
      echo "Mailcow backup component is missing or empty: $latest/$required_file" >&2
      exit 1
    fi
  done

  echo "Latest Mailcow backup is recent and complete: $latest"
}

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

if [ "${1:-}" = "--check" ]; then
  check_backup
  exit 0
fi

if [ ! -x "$helper" ]; then
  echo "Mailcow backup helper is missing or not executable: $helper" >&2
  exit 1
fi

restore_permissions() {
  chmod 700 "$backup_dir"
}
trap restore_permissions EXIT HUP INT TERM

# Mailcow's helper requires the destination to pass its mode check while its
# temporary backup containers are running. Hide it from other users again as
# soon as the helper exits, including on failure.
chmod 755 "$backup_dir"
MAILCOW_BACKUP_LOCATION="$backup_dir" \
  "$helper" backup all --delete-days "$retention_days"
chmod 700 "$backup_dir"
trap - EXIT HUP INT TERM

check_backup
