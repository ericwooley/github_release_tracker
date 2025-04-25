import { getCronQueue, CRON_QUEUE } from './lib/queues/cronQueue'
import { getEnv } from './lib/env'
import { getCronWorker } from './lib/queues/cronWorker'


async function setupCronJobs() {
  const cronQueue = getCronQueue()
  const cronWorker = getCronWorker()

  // Create a repeatable job using the cron schedule from env
  await cronQueue.add(
    'cron-for-repos',
    { jobType: 'cron-for-repos' },
    {
      repeat: {
        pattern: getEnv().CRON_SCHEDULE,
      },
    }
  )

  console.log(`Cron job scheduled with pattern: ${getEnv().CRON_SCHEDULE}`)

  // Set up event listeners
  cronWorker.on('completed', job => {
    console.log(`Cron job ${job.id} completed successfully`)
  })

  cronWorker.on('failed', (job, err) => {
    console.error(`Cron job ${job?.id} failed: ${err.message}`)
  })

  console.log('Cron worker started')
}

;(async function start() {
  try {
    await setupCronJobs()
  } catch (error) {
    console.error('Failed to set up cron jobs:', error)
    process.exit(1)
  }
})()
