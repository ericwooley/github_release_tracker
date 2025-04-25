import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import { initDb } from '../../lib/db'
import { GithubCacheQuery } from './githubReadCacheQuery'
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

describe('GithubCacheQuery', () => {
  describe('getRepo', () => {
    it('should retrieve data from the database if it exists', async () => {
      const mockGithubRepoQuery = new MockGithubRepoQuery()

      // First, add a repo to the database using direct SQL
      await client.query(`
        INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated)
        VALUES (
          gen_random_uuid(),
          12345,
          'testowner',
          'testrepo',
          NOW(),
          NOW()
        )
      `)

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
    it('should retrieve releases from database if they exist and are not timed out', async () => {
      // Add a repo to the database
      const repoResult = await client.query(`
        INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated, last_release_check)
        VALUES (
          gen_random_uuid(),
          12345,
          'testowner',
          'testrepo',
          NOW(),
          NOW(),
          NOW()
        )
        RETURNING id
      `)
      const repoId = repoResult.rows[0].id

      // Add a release to the database
      await client.query(
        `
        INSERT INTO github_releases (
          id,
          repo_id,
          github_id,
          name,
          tag_name,
          prerelease,
          body,
          url,
          release_created_at,
          created_at,
          last_updated
        )
        VALUES (
          gen_random_uuid(),
          $1,
          100,
          'DB Release 1.0.0',
          'v1.0.0',
          false,
          'Database release',
          'https://github.com/testowner/testrepo/releases/tag/v1.0.0',
          '2023-01-01T00:00:00Z',
          NOW(),
          NOW()
        )
      `,
        [repoId]
      )

      const mockGithubRepoQuery = new MockGithubRepoQuery()
      const githubReadCacheQuery = new GithubCacheQuery(
        mockGithubRepoQuery,
        'https://github.com/testowner/testrepo',
        client
      )

      const result = await githubReadCacheQuery.listReleases({
        includePrereleases: false,
      })

      // Should return database results, not mock results
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('DB Release 1.0.0')
      expect(result[0].dbRepoId).toBe(repoId)
    })

    it('should fallback to wrapped query if no releases in database', async () => {
      // Add a repo but no releases
      await client.query(`
        INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated, last_release_check)
        VALUES (
          gen_random_uuid(),
          12345,
          'testowner',
          'testrepo',
          NOW(),
          NOW(),
          NOW()
        )
      `)

      const mockGithubRepoQuery = new MockGithubRepoQuery()
      const githubReadCacheQuery = new GithubCacheQuery(
        mockGithubRepoQuery,
        'https://github.com/testowner/testrepo',
        client
      )

      const result = await githubReadCacheQuery.listReleases({
        includePrereleases: false,
      })

      // Should fall back to mock results
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('Release 1.0.0') // This is from the mock, not DB
    })

    it('should fallback to wrapped query if cache is timed out', async () => {
      // Set a 1 second timeout
      const oneSecondTimeout = 1000

      // Create a past date (5 seconds ago)
      const pastDate = new Date()
      pastDate.setSeconds(pastDate.getSeconds() - 5)

      // Add a repo with an old last_release_check
      const repoResult = await client.query(
        `
        INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated, last_release_check)
        VALUES (
          gen_random_uuid(),
          12345,
          'testowner',
          'testrepo',
          NOW(),
          NOW(),
          $1
        )
        RETURNING id
      `,
        [pastDate]
      )
      const repoId = repoResult.rows[0].id

      // Add a release
      await client.query(
        `
        INSERT INTO github_releases (
          id,
          repo_id,
          github_id,
          name,
          tag_name,
          prerelease,
          body,
          url,
          release_created_at,
          created_at,
          last_updated
        )
        VALUES (
          gen_random_uuid(),
          $1,
          200,
          'Old Release',
          'v1.0.0',
          false,
          'Old release',
          'https://github.com/testowner/testrepo/releases/tag/v1.0.0',
          $2,
          NOW(),
          NOW()
        )
      `,
        [repoId, pastDate]
      )

      const mockGithubRepoQuery = new MockGithubRepoQuery()
      const githubReadCacheQuery = new GithubCacheQuery(
        mockGithubRepoQuery,
        'https://github.com/testowner/testrepo',
        client,
        oneSecondTimeout // 1 second timeout
      )

      const result = await githubReadCacheQuery.listReleases({
        includePrereleases: false,
      })

      // Should return mock data, not database data
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('Release 1.0.0') // From mock, not database
      expect(result[0].name).not.toBe('Old Release') // Making sure it's not from DB
    })

    it('should use cached data when within timeout period', async () => {
      // Set a long timeout
      const oneDayTimeout = 1000 * 60 * 60 * 24

      // Add a repo with a recent last_release_check
      const repoResult = await client.query(`
        INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated, last_release_check)
        VALUES (
          gen_random_uuid(),
          12345,
          'testowner',
          'testrepo',
          NOW(),
          NOW(),
          NOW()
        )
        RETURNING id
      `)
      const repoId = repoResult.rows[0].id

      // Add a release
      await client.query(
        `
        INSERT INTO github_releases (
          id,
          repo_id,
          github_id,
          name,
          tag_name,
          prerelease,
          body,
          url,
          release_created_at,
          created_at,
          last_updated
        )
        VALUES (
          gen_random_uuid(),
          $1,
          300,
          'Recent Release',
          'v2.0.0',
          false,
          'Recent release',
          'https://github.com/testowner/testrepo/releases/tag/v2.0.0',
          NOW(),
          NOW(),
          NOW()
        )
      `,
        [repoId]
      )

      const mockGithubRepoQuery = new MockGithubRepoQuery()
      const githubReadCacheQuery = new GithubCacheQuery(
        mockGithubRepoQuery,
        'https://github.com/testowner/testrepo',
        client,
        oneDayTimeout // 1 day timeout
      )

      const result = await githubReadCacheQuery.listReleases({
        includePrereleases: false,
      })

      // Should return database results since cache is within timeout
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('Recent Release') // From database
      expect(result[0].dbRepoId).toBe(repoId)
    })
  })
})
