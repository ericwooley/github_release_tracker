/*
  @name createReleases
  @param releases -> ((
      githubId!,
      repoId!,
      releaseCreatedAt!,
      tagName!,
      name!,
      prerelease!,
      url!,
      body!
    )...)
*/

INSERT INTO github_releases (
    github_id,
    repo_id,
    release_created_at,
    tag_name,
    name,
    prerelease,
    url,
    body
  ) VALUES :releases
ON CONFLICT (github_id, repo_id) DO UPDATE
  SET
    release_created_at = EXCLUDED.release_created_at,
    tag_name = EXCLUDED.tag_name,
    name = EXCLUDED.name,
    prerelease = EXCLUDED.prerelease
  RETURNING
      (xmax = 0) AS inserted,   -- true = INSERT, false = UPDATE
      *;

/* @name getReleases */
select * from github_releases WHERE repo_id = :repo_id! AND  prerelease = :prerelease!;
