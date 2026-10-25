-- The owner (first account) can create invite codes from the app.
ALTER TABLE app_user ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
UPDATE app_user SET is_admin = true WHERE id = (SELECT min(id) FROM app_user);
