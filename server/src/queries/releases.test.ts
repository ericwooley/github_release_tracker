import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import { createReleases } from './releases.queries'
import { createRepo } from './repos.queries'
import { initDb } from '../lib/db'

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

describe('releases', () => {
  describe('createReleases', () => {
    it('should create a new github release entry and set inserted to true (xmax = 0)', async () => {
      // First create a repo entry
      const [{ id: repoId }] = await createRepo.run(
        { githubId: 123456, owner: 'testowner', repoName: 'testrepo' },
        client
      )

      const result = await createReleases.run(
        {
          releases: [
            {
              githubId: 123456,
              repoId,
              releaseCreatedAt: new Date('2023-01-01'),
              tagName: 'v1.0.0',
              name: 'Release 1.0.0',
              prerelease: false,
              body: 'Release description goes here',
              url: 'http://google.com',
            },
          ],
        },
        client
      )

      expect(result.length).toBe(1)
      expect(result[0].github_id).toBe(123456)
      expect(result[0].repo_id).toBe(repoId)
      expect(result[0].release_created_at).toEqual(new Date('2023-01-01'))
      expect(result[0].tag_name).toBe('v1.0.0')
      expect(result[0].name).toBe('Release 1.0.0')
      expect(result[0].prerelease).toBe(false)
      expect(result[0].id).toBeDefined()
      expect(result[0].body).toBeDefined()
      expect(result[0].url).toBeDefined()
      expect(result[0].inserted).toBe(true)
    })

    it('should update an existing github release entry and set inserted to false (xmax != 0)', async () => {
      // First create a repo entry
      const [{ id: repoId }] = await createRepo.run(
        {
          githubId: 123456,
          owner: 'testowner',
          repoName: 'testrepo',
        },
        client
      )

      // Create initial release
      const initialRelease = await createReleases.run(
        {
          releases: [
            {
              githubId: 123456,
              repoId,
              releaseCreatedAt: new Date('2023-01-01'),
              tagName: 'v1.0.0',
              name: 'Release 1.0.0',
              prerelease: false,
              body: 'Release description goes here',
              url: 'http://google.com',
            },
          ],
        },
        client
      )

      // Update the same release
      const updatedRelease = await createReleases.run(
        {
          releases: [
            {
              githubId: 123456,
              repoId,
              releaseCreatedAt: new Date('2023-01-02'),
              tagName: 'v1.0.1',
              name: 'Updated Release 1.0.1',
              prerelease: true,
              body: 'Release description goes here',
              url: 'http://google.com',
            },
          ],
        },
        client
      )

      expect(updatedRelease.length).toBe(1)
      expect(updatedRelease[0].github_id).toBe(123456)
      expect(updatedRelease[0].repo_id).toBe(repoId)
      expect(updatedRelease[0].release_created_at).toEqual(new Date('2023-01-02'))
      expect(updatedRelease[0].tag_name).toBe('v1.0.1')
      expect(updatedRelease[0].name).toBe('Updated Release 1.0.1')
      expect(updatedRelease[0].prerelease).toBe(true)
      expect(updatedRelease[0].id).toBe(initialRelease[0].id)
      expect(updatedRelease[0].inserted).toBe(false)
    })

    it('should handle multiple releases for the same repo with different ids', async () => {
      // First create a repo entry
      const [{ id: repoId }] = await createRepo.run(
        {
          githubId: 123456,
          owner: 'testowner',
          repoName: 'testrepo',
        },
        client
      )

      // Create first release
      const firstRelease = await createReleases.run(
        {
          releases: [
            {
              githubId: 123456,
              repoId,
              releaseCreatedAt: new Date('2023-01-01'),
              tagName: 'v1.0.0',
              name: 'Release 1.0.0',
              prerelease: false,
              body: 'Release description goes here',
              url: 'http://google.com',
            },
          ],
        },
        client
      )

      // Create second release (different github_id)
      const secondRelease = await createReleases.run(
        {
          releases: [
            {
              githubId: 789012,
              repoId,
              releaseCreatedAt: new Date('2023-01-15'),
              tagName: 'v1.1.0',
              name: 'Release 1.1.0',
              prerelease: false,
              body: 'Release description goes here',
              url: 'http://google.com',
            },
          ],
        },
        client
      )

      // Verify both releases exist and have different IDs
      expect(firstRelease[0].id).not.toBe(secondRelease[0].id)
      expect(firstRelease[0].github_id).toBe(123456)
      expect(secondRelease[0].github_id).toBe(789012)
      expect(firstRelease[0].tag_name).toBe('v1.0.0')
      expect(secondRelease[0].tag_name).toBe('v1.1.0')
    })
  })
})
