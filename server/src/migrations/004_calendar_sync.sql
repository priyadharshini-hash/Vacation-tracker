-- Per-user secret token for the "Sync with your calendar" iCalendar feed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_calendar_token_idx ON users (calendar_token) WHERE calendar_token IS NOT NULL;
