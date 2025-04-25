/* @name userFollowsRepository */
INSERT INTO app_user_repo_subscriptions (
  app_user_id,
  repo_id
  ) VALUES (
    :appUserId!,
    :repoId!
  )
ON CONFLICT (app_user_id, repo_id) DO NOTHING
RETURNING *;

/* @name userUnfollowsRepository */
DELETE FROM app_user_repo_subscriptions
WHERE id = (
  SELECT id
  FROM app_user_repo_subscriptions
  WHERE app_user_id = :appUserId! AND repo_id = :repoId!
  LIMIT 1
)
RETURNING *;
