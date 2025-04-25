import { Queue } from 'bullmq'
import { getEnv } from '../env'
export const RELEASE_QUEUE = 'releaseNotifications'
export function getReleaseQueue() {
  const redisUrl = new URL(getEnv().REDIS_URL)
  const connection = {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port),
  }
  return new Queue(RELEASE_QUEUE, { connection })
}
