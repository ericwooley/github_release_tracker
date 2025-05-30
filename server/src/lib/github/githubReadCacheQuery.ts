import { Client, PoolClient } from 'pg'
import { IListReleaseOptions, IRepoQuery } from './github.types'
import { getRepoByOwnerName } from './../../queries/repos.queries'
import { extractRepoFromUrl } from './githubUtils'
import { getReleases } from '../../queries/releases.queries'

export class GithubCacheQuery implements IRepoQuery {
  constructor(
    private githubRepoQuery: IRepoQuery,
    private repositoryUrl: string,
    private client: PoolClient | Client,
    private timeoutTime = 1000 * 60 * 60 * 24
  ) {}
  async getRepo() {
    const { owner, repo } = extractRepoFromUrl(this.repositoryUrl)
    const repoRows = await getRepoByOwnerName.run(
      {
        owner,
        name: repo,
      },
      this.client
    )
    if (repoRows.length === 0) {
      return this.githubRepoQuery.getRepo()
    }
    const [{ owner: dbOwner, repo_name, github_id, id, last_release_check }] =
      repoRows
    return {
      owner: dbOwner,
      repo: repo_name,
      githubId: github_id,
      id,
      lastReleaseCheck: last_release_check,
    }
  }
  async listReleases(options: IListReleaseOptions) {
    const repo = await this.getRepo()

    if (repo.id) {
      const isTimedOut =
        repo.lastReleaseCheck &&
        Date.now() - repo.lastReleaseCheck.getTime() > this.timeoutTime
      if (repo.lastReleaseCheck && isTimedOut) {
        return this.githubRepoQuery.listReleases(options)
      }
      const releases = await getReleases.run(
        {
          repo_id: repo.id,
          prerelease: options.includePrereleases ?? false,
        },
        this.client
      )
      if (releases.length) {
        return releases.map(r => ({
          body: r.body,
          createdAt: r.release_created_at.toISOString(),
          id: r.github_id,
          name: r.name,
          prerelease: r.prerelease,
          tagName: r.tag_name,
          url: r.url,
          dbId: r.id,
          dbRepoId: repo.id,
        }))
      }
    }
    return this.githubRepoQuery.listReleases(options)
  }
}
