import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import { userFollowsRepository, userUnfollowsRepository } from './repositoryMutations.queries'
import { initDb } from '../../db'

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
  await client.query('DELETE FROM repos')
  await client.query('DELETE FROM app_users')
})

afterAll(async () => {
  await client.end()
  await container.stop()
})

describe('userFollowsRepository', () => {
  it('should allow a user to follow a repository', async () => {
    // Create a test user
    const userResult = await client.query(
      `
      INSERT INTO app_users (id, github_username, access_key, github_avatar, github_displayname)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
      [
        '550e8400-e29b-41d4-a716-446655440000', // test UUID
        'testuser',
        'test-key-123',
        'https://example.com/avatar.png',
        'Test User',
      ]
    )
    const userId = userResult.rows[0].id

    // Create a test repository
    const repoResult = await client.query(
      `
      INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [
        '660e8400-e29b-41d4-a716-446655440000', // test UUID
        12345,
        'testowner',
        'testrepo',
        new Date(),
        new Date(),
      ]
    )
    const repoId = repoResult.rows[0].id

    // Execute the follow repository mutation
    await userFollowsRepository.run(
      {
        appUserId: userId,
        repoId: repoId,
      },
      client
    )

    // Verify the subscription was created
    const subscriptionResult = await client.query(
      `
      SELECT * FROM app_user_repo_subscriptions
      WHERE app_user_id = $1 AND repo_id = $2
    `,
      [userId, repoId]
    )

    expect(subscriptionResult.rows.length).toBe(1)
    expect(subscriptionResult.rows[0].app_user_id).toBe(userId)
    expect(subscriptionResult.rows[0].repo_id).toBe(repoId)
  })

  it('should not create duplicate subscriptions for the same user and repo', async () => {
    // Create a test user
    const userResult = await client.query(
      `
      INSERT INTO app_users (id, github_username, access_key, github_avatar, github_displayname)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
      [
        '550e8400-e29b-41d4-a716-446655440000', // test UUID
        'testuser',
        'test-key-123',
        'https://example.com/avatar.png',
        'Test User',
      ]
    )
    const userId = userResult.rows[0].id

    // Create a test repository
    const repoResult = await client.query(
      `
      INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [
        '660e8400-e29b-41d4-a716-446655440000', // test UUID
        12345,
        'testowner',
        'testrepo',
        new Date(),
        new Date(),
      ]
    )
    const repoId = repoResult.rows[0].id

    // First, create the subscription directly
    await client.query(
      `
      INSERT INTO app_user_repo_subscriptions (app_user_id, repo_id)
      VALUES ($1, $2)
    `,
      [userId, repoId]
    )

    // Now try to follow the same repository using our mutation
    // This should either be a no-op or throw an error depending on the SQL implementation
    try {
      await userFollowsRepository.run(
        {
          appUserId: userId,
          repoId: repoId,
        },
        client
      )

      // If we get here without an error, let's verify only one subscription exists
      const subscriptionResult = await client.query(
        `
        SELECT * FROM app_user_repo_subscriptions
        WHERE app_user_id = $1 AND repo_id = $2
      `,
        [userId, repoId]
      )

      expect(subscriptionResult.rows.length).toBe(1)
    } catch (error: any) {
      // If it throws an error due to unique constraint, that's acceptable too
      expect(error.message).toContain('duplicate key value violates unique constraint')
    }
  })

  it('should throw an error when trying to follow a non-existent repository', async () => {
    // Create a test user
    const userResult = await client.query(
      `
      INSERT INTO app_users (id, github_username, access_key, github_avatar, github_displayname)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
      [
        '550e8400-e29b-41d4-a716-446655440000', // test UUID
        'testuser',
        'test-key-123',
        'https://example.com/avatar.png',
        'Test User',
      ]
    )
    const userId = userResult.rows[0].id

    // No repository is created, so this should fail
    await expect(
      userFollowsRepository.run(
        {
          appUserId: userId,
          repoId: 'non-existent-id', // Using a fake ID that doesn't exist
        },
        client
      )
    ).rejects.toThrow()
  })

  it('should allow a user to follow multiple repositories', async () => {
    // Create a test user
    const userResult = await client.query(
      `
      INSERT INTO app_users (id, github_username, access_key, github_avatar, github_displayname)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
      [
        '550e8400-e29b-41d4-a716-446655440000', // test UUID
        'testuser',
        'test-key-123',
        'https://example.com/avatar.png',
        'Test User',
      ]
    )
    const userId = userResult.rows[0].id

    // Create two test repositories
    const repo1Result = await client.query(
      `
      INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [
        '660e8400-e29b-41d4-a716-446655440000', // test UUID
        12345,
        'testowner',
        'testrepo1',
        new Date(),
        new Date(),
      ]
    )
    const repo1Id = repo1Result.rows[0].id

    const repo2Result = await client.query(
      `
      INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [
        '770e8400-e29b-41d4-a716-446655440000', // test UUID
        67890,
        'testowner',
        'testrepo2',
        new Date(),
        new Date(),
      ]
    )
    const repo2Id = repo2Result.rows[0].id

    // Follow both repositories
    await userFollowsRepository.run(
      {
        appUserId: userId,
        repoId: repo1Id,
      },
      client
    )

    await userFollowsRepository.run(
      {
        appUserId: userId,
        repoId: repo2Id,
      },
      client
    )

    // Verify both subscriptions were created
    const subscriptionResult = await client.query(
      `
      SELECT * FROM app_user_repo_subscriptions
      WHERE app_user_id = $1
      ORDER BY repo_id
    `,
      [userId]
    )

    expect(subscriptionResult.rows.length).toBe(2)
    expect(subscriptionResult.rows[0].repo_id).toBe(repo1Id)
    expect(subscriptionResult.rows[1].repo_id).toBe(repo2Id)
  })
})

