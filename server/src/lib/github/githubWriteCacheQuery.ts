import { Client, PoolClient } from 'pg'
import { IListReleaseOptions, IRepoQuery } from './github.types'
import { createReleases } from '../../queries/releases.queries'
import { createRepo } from '../../queries/repos.queries'
import { Queue } from 'bullmq'

export class GithubWriteCacheQuery implements IRepoQuery {
  constructor(
    private githubRepoQuery: IRepoQuery,
    private client: PoolClient | Client,
    private releaseQueue: Queue | null
  ) {}
  async getRepo() {
    const repo = await this.githubRepoQuery.getRepo()
    const result = await createRepo.run(
      {
        githubId: repo.githubId,
        owner: repo.owner,
        repoName: repo.repo,
      },
      this.client
    )
    if (!result.length) {
      throw new Error('Could not create repo')
    }
    const [{ repo_name, github_id, owner, id }] = result
    return {
      id,
      owner,
      repo: repo_name,
      githubId: github_id,
    }
  }
  async listReleases(options: IListReleaseOptions) {
    // Update repo as well when we grab the releases
    const repo = await this.getRepo()
    const result = await this.githubRepoQuery.listReleases(options)
    if (result.length) {
      const resultFromDb = await createReleases.run(
        {
          releases: result.map(
            ({
              id: githubId,
              url,
              createdAt,
              name,
              prerelease,
              tagName,
              body,
            }) => ({
              githubId,
              repoId: repo.id,
              releaseCreatedAt: createdAt,
              name,
              tagName,
              prerelease,
              url,
              body,
            })
          ),
        },
        this.client
      )
      if (this.releaseQueue) {
        let newReleases = resultFromDb.filter(({ inserted }) => inserted)
        if (newReleases.length) {
          for (let release of newReleases) {
            console.warn('Found new release', release)
            this.releaseQueue.add('notify-of-release', {
              release,
              receivedAt: new Date().toISOString(),
            })
          }
        } else {
          console.warn('No New Releases for ', repo.owner, repo.repo)
        }
      }
      return resultFromDb.map(
        ({
          release_created_at,
          github_id,
          id,
          name,
          tag_name,
          prerelease,
          body,
          url,
        }) => ({
          databaseId: id,
          createdAt: release_created_at.toISOString(),
          id: github_id,
          name,
          tagName: tag_name,
          prerelease,
          body,
          url,
        })
      )
    }
    return []
  }
}
