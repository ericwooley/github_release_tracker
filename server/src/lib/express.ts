import { readFileSync } from 'node:fs'
import { createYoga, createSchema } from 'graphql-yoga'
import { Resolvers } from '../resolvers-types'
import { join } from 'path'
import express from 'express'
import helmet from 'helmet'
import { getEnv } from './env'
import session from 'express-session'
import { RedisStore } from 'connect-redis'
import { createClient } from 'redis'
import { setupPassport } from './passport'
import { getPgClient } from './db'
export const buildApp = () => {
  // Initialize the environment immediately, to trigger an error
  const app = express()

  // Setup some basic security
  // https://expressjs.com/en/advanced/best-practice-security.html
  app.use((req, res, next) => {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', getEnv().FRONTEND_URL)
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.header('Access-Control-Allow-Credentials', 'true')

    // Handle OPTIONS method for preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200)
    } else {
      next()
    }
  })
  app.use(helmet())
  // Initialize client.
  let redisClient = createClient({
    url: getEnv().REDIS_URL,
  })
  redisClient.on('error', (err) => console.warn('Redis Client Error', err))
  redisClient.on('connect', () => console.log('Redis Client Connected'))
  redisClient.connect().catch(console.error)

  // Initialize store.
  let redisStore = new RedisStore({
    client: redisClient,
    prefix: 'express-session:',
  })
  console.log('using secure cookie:', getEnv().SECURE_COOKIE)
  const sessionMiddleware = session({
    secret: getEnv().EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: getEnv().SECURE_COOKIE === 'true' },
    store: redisStore,
  })
  app.use(async (req, res, next) => {
    const pgClient = await getPgClient()
    // TODO: determine if this is a mutation, and if so start a transaction,
    // which should commit on listener end, and rollback on error
    // @ts-ignore
    req.pgClient = pgClient
    const start = Date.now()
    const path = req.path
    const method = req.method

    req.on('end', () => {
      const end = Date.now()
      console.log(`[${method}]`, path, end - start, 'ms')
      pgClient.release()
    })
    next()
  })

  app.use(sessionMiddleware)
  setupPassport(app)
  return app
}
