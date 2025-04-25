import { Worker } from "bullmq";
import { getRedisConnection } from "./redisConnection";
import { sendReleaseNotificationEmail } from './email'
import { getPgClient } from "../db";
import { getUsersSubscribedToRelease } from "../../queries/subscriptions.queries";

export function getReleaseWorker() {
  const connection = getRedisConnection();
  // Create a worker that processes release notification jobs
  const releaseWorker = new Worker(
    "releaseNotifications",
    async (job) => {
      const release = job.data.release as {
        id: string;
        repo_id: string;
        name: string;
        body: string;
        url: string;
      };
      console.log(`Processing release notification for: ${release.name}`);

      if (!release.id) {
        console.log(release);
        console.log("Release has no database ID, cannot send notifications");
        return {
          processed: false,
          emailsSent: 0,
          timestamp: new Date().toISOString(),
        };
      }

      // Get all users subscribed to this release
      const pgClient = await getPgClient();
      let emailsQueued = 0

      try {
        const subscribers = await getUsersSubscribedToRelease.run(
          { releaseId: release.id },
          pgClient
        )

        console.log(
          `Found ${subscribers.length} subscribers for release ${release.id}`
        )

        // Queue email for each subscriber
        for (const subscriber of subscribers) {
          if (!subscriber.email) {
            console.error('User is missing email....')
            continue
          }

          const repoFullName = `${subscriber.owner}/${subscriber.repo_name}`
          try {
            const result = await sendReleaseNotificationEmail(
              subscriber.email,
              release.name,
              repoFullName,
              release.url
            )

            emailsQueued++
            console.log(
              `Email notification queued for ${subscriber.email} with job ID ${result.jobId}`
            )
          } catch (error) {
            console.error(
              `Failed to queue email notification for ${subscriber.email}:`,
              error
            )
          }
        }
      } finally {
        pgClient.release();
      }

      return {
        processed: true,
        emailsQueued,
        timestamp: new Date().toISOString(),
      }
    },
    {
      connection,
      concurrency: 5, // Process up to 5 jobs at a time
    }
  );
  return releaseWorker;
}
