/* @name findOrCreateUser */
INSERT INTO app_users (github_username, access_key, github_displayname, github_avatar, email) VALUES (
  :github_username!, :access_key!, :github_displayname!, :github_avatar!, :email!
) ON CONFLICT (github_username) DO UPDATE
SET
  access_key = EXCLUDED.access_key,
  github_displayname = EXCLUDED.github_displayname,
  github_avatar = EXCLUDED.github_avatar,
  email = EXCLUDED.email
RETURNING id, github_username, access_key, github_displayname, github_avatar;
/* @name getUserById */
select * from app_users where id = :id!;
