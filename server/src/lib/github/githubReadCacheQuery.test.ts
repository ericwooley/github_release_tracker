import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import { createRepo } from '../../queries/repos.queries'
import { initDb } from '../../lib/db'
import { GithubCacheQuery } from './githubReadCacheQuery'
import { IListReleaseOptions, IRelease, IRepo, IRepoQuery } from './github.types'

// Mock implementation of IRepoQuery for testing
class MockGithubRepoQuery implements IRepoQuery {
  private repo: IRepo = {
    owner: 'testowner',
    repo: 'testrepo',
    githubId: 12345,
  }

  private releases: IRelease[] = [
    {
      id: 100,
      name: 'Release 1.0.0',
      tagName: 'v1.0.0',
      prerelease: false,
      createdAt: '2023-01-01T00:00:00Z',
      body: 'First stable release',
      url: 'https://github.com/testowner/testrepo/releases/tag/v1.0.0',
    },
    {
      id: 101,
      name: 'Release 1.1.0-beta',
      tagName: 'v1.1.0-beta',
      prerelease: true,
      createdAt: '2023-01-15T00:00:00Z',
      body: 'Beta release with new features',
      url: 'https://github.com/testowner/testrepo/releases/tag/v1.1.0-beta',
    },
  ]

  async getRepo(): Promise<IRepo> {
    return this.repo
  }

  async listReleases(options: IListReleaseOptions): Promise<IRelease[]> {
    if (options.includePrereleases === false) {
      return this.releases.filter((release) => !release.prerelease)
    }
    return this.releases
  }
}

let containerDef = new PostgreSqlContainer('postgres:17')
let container: Awaited<ReturnType<typeof containerDef.start>>
let client: Client

beforeAll(async () => {
  container = await containerDef.start()
  client = new Client({
    host: container.getHost(),
    port: container.getPort(),
    user: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
  })
  await client.connect()
  await initDb(client)
})

beforeEach(async () => {
  // Clear the tables before each test
  await client.query('DELETE FROM github_releases')
  await client.query('DELETE FROM repos')
})

afterAll(async () => {
  await client.end()
  await container.stop()
})

describe('GithubCacheQuery', () => {
  describe('getRepo', () => {
    it('should retrieve data from the database if it exists', async () => {
      const mockGithubRepoQuery = new MockGithubRepoQuery()

      // First, add a repo to the database
      await createRepo.run(
        {
          githubId: 12345,
          owner: 'testowner',
          repoName: 'testrepo',
        },
        client
      )

      // Create a read cache query with a repository URL that matches the saved repo
      const githubReadCacheQuery = new GithubCacheQuery(
        mockGithubRepoQuery,
        'https://github.com/testowner/testrepo',
        client
      )

      const result = await githubReadCacheQuery.getRepo()

      expect(result.owner).toBe('testowner')
      expect(result.repo).toBe('testrepo')
      expect(result.githubId).toBe(12345)
      expect(result.id).toBeDefined()
    })

    it('should fallback to wrapped query if repo not in database', async () => {
      const mockGithubRepoQuery = new MockGithubRepoQuery()

      // Create a read cache query with a repository URL for which no data exists in DB
      const githubReadCacheQuery = new GithubCacheQuery(
        mockGithubRepoQuery,
        'https://github.com/testowner/testrepo',
        client
      )

      const result = await githubReadCacheQuery.getRepo()

      // The result should come from the mock
      expect(result.owner).toBe('testowner')
      expect(result.repo).toBe('testrepo')
      expect(result.githubId).toBe(12345)
      // No ID since it's not from the database
      expect(result.id).toBeUndefined()
    })
  })

  describe('listReleases', () => {
    it('should always delegate to the wrapped query', async () => {
      const mockGithubRepoQuery = new MockGithubRepoQuery()

      // Create a read cache query
      const githubReadCacheQuery = new GithubCacheQuery(
        mockGithubRepoQuery,
        'https://github.com/testowner/testrepo',
        client
      )

      // Should get all releases
      const result = await githubReadCacheQuery.listReleases({ includePrereleases: true })

      expect(result.length).toBe(2)
      expect(result[0].id).toBe(100)
      expect(result[0].name).toBe('Release 1.0.0')
      expect(result[1].id).toBe(101)
      expect(result[1].name).toBe('Release 1.1.0-beta')
    })

    it('should respect the includePrereleases option', async () => {
      const mockGithubRepoQuery = new MockGithubRepoQuery()

      // Create a read cache query
      const githubReadCacheQuery = new GithubCacheQuery(
        mockGithubRepoQuery,
        'https://github.com/testowner/testrepo',
        client
      )

      // Should filter out prereleases
      const result = await githubReadCacheQuery.listReleases({ includePrereleases: false })

      expect(result.length).toBe(1)
      expect(result[0].id).toBe(100)
      expect(result[0].name).toBe('Release 1.0.0')
      expect(result[0].prerelease).toBe(false)
    })
  })
})
