import { getEnv } from '../env'
export function getRedisConnection() {
  const redisUrl = new URL(getEnv().REDIS_URL)
  const connection = {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port),
  }
  return connection
}
