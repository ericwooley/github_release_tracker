import { beforeAll, afterAll, describe, it, expect, beforeEach, vi } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import { initDb } from '../../lib/db'
import { GithubRepoCacheBuilder } from './githubRepoCacheBuilder'
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
  ]

  constructor(public readonly mockName: string = 'default') {}

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

afterAll(async () => {
  await client.end()
  await container.stop()
})

describe('GithubRepoCacheBuilder', () => {
  const repoUrl = 'https://github.com/testowner/testrepo'

  describe('build', () => {
    it('should return the source of truth query when no caching is enabled', () => {
      const mockQuery = new MockGithubRepoQuery('source-of-truth')

      const builder = new GithubRepoCacheBuilder(repoUrl, client).withSourceOfTruth(mockQuery)

      const result = builder.build()

      // Should be the exact mock we provided
      expect(result).toBe(mockQuery)
    })

    it('should create a working write cache when enabled', async () => {
      const mockQuery = new MockGithubRepoQuery('source-of-truth')

      const builder = new GithubRepoCacheBuilder(repoUrl, client).withSourceOfTruth(mockQuery).withWriteCache()

      const result = builder.build()

      // Get repo should write to database
      const repo = await result.getRepo()
      expect(repo.owner).toBe('testowner')
      expect(repo.repo).toBe('testrepo')

      // Verify it was written to database
      const dbResult = await client.query('SELECT * FROM repos WHERE github_id = $1', [12345])
      expect(dbResult.rows.length).toBe(1)
    })

    it('should create a functioning read cache when enabled', async () => {
      // First add a repo to the database
      await client.query('INSERT INTO repos(github_id, owner, repo_name) VALUES($1, $2, $3) ON CONFLICT DO NOTHING', [
        12345,
        'testowner',
        'testrepo',
      ])

      const mockSourceOfTruth = new MockGithubRepoQuery()

      const builder = new GithubRepoCacheBuilder(repoUrl, client).withSourceOfTruth(mockSourceOfTruth).withReadCache()

      const result = builder.build()

      // Should be able to get repo
      const repo = await result.getRepo()
      expect(repo.owner).toBe('testowner')
      expect(repo.repo).toBe('testrepo')
    })

    it('should properly stack read and write cache when both are enabled', async () => {
      // First clear any existing data
      await client.query('DELETE FROM repos WHERE github_id = $1', [12345])

      const mockQuery = new MockGithubRepoQuery()
      const spyGetRepo = vi.spyOn(mockQuery, 'getRepo')

      const builder = new GithubRepoCacheBuilder(repoUrl, client)
        .withSourceOfTruth(mockQuery)
        .withWriteCache()
        .withReadCache()

      const result = builder.build()

      // First call should write to DB
      const firstRepo = await result.getRepo()
      expect(firstRepo.owner).toBe('testowner')
      expect(spyGetRepo).toHaveBeenCalledTimes(1)

      // Reset the spy
      spyGetRepo.mockClear()

      // Second call should read from DB and not call the source of truth
      const secondRepo = await result.getRepo()
      expect(secondRepo.owner).toBe('testowner')
      expect(spyGetRepo).not.toHaveBeenCalled()
    })

    it('should respect disabled flags when set to false', async () => {
      // Clear any existing data
      await client.query('DELETE FROM repos WHERE github_id = $1', [12345])

      const mockQuery = new MockGithubRepoQuery()

      // First enable both caches
      const builder = new GithubRepoCacheBuilder(repoUrl, client)
        .withSourceOfTruth(mockQuery)
        .withWriteCache(true)
        .withReadCache(true)

      // Then disable read cache
      builder.withReadCache(false)
      const result = builder.build()

      // Should still write to DB (write cache is still enabled)
      await result.getRepo()
      const dbCheck = await client.query('SELECT * FROM repos WHERE github_id = $1', [12345])
      expect(dbCheck.rows.length).toBe(1)

      // Now disable write cache too
      await client.query('DELETE FROM repos WHERE github_id = $1', [12345])
      const noCacheResult = builder.withWriteCache(false).build()

      // Should not write to DB anymore
      await noCacheResult.getRepo()
      const finalCheck = await client.query('SELECT * FROM repos WHERE github_id = $1', [12345])
      expect(finalCheck.rows.length).toBe(0)
    })
  })
})
