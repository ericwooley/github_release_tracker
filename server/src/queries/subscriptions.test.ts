import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import { createReleases } from './releases.queries'
import { createRepo } from './repos.queries'
import { getUsersSubscribedToRelease } from './subscriptions.queries'
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
  await client.query('DELETE FROM app_user_repo_subscriptions')
  await client.query('DELETE FROM github_releases')
  await client.query('DELETE FROM app_users')
  await client.query('DELETE FROM repos')
})

afterAll(async () => {
  await client.end()
  await container.stop()
})

describe('subscriptions', () => {
  describe('getUsersSubscribedToRelease', () => {
    it('should find users subscribed to a specific release', async () => {
      // Create a test user
      const userResult = await client.query(`
        INSERT INTO app_users (id, email, github_username)
        VALUES ('11111111-1111-1111-1111-111111111111', 'test@example.com', 'testuser')
        RETURNING *
      `)
      const userId = userResult.rows[0].id

      // Create a test repository
      const [{ id: repoId }] = await createRepo.run(
        { githubId: 123456, owner: 'testowner', repoName: 'testrepo' },
        client
      )

      // Create a test release
      const [{ id: releaseId }] = await createReleases.run(
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
              url: 'http://example.com/release',
            },
          ],
        },
        client
      )

      // Create a subscription for the user to the repository
      await client.query(`
        INSERT INTO app_user_repo_subscriptions (id, app_user_id, repo_id, has_updated, last_release)
        VALUES ('22222222-2222-2222-2222-222222222222', $1, $2, true, NOW())
      `, [userId, repoId])

      // Test the getUsersSubscribedToRelease query
      const subscribers = await getUsersSubscribedToRelease.run(
        { releaseId },
        client
      )

      // Verify the results
      expect(subscribers.length).toBe(1)
      expect(subscribers[0].user_id).toBe(userId)
      expect(subscribers[0].email).toBe('test@example.com')
      expect(subscribers[0].owner).toBe('testowner')
      expect(subscribers[0].repo_name).toBe('testrepo')
      expect(subscribers[0].release_id).toBe(releaseId)
      expect(subscribers[0].release_name).toBe('Release 1.0.0')
      expect(subscribers[0].tag_name).toBe('v1.0.0')
      expect(subscribers[0].url).toBe('http://example.com/release')
    })

    it('should not return users without email addresses', async () => {
      // Create a test user without email
      const userResult = await client.query(`
        INSERT INTO app_users (id, github_username)
        VALUES ('11111111-1111-1111-1111-111111111111', 'testuser')
        RETURNING *
      `)
      const userId = userResult.rows[0].id

      // Create a test repository
      const [{ id: repoId }] = await createRepo.run(
        { githubId: 123456, owner: 'testowner', repoName: 'testrepo' },
        client
      )

      // Create a test release
      const [{ id: releaseId }] = await createReleases.run(
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
              url: 'http://example.com/release',
            },
          ],
        },
        client
      )

      // Create a subscription for the user to the repository
      await client.query(`
        INSERT INTO app_user_repo_subscriptions (id, app_user_id, repo_id, has_updated, last_release)
        VALUES ('22222222-2222-2222-2222-222222222222', $1, $2, true, NOW())
      `, [userId, repoId])

      // Test the getUsersSubscribedToRelease query
      const subscribers = await getUsersSubscribedToRelease.run(
        { releaseId },
        client
      )

      // Verify no results are returned (user has no email)
      expect(subscribers.length).toBe(0)
    })

    it('should return multiple subscribed users for the same release', async () => {
      // Create test users
      const user1Result = await client.query(`
        INSERT INTO app_users (id, email, github_username)
        VALUES ('11111111-1111-1111-1111-111111111111', 'user1@example.com', 'user1')
        RETURNING *
      `)
      const user1Id = user1Result.rows[0].id

      const user2Result = await client.query(`
        INSERT INTO app_users (id, email, github_username)
        VALUES ('22222222-2222-2222-2222-222222222222', 'user2@example.com', 'user2')
        RETURNING *
      `)
      const user2Id = user2Result.rows[0].id

      // Create a test repository
      const [{ id: repoId }] = await createRepo.run(
        { githubId: 123456, owner: 'testowner', repoName: 'testrepo' },
        client
      )

      // Create a test release
      const [{ id: releaseId }] = await createReleases.run(
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
              url: 'http://example.com/release',
            },
          ],
        },
        client
      )

      // Create subscriptions for both users to the repository
      await client.query(`
        INSERT INTO app_user_repo_subscriptions (id, app_user_id, repo_id, has_updated, last_release)
        VALUES ('33333333-3333-3333-3333-333333333333', $1, $2, true, NOW())
      `, [user1Id, repoId])

      await client.query(`
        INSERT INTO app_user_repo_subscriptions (id, app_user_id, repo_id, has_updated, last_release)
        VALUES ('44444444-4444-4444-4444-444444444444', $1, $2, true, NOW())
      `, [user2Id, repoId])

      // Test the getUsersSubscribedToRelease query
      const subscribers = await getUsersSubscribedToRelease.run(
        { releaseId },
        client
      )

      // Verify both users are returned
      expect(subscribers.length).toBe(2)
      
      // Check if both users are in the results
      const emails = subscribers.map(sub => sub.email)
      expect(emails).toContain('user1@example.com')
      expect(emails).toContain('user2@example.com')
    })
  })
})
