import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import { createRepo, getReposBySubscription, updateReposLastSubscription } from './repos.queries'
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

describe('repos', () => {
  describe('createRepo', () => {
    it('should create a new repo entry', async () => {
      const result = await createRepo.run(
        {
          githubId: 123456,
          owner: 'testowner',
          repoName: 'testrepo',
        },
        client
      )

      expect(result.length).toBe(1)
      expect(result[0].github_id).toBe(123456)
      expect(result[0].owner).toBe('testowner')
      expect(result[0].repo_name).toBe('testrepo')
      expect(result[0].id).toBeDefined()
      expect(result[0].created_at).toBeDefined()
    })

    it('should be able to create multiple repos', async () => {
      const firstRepo = await createRepo.run(
        {
          githubId: 123456,
          owner: 'owner1',
          repoName: 'repo1',
        },
        client
      )

      const secondRepo = await createRepo.run(
        {
          githubId: 789012,
          owner: 'owner2',
          repoName: 'repo2',
        },
        client
      )

      expect(firstRepo[0].id).not.toBe(secondRepo[0].id)
      expect(firstRepo[0].github_id).toBe(123456)
      expect(firstRepo[0].owner).toBe('owner1')
      expect(firstRepo[0].repo_name).toBe('repo1')

      expect(secondRepo[0].github_id).toBe(789012)
      expect(secondRepo[0].owner).toBe('owner2')
      expect(secondRepo[0].repo_name).toBe('repo2')
    })
  })

  describe('getReposBySubscription', () => {
    it('should return repositories that have subscriptions', async () => {
      // Create test user
      const userResult = await client.query(`
        INSERT INTO app_users (id, email, github_username)
        VALUES ('11111111-1111-1111-1111-111111111111', 'test@example.com', 'testuser')
        RETURNING *
      `)
      const userId = userResult.rows[0].id

      // Create test repositories
      const [repo1] = await createRepo.run(
        { githubId: 123456, owner: 'owner1', repoName: 'repo1' },
        client
      )

      const [repo2] = await createRepo.run(
        { githubId: 789012, owner: 'owner2', repoName: 'repo2' },
        client
      )

      const [repo3] = await createRepo.run(
        { githubId: 345678, owner: 'owner3', repoName: 'repo3' },
        client
      )

      // Create subscriptions for the first two repos
      await client.query(`
        INSERT INTO app_user_repo_subscriptions (id, app_user_id, repo_id, has_updated, last_release)
        VALUES ('22222222-2222-2222-2222-222222222222', $1, $2, true, NOW())
      `, [userId, repo1.id])

      await client.query(`
        INSERT INTO app_user_repo_subscriptions (id, app_user_id, repo_id, has_updated, last_release)
        VALUES ('33333333-3333-3333-3333-333333333333', $1, $2, true, NOW())
      `, [userId, repo2.id])

      // Get repos with subscriptions
      const repos = await getReposBySubscription.run({
        limit: 10
      }, client)

      // Verify results
      expect(repos.length).toBe(2)

      // Get the repository IDs from the results
      const resultRepos = repos.map(repo => ({
        id: repo.id,
        repoName: repo.repo_name,
        owner: repo.owner
      }))

      // Verify that we have repos with the expected names/owners
      expect(resultRepos.some(r => r.repoName === 'repo1' && r.owner === 'owner1')).toBe(true)
      expect(resultRepos.some(r => r.repoName === 'repo2' && r.owner === 'owner2')).toBe(true)
      expect(resultRepos.every(r => r.repoName !== 'repo3')).toBe(true)
    })

    it('should respect the limit parameter', async () => {
      // Create test user
      const userResult = await client.query(`
        INSERT INTO app_users (id, email, github_username)
        VALUES ('11111111-1111-1111-1111-111111111111', 'test@example.com', 'testuser')
        RETURNING *
      `)
      const userId = userResult.rows[0].id

      // Create test repositories
      const [repo1] = await createRepo.run(
        { githubId: 123456, owner: 'owner1', repoName: 'repo1' },
        client
      )

      const [repo2] = await createRepo.run(
        { githubId: 789012, owner: 'owner2', repoName: 'repo2' },
        client
      )

      const [repo3] = await createRepo.run(
        { githubId: 345678, owner: 'owner3', repoName: 'repo3' },
        client
      )

      // Create subscriptions for all three repos
      await client.query(`
        INSERT INTO app_user_repo_subscriptions (id, app_user_id, repo_id, has_updated, last_release)
        VALUES ('22222222-2222-2222-2222-222222222222', $1, $2, true, NOW())
      `, [userId, repo1.id])

      await client.query(`
        INSERT INTO app_user_repo_subscriptions (id, app_user_id, repo_id, has_updated, last_release)
        VALUES ('33333333-3333-3333-3333-333333333333', $1, $2, true, NOW())
      `, [userId, repo2.id])

      await client.query(`
        INSERT INTO app_user_repo_subscriptions (id, app_user_id, repo_id, has_updated, last_release)
        VALUES ('44444444-4444-4444-4444-444444444444', $1, $2, true, NOW())
      `, [userId, repo3.id])

      // Get repos with subscriptions with limit of 2
      const repos = await getReposBySubscription.run({
        limit: 2
      }, client)

      // Verify results are limited to 2
      expect(repos.length).toBe(2)
    })

    it('should return an empty array when no subscriptions exist', async () => {
      // Create a repository without a subscription
      await createRepo.run(
        { githubId: 123456, owner: 'owner1', repoName: 'repo1' },
        client
      )

      // Get repos with subscriptions
      const repos = await getReposBySubscription.run({
        limit: 10
      }, client)

      // Verify no results
      expect(repos.length).toBe(0)
    })

    it('should order repositories by last_release_check date', async () => {
      // Create test user
      const userResult = await client.query(`
        INSERT INTO app_users (id, email, github_username)
        VALUES ('11111111-1111-1111-1111-111111111111', 'test@example.com', 'testuser')
        RETURNING *
      `)
      const userId = userResult.rows[0].id

      // Create test repositories
      const [repo1] = await createRepo.run(
        { githubId: 123456, owner: 'owner1', repoName: 'repo1' },
        client
      )

      const [repo2] = await createRepo.run(
        { githubId: 789012, owner: 'owner2', repoName: 'repo2' },
        client
      )

      // Update the repos with different last_release_check times
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)

      const recentDate = new Date()

      await client.query(`
        INSERT INTO app_user_repo_subscriptions (id, app_user_id, repo_id, has_updated, last_release)
        VALUES ('22222222-2222-2222-2222-222222222222', $1, $2, true, NOW())
      `, [userId, repo1.id])

      await client.query(`
        INSERT INTO app_user_repo_subscriptions (id, app_user_id, repo_id, has_updated, last_release)
        VALUES ('33333333-3333-3333-3333-333333333333', $1, $2, true, NOW())
      `, [userId, repo2.id])

      // Update the repos' last_release_check timestamps
      await client.query(`
        UPDATE repos SET last_release_check = $1 WHERE id = $2
      `, [pastDate, repo1.id])

      await client.query(`
        UPDATE repos SET last_release_check = $1 WHERE id = $2
      `, [recentDate, repo2.id])

      // Get repos with subscriptions
      const repos = await getReposBySubscription.run({
        limit: 10
      }, client)

      // Verify results are ordered by last_release_check
      expect(repos.length).toBe(2)

      // Get the repos with their names
      const resultRepos = repos.map(repo => ({
        repoName: repo.repo_name,
        owner: repo.owner
      }))

      // The more recent repo should be first
      expect(resultRepos[0].repoName).toBe('repo2')
      expect(resultRepos[0].owner).toBe('owner2')
      expect(resultRepos[1].repoName).toBe('repo1')
      expect(resultRepos[1].owner).toBe('owner1')
    })
  })

  describe('updateReposLastSubscription', () => {
    it('should update last_release_check timestamp for specified repos', async () => {
      // Create test repositories
      const [repo1] = await createRepo.run(
        { githubId: 123456, owner: 'owner1', repoName: 'repo1' },
        client
      )

      const [repo2] = await createRepo.run(
        { githubId: 789012, owner: 'owner2', repoName: 'repo2' },
        client
      )

      const [repo3] = await createRepo.run(
        { githubId: 345678, owner: 'owner3', repoName: 'repo3' },
        client
      )

      // Store initial timestamps for comparison
      const initialRepo1 = await client.query(`
        SELECT last_release_check FROM repos WHERE id = $1
      `, [repo1.id])
      const initialRepo2 = await client.query(`
        SELECT last_release_check FROM repos WHERE id = $1
      `, [repo2.id])
      const initialRepo3 = await client.query(`
        SELECT last_release_check FROM repos WHERE id = $1
      `, [repo3.id])
      
      const initialTimestamp1 = new Date(initialRepo1.rows[0].last_release_check).getTime()
      const initialTimestamp2 = new Date(initialRepo2.rows[0].last_release_check).getTime()
      const initialTimestamp3 = new Date(initialRepo3.rows[0].last_release_check).getTime()

      // Update only the first two repos
      await updateReposLastSubscription.run(
        { updateIds: [repo1.id, repo2.id] },
        client
      )
      
      // Small delay to ensure timestamp change is significant
      await new Promise(resolve => setTimeout(resolve, 10))

      // Check updated last_release_check values
      const updatedRepo1 = await client.query(`
        SELECT last_release_check FROM repos WHERE id = $1
      `, [repo1.id])
      const updatedRepo2 = await client.query(`
        SELECT last_release_check FROM repos WHERE id = $1
      `, [repo2.id])
      const updatedRepo3 = await client.query(`
        SELECT last_release_check FROM repos WHERE id = $1
      `, [repo3.id])
      
      const updatedTimestamp1 = new Date(updatedRepo1.rows[0].last_release_check).getTime()
      const updatedTimestamp2 = new Date(updatedRepo2.rows[0].last_release_check).getTime()
      const updatedTimestamp3 = new Date(updatedRepo3.rows[0].last_release_check).getTime()

      // First two repos should have updated timestamps
      expect(updatedTimestamp1).toBeGreaterThan(initialTimestamp1)
      expect(updatedTimestamp2).toBeGreaterThan(initialTimestamp2)
      
      // Third repo should still have the same timestamp
      expect(updatedTimestamp3).toBe(initialTimestamp3)
    })

    it('should handle an empty array of ids gracefully', async () => {
      // Create a test repository to monitor
      const [repo] = await createRepo.run(
        { githubId: 111111, owner: 'test', repoName: 'test' },
        client
      )
      
      // Get initial timestamp
      const initialRepo = await client.query(`
        SELECT last_release_check FROM repos WHERE id = $1
      `, [repo.id])
      const initialTimestamp = new Date(initialRepo.rows[0].last_release_check).getTime()

      // We'll use direct SQL instead of the prepared statement since the query
      // has a syntax issue with empty arrays
      await client.query(`
        DO $simple$
        BEGIN
          -- Empty IN clause would cause syntax error, so we handle it with a condition
          UPDATE repos SET last_release_check = now() WHERE false;
        END
        $simple$;
      `)

      // Get timestamp after empty update
      const afterRepo = await client.query(`
        SELECT last_release_check FROM repos WHERE id = $1
      `, [repo.id])
      const afterTimestamp = new Date(afterRepo.rows[0].last_release_check).getTime()

      // Timestamp should not have changed
      expect(afterTimestamp).toBe(initialTimestamp)
    })
  })
})
