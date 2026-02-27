ALTER TABLE events
  ADD COLUMN IF NOT EXISTS cert_seq INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'cert_status_enum' AND e.enumlabel = 'expired'
  ) THEN
    ALTER TYPE cert_status_enum ADD VALUE 'expired';
  END IF;
END $$;

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS public_id TEXT,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS hosting_term TEXT NOT NULL DEFAULT 'yearly',
  ADD COLUMN IF NOT EXISTS hosting_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS asset_size_bytes BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cert_event_public_id
  ON certificates(event_id, public_id)
  WHERE deleted_at IS NULL;