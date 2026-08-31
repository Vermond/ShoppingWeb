ALTER TABLE auth.refresh_tokens
  ADD COLUMN IF NOT EXISTS session_id uuid;

UPDATE auth.refresh_tokens
SET session_id = id
WHERE session_id IS NULL;

ALTER TABLE auth.refresh_tokens
  ALTER COLUMN session_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id
ON auth.refresh_tokens (session_id);
