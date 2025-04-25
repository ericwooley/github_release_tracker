/* @name updateRepoStats */
INSERT INTO github_releases (
      github_id,
      repo_id,
      release_created_at,
      tag_name,
      "name",
      prerelease,
      url,
      body
    ) VALUES (
      :github_id!,
      :repo_id!,
      :releaseCreatedAt!,
      :tagName!,
      :name!,
      :prerelease!,
      :url!,
      :body!
    )
ON CONFLICT (repo_id, github_id) DO UPDATE
  SET
    release_created_at = EXCLUDED.release_created_at,
    tag_name = EXCLUDED.tag_name,
    "name" = EXCLUDED."name",
    prerelease = EXCLUDED.prerelease,
    url = EXCLUDED.url,
    body = EXCLUDED.body
  RETURNING *;


