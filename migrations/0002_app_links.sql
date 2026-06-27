CREATE TABLE IF NOT EXISTS app_links (
  app_id      TEXT PRIMARY KEY,
  launch_url  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_links_updated_at ON app_links(updated_at);
