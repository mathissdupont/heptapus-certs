# Server operations

## HeptaCert PostgreSQL backups

The `db_backup` Compose service runs `postgres-backup.sh` every day at 03:00 UTC.
It stores verified custom-format dumps under `HEPTACERT_BACKUP_DIR` and keeps
automatic dumps for `HEPTACERT_BACKUP_RETENTION_DAYS` days.

Check the latest dump:

```sh
docker exec heptacert-db_backup-1 \
  sh /usr/local/bin/heptacert-postgres-backup --check
```

## Mailcow backups

`mailcow-backup.sh` invokes Mailcow's own backup helper, verifies all expected
components, restores the destination directory to mode `0700`, and defaults to
seven days of retention. The systemd unit and timer run it daily at 04:30 UTC
with up to ten minutes of randomized delay.

Install or refresh the timer on the production host:

```sh
ln -sfn /srv/heptapus-certs/heptacert/ops/systemd/heptacert-mailcow-backup.service \
  /etc/systemd/system/heptacert-mailcow-backup.service
ln -sfn /srv/heptapus-certs/heptacert/ops/systemd/heptacert-mailcow-backup.timer \
  /etc/systemd/system/heptacert-mailcow-backup.timer
systemctl daemon-reload
systemctl enable --now heptacert-mailcow-backup.timer
```

Check the latest Mailcow backup without creating a new one:

```sh
/srv/heptapus-certs/heptacert/ops/mailcow-backup.sh --check
```

These backups are on a separate Hetzner volume but remain in the same account
and location as the server. They do not replace an encrypted off-site copy.
