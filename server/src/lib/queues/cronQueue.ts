import { Queue } from 'bullmq'
import { getRedisConnection } from './redisConnection'

export const CRON_QUEUE = 'cronJobs'

export function getCronQueue() {
  const connection = getRedisConnection()
  return new Queue(CRON_QUEUE, {
    connection, // Backoff strategy in case of persistent GitHub rate limiting
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // Start at 1 minute
      },
    },
  })
}
