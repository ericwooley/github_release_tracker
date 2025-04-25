/* @name createRepo */
INSERT INTO repos (
  github_id,
  owner,
  repo_name
  ) VALUES (
    :githubId!,
    :owner!,
    :repoName!
  )
  ON CONFLICT (github_id) DO UPDATE
    SET repo_name = repos.repo_name
RETURNING *;


/* @name getRepoByOwnerName */
SELECT * FROM repos WHERE repos.repo_name = :name AND repos.owner = :owner;

/* @name getRepoById */
SELECT * FROM repos WHERE id = :id!;

/* @name getReposBySubscription */
SELECT r.* FROM repos r
JOIN app_user_repo_subscriptions a ON a.repo_id = r.id
ORDER BY r.last_release_check DESC
LIMIT :limit!;

/*
@name updateReposLastSubscription
@param updateIds -> (...)
*/
UPDATE repos SET last_release_check = now() WHERE id in :updateIds!;