describe('userUnfollowsRepository', () => {
  it('should allow a user to unfollow a repository', async () => {
    // Create a test user
    const userResult = await client.query(
      `
      INSERT INTO app_users (id, github_username, access_key, github_avatar, github_displayname)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
      [
        '550e8400-e29b-41d4-a716-446655440000', // test UUID
        'testuser',
        'test-key-123',
        'https://example.com/avatar.png',
        'Test User',
      ]
    )
    const userId = userResult.rows[0].id

    // Create a test repository
    const repoResult = await client.query(
      `
      INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [
        '660e8400-e29b-41d4-a716-446655440000', // test UUID
        12345,
        'testowner',
        'testrepo',
        new Date(),
        new Date(),
      ]
    )
    const repoId = repoResult.rows[0].id

    // First, create a subscription
    await client.query(
      `
      INSERT INTO app_user_repo_subscriptions (app_user_id, repo_id)
      VALUES ($1, $2)
    `,
      [userId, repoId]
    )

    // Verify the subscription was created
    let subscriptionResult = await client.query(
      `
      SELECT * FROM app_user_repo_subscriptions
      WHERE app_user_id = $1 AND repo_id = $2
    `,
      [userId, repoId]
    )
    expect(subscriptionResult.rows.length).toBe(1)

    // Now unfollow the repository
    await userUnfollowsRepository.run(
      {
        appUserId: userId,
        repoId: repoId,
      },
      client
    )

    // Verify the subscription was deleted
    subscriptionResult = await client.query(
      `
      SELECT * FROM app_user_repo_subscriptions
      WHERE app_user_id = $1 AND repo_id = $2
    `,
      [userId, repoId]
    )
    expect(subscriptionResult.rows.length).toBe(0)
  })

  it('should not throw an error when unfollowing a repository that is not followed', async () => {
    // Create a test user
    const userResult = await client.query(
      `
      INSERT INTO app_users (id, github_username, access_key, github_avatar, github_displayname)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
      [
        '550e8400-e29b-41d4-a716-446655440000', // test UUID
        'testuser',
        'test-key-123',
        'https://example.com/avatar.png',
        'Test User',
      ]
    )
    const userId = userResult.rows[0].id

    // Create a test repository
    const repoResult = await client.query(
      `
      INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [
        '660e8400-e29b-41d4-a716-446655440000', // test UUID
        12345,
        'testowner',
        'testrepo',
        new Date(),
        new Date(),
      ]
    )
    const repoId = repoResult.rows[0].id

    // Try to unfollow without having followed first
    const result = await userUnfollowsRepository.run(
      {
        appUserId: userId,
        repoId: repoId,
      },
      client
    )

    // Should return an empty result, not throw an error
    expect(result).toEqual([])
  })

  it('should allow a user to selectively unfollow repositories', async () => {
    // Create a test user
    const userResult = await client.query(
      `
      INSERT INTO app_users (id, github_username, access_key, github_avatar, github_displayname)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
      [
        '550e8400-e29b-41d4-a716-446655440000', // test UUID
        'testuser',
        'test-key-123',
        'https://example.com/avatar.png',
        'Test User',
      ]
    )
    const userId = userResult.rows[0].id

    // Create two test repositories
    const repo1Result = await client.query(
      `
      INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [
        '660e8400-e29b-41d4-a716-446655440000', // test UUID
        12345,
        'testowner',
        'testrepo1',
        new Date(),
        new Date(),
      ]
    )
    const repo1Id = repo1Result.rows[0].id

    const repo2Result = await client.query(
      `
      INSERT INTO repos (id, github_id, owner, repo_name, created_at, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [
        '770e8400-e29b-41d4-a716-446655440000', // test UUID
        67890,
        'testowner',
        'testrepo2',
        new Date(),
        new Date(),
      ]
    )
    const repo2Id = repo2Result.rows[0].id

    // Follow both repositories
    await client.query(
      `
      INSERT INTO app_user_repo_subscriptions (app_user_id, repo_id)
      VALUES ($1, $2), ($1, $3)
    `,
      [userId, repo1Id, repo2Id]
    )

    // Verify both subscriptions were created
    let subscriptionResult = await client.query(
      `
      SELECT * FROM app_user_repo_subscriptions
      WHERE app_user_id = $1
      ORDER BY repo_id
    `,
      [userId]
    )
    expect(subscriptionResult.rows.length).toBe(2)

    // Unfollow only the first repository
    await userUnfollowsRepository.run(
      {
        appUserId: userId,
        repoId: repo1Id,
      },
      client
    )

    // Verify only one subscription remains
    subscriptionResult = await client.query(
      `
      SELECT * FROM app_user_repo_subscriptions
      WHERE app_user_id = $1
    `,
      [userId]
    )
    expect(subscriptionResult.rows.length).toBe(1)
    expect(subscriptionResult.rows[0].repo_id).toBe(repo2Id)
  })
})
