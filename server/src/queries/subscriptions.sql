/* @name getSubscriptions */
SELECT a.id, r.owner, r.repo_name, a.has_updated FROM app_user_repo_subscriptions a
JOIN repos r ON r.id =  a.repo_id
WHERE app_user_id = :userId!
ORDER BY  a.has_updated DESC, a.last_release ASC;

/* @name markSubscriptionViewed */
UPDATE app_user_repo_subscriptions SET has_updated = false WHERE repo_id = :repo_id! AND app_user_id = :app_user_id!;

/* @name getUsersSubscribedToRelease */
SELECT 
  u.id AS user_id,
  u.email,
  r.owner,
  r.repo_name,
  gr.id AS release_id,
  gr.name AS release_name,
  gr.tag_name,
  gr.url
FROM github_releases gr
JOIN repos r ON gr.repo_id = r.id
JOIN app_user_repo_subscriptions subs ON subs.repo_id = r.id
JOIN app_users u ON subs.app_user_id = u.id
WHERE gr.id = :releaseId!
AND u.email IS NOT NULL;
