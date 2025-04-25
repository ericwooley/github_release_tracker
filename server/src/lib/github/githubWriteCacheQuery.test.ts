import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import { initDb } from '../../lib/db'
import { GithubWriteCacheQuery } from './githubWriteCacheQuery'
import {
  IListReleaseOptions,
  IRelease,
  IRepo,
  IRepoQuery,
} from './github.types'

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
      return this.releases.filter(release => !release.prerelease)
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

describe('GithubWriteCacheQuery', () => {
  describe('getRepo', () => {
    it('should get repo info from the wrapped query and write to database', async () => {
      const mockGithubRepoQuery = new MockGithubRepoQuery()
      const githubWriteCacheQuery = new GithubWriteCacheQuery(
        mockGithubRepoQuery,
        client
      )
      const result = await githubWriteCacheQuery.getRepo()

      expect(result.owner).toBe('testowner')
      expect(result.repo).toBe('testrepo')
      expect(result.githubId).toBe(12345)
      expect(result.id).toBeDefined()

      const dbResult = await client.query(
        'SELECT * FROM repos WHERE github_id = $1',
        [12345]
      )
      expect(dbResult.rows.length).toBe(1)
      expect(dbResult.rows[0].owner).toBe('testowner')
      expect(dbResult.rows[0].repo_name).toBe('testrepo')
      expect(dbResult.rows[0].github_id).toBe(12345)
    })

    it('should return the same id that was written to the database', async () => {
      const mockGithubRepoQuery = new MockGithubRepoQuery()
      const githubWriteCacheQuery = new GithubWriteCacheQuery(
        mockGithubRepoQuery,
        client
      )

      const result = await githubWriteCacheQuery.getRepo()

      // Query the database directly to compare IDs
      const dbResult = await client.query(
        'SELECT * FROM repos WHERE github_id = $1',
        [12345]
      )

      expect(result.id).toBe(dbResult.rows[0].id)
    })
  })

  describe('listReleases', () => {
    it('should store releases in the database and return them in the correct format', async () => {
      const mockGithubRepoQuery = new MockGithubRepoQuery()
      const githubWriteCacheQuery = new GithubWriteCacheQuery(
        mockGithubRepoQuery,
        client
      )

      const result = await githubWriteCacheQuery.listReleases({
        includePrereleases: true,
      })

      // Verify we got both releases back
      expect(result.length).toBe(2)

      // Check first release
      expect(result[0].id).toBe(100)
      expect(result[0].name).toBe('Release 1.0.0')
      expect(result[0].tagName).toBe('v1.0.0')
      expect(result[0].prerelease).toBe(false)
      expect(result[0].body).toBe('First stable release')
      expect(result[0].url).toBe(
        'https://github.com/testowner/testrepo/releases/tag/v1.0.0'
      )
      expect(result[0].databaseId).toBeDefined()

      // Check database for releases
      const dbResults = await client.query('SELECT * FROM github_releases')
      expect(dbResults.rows.length).toBe(2)

      // Should match the order from our mock
      const firstDbRelease = dbResults.rows.find(r => r.github_id === 100)
      expect(firstDbRelease).toBeDefined()
      expect(firstDbRelease.tag_name).toBe('v1.0.0')
      expect(firstDbRelease.name).toBe('Release 1.0.0')
      expect(firstDbRelease.prerelease).toBe(false)
    })

    it('should filter prereleases when includePrereleases is false', async () => {
      const mockGithubRepoQuery = new MockGithubRepoQuery()
      const githubWriteCacheQuery = new GithubWriteCacheQuery(
        mockGithubRepoQuery,
        client,
        null
      )

      const result = await githubWriteCacheQuery.listReleases({
        includePrereleases: false,
      })

      // Should only include the stable release
      expect(result.length).toBe(1)
      expect(result[0].id).toBe(100)
      expect(result[0].name).toBe('Release 1.0.0')
      expect(result[0].prerelease).toBe(false)

      // Database should still contain both releases (filtering happens in the mock)
      const dbResults = await client.query('SELECT * FROM github_releases')
      expect(dbResults.rows.length).toBe(1)
    })

    it('should retrieve releases after storing them in the database', async () => {
      const mockGithubRepoQuery = new MockGithubRepoQuery()
      const githubWriteCacheQuery = new GithubWriteCacheQuery(
        mockGithubRepoQuery,
        client,
        null
      )

      // First call stores in database
      await githubWriteCacheQuery.listReleases({ includePrereleases: true })
      const reposFromDb = await client.query(`SELECT * FROM repos`)
      expect(reposFromDb.rowCount).toEqual(1)
      // Check that we can get releases from database
      const dbResults = await client.query('SELECT * FROM github_releases')

      const releaseIds = dbResults.rows.map(r => r.github_id)
      const databaseIds = dbResults.rows.map(({ id }) => id)
      expect(releaseIds).toContain(100)
      expect(releaseIds).toContain(101)

      // The database IDs should match the ones returned in the result
      const secondCallResult = await githubWriteCacheQuery.listReleases({
        includePrereleases: true,
      })

      const seecondDbResults = await client.query(
        'SELECT * FROM github_releases'
      )
      expect(seecondDbResults.rowCount).toEqual(2)
      expect(secondCallResult[0].databaseId).toBeDefined()

      // Find matched database rows
      const firstDbRelease = dbResults.rows.find(r => r.github_id === 100)
      expect(secondCallResult[0].databaseId).toBe(firstDbRelease.id)
    })
  })
})
