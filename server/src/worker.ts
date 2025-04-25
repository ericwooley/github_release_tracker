import { getReleaseWorker } from './lib/queues/releaseWorker'
import { getEmailWorker } from './lib/queues/email'

;(async function worker() {
  // Set up release notification worker
  const releaseWorker = getReleaseWorker()

  releaseWorker.on('completed', (job) => {
    console.log(`Release notification job ${job.id} completed successfully`)
  })

  releaseWorker.on('failed', (job, err) => {
    console.error(`Release notification job ${job?.id} failed: ${err.message}`)
  })

  console.log('Release notification worker started')

  // Set up email worker with retries
  const emailWorker = getEmailWorker()

  emailWorker.on('completed', (job) => {
    console.log(`Email job ${job.id} completed successfully`)
  })

  emailWorker.on('failed', (job, err) => {
    console.error(`Email job ${job?.id} failed: ${err.message}`)
    console.log(`Remaining attempts: ${job?.attemptsMade}/${job?.opts.attempts}`)
  })

  console.log('Email worker started with retry capability')
})()
