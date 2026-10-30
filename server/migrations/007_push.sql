-- Web Push for the rest timer: one row per phone/browser that allowed notifications, and the
-- server's VAPID key pair (generated on first use; losing it just means phones re-subscribe).
CREATE TABLE push_subscription (
  endpoint   text PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_subscription_user_idx ON push_subscription (user_id);

CREATE TABLE push_key (
  id          smallint PRIMARY KEY CHECK (id = 1),
  public_key  text NOT NULL,
  private_key text NOT NULL
);
