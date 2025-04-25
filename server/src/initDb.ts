import { getPgClient, initDb } from './lib/db'
import { getEnv } from './lib/env'
;(async function main() {
  // Initialize the environment immediately, to trigger an error
  // and exit early if it's a problem.
  getEnv()
  const client = await getPgClient()
  try {
    await client.query('BEGIN')
    await initDb(client)
    await client.query('COMMIT')
    console.warn('DB Migration Complete')
    process.exitCode = 0
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Failed to migrate database.')
    console.error(err)
    process.exitCode = 1
  } finally {
    client.release()
    // This shouldn't be necessary, not sure what's keeping the process open,
    // but good enough for now.
    process.exit()
  }
})()
