import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import { findOrCreateUser, getUserById } from './users.queries'
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
  // Clear the table before each test
  await client.query('DELETE FROM app_users')
})

afterAll(async () => {
  await client.end()
  await container.stop()
})

describe('findOrCreateUser', () => {
  it('should create a new user', async () => {
    const result = await findOrCreateUser.run(
      {
        github_username: 'testuser',
        access_key: 'test-key-123',
        github_avatar: 'https://example.com/avatar.png',
        github_displayname: 'Test User',
      },
      client
    )

    expect(result.length).toBe(1)
    expect(result[0].github_username).toBe('testuser')
    expect(result[0].access_key).toBe('test-key-123')
    expect(result[0].github_avatar).toBe('https://example.com/avatar.png')
    expect(result[0].github_displayname).toBe('Test User')
    expect(result[0].id).toBeDefined()
  })

  it('should update an existing user', async () => {
    const initialUser = await findOrCreateUser.run(
      {
        github_username: 'testuser',
        access_key: 'initial-key',
        github_avatar: 'https://example.com/avatar.png',
        github_displayname: 'Test User',
      },
      client
    )

    const updatedUser = await findOrCreateUser.run(
      {
        github_username: 'testuser',
        access_key: 'updated-key',
        github_avatar: 'https://example.com/updated-avatar.png',
        github_displayname: 'Updated Test User',
      },
      client
    )

    expect(updatedUser.length).toBe(1)
    expect(updatedUser[0].github_username).toBe('testuser')
    expect(updatedUser[0].access_key).toBe('updated-key')
    expect(updatedUser[0].github_avatar).toBe('https://example.com/updated-avatar.png')
    expect(updatedUser[0].github_displayname).toBe('Updated Test User')
    expect(updatedUser[0].id).toBe(initialUser[0].id)
  })
})

describe('getUserById', () => {
  it('should retrieve a user by id', async () => {
    // First create a user
    const createdUser = await findOrCreateUser.run(
      {
        github_username: 'testuser',
        access_key: 'test-key-123',
        github_avatar: 'https://example.com/avatar.png',
        github_displayname: 'Test User',
      },
      client
    )

    const userId = createdUser[0].id

    // Then retrieve the user by ID
    const result = await getUserById.run({ id: userId }, client)

    expect(result.length).toBe(1)
    expect(result[0].id).toBe(userId)
    expect(result[0].github_username).toBe('testuser')
    expect(result[0].access_key).toBe('test-key-123')
    expect(result[0].github_avatar).toBe('https://example.com/avatar.png')
    expect(result[0].github_displayname).toBe('Test User')
  })

  it('should return empty array when user does not exist', async () => {
    // Use a non-existent ID
    const nonExistentId = '8453e2e0-c98b-45a5-b115-54d5f2909b4c'

    const result = await getUserById.run({ id: nonExistentId }, client)

    expect(result.length).toBe(0)
  })
})
