import nodemailer from 'nodemailer'
import { getEnv } from '../../lib/env'
import { Queue, Worker } from 'bullmq'
import { getRedisConnection } from './redisConnection'

export const EMAIL_QUEUE = 'emailQueue'

interface EmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
}

interface EmailJobData extends EmailOptions {
  jobType: 'send-email'
}

interface ReleaseNotificationJobData {
  jobType: 'release-notification'
  to: string
  releaseName: string
  repoName: string
  releaseUrl: string
}

type EmailJobTypes = EmailJobData | ReleaseNotificationJobData

/**
 * Creates a nodemailer transporter using environment variables
 */
export function createTransporter() {
  return nodemailer.createTransport({
    host: getEnv().SMTP_HOST,
    port: parseInt(getEnv().SMTP_PORT || '587'),
    secure: getEnv().SMTP_SECURE === 'true',
    auth: {
      user: getEnv().SMTP_USER,
      pass: getEnv().SMTP_PASSWORD,
    },
  })
}

/**
 * Gets the email queue instance
 */
export function getEmailQueue() {
  const connection = getRedisConnection()
  return new Queue<EmailJobTypes>(EMAIL_QUEUE, { connection })
}

/**
 * Processes email sending jobs with retries and backoff
 */
export function getEmailWorker() {
  const connection = getRedisConnection()

  const worker = new Worker(
    EMAIL_QUEUE,
    async job => {
      const data = job.data

      if (data.jobType === 'send-email') {
        return await processEmailJob(data)
      } else if (data.jobType === 'release-notification') {
        return await processReleaseNotificationJob(data)
      } else {
        throw new Error(`Unknown job type: ${(data as any).jobType}`)
      }
    },
    {
      connection,
      concurrency: 5,
    }
  )

  return worker
}

/**
 * Process an email job
 */
async function processEmailJob(
  data: EmailJobData
): Promise<{ success: boolean }> {
  const { to, subject, text, html } = data
  try {
    const transporter = createTransporter()

    await transporter.sendMail({
      from: getEnv().EMAIL_FROM || 'noreply@example.com',
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      text,
      html,
    })

    console.log(`Email sent successfully to ${to}`)
    return { success: true }
  } catch (error) {
    console.error('Error sending email:', error)
    // Throw error to trigger retry with backoff
    throw new Error(`Failed to send email: ${(error as Error).message}`)
  }
}

/**
 * Process a release notification job
 */
async function processReleaseNotificationJob(
  data: ReleaseNotificationJobData
): Promise<{ success: boolean }> {
  const { to, releaseName, repoName, releaseUrl } = data
  const subject = `New Release: ${releaseName} for ${repoName}`
  const text = `A new release "${releaseName}" is available for ${repoName}. View it here: ${releaseUrl}`
  const html = `
    <h1>New Release Available</h1>
    <p>A new release <strong>${releaseName}</strong> is available for <strong>${repoName}</strong>.</p>
    <p><a href="${releaseUrl}">View the release details</a></p>
  `

  return processEmailJob({
    jobType: 'send-email',
    to,
    subject,
    text,
    html,
  })
}

/**
 * Queues an email to be sent with retries
 * @param options Email options including recipient, subject, and content
 * @returns Promise that resolves when job is added to queue
 */
export async function sendEmail(
  options: EmailOptions
): Promise<{ jobId: string }> {
  const queue = getEmailQueue()
  const job = await queue.add('send-email', {
    jobType: 'send-email',
    ...options,
  })
  if (!job.id) throw new Error('Could not create job')
  return { jobId: job.id }
}

/**
 * Queues a release notification email with retries
 * @param to Recipient email address
 * @param releaseName Name of the release
 * @param repoName Name of the repository
 * @param releaseUrl URL to the release
 * @returns Promise that resolves when job is added to queue
 */
export async function sendReleaseNotificationEmail(
  to: string,
  releaseName: string,
  repoName: string,
  releaseUrl: string
): Promise<{ jobId: string }> {
  const queue = getEmailQueue()
  const job = await queue.add('release-notification', {
    jobType: 'release-notification',
    to,
    releaseName,
    repoName,
    releaseUrl,
  })
  if (!job.id) throw new Error('Could not create job')
  return { jobId: job.id }
}
