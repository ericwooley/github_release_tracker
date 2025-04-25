import { Worker } from 'bullmq'
import { getRedisConnection } from './redisConnection'
import { CRON_QUEUE } from './cronQueue'
import {
  getReposBySubscription,
  updateReposLastSubscription,
} from '../../queries/repos.queries'
import { getPgClient } from '../db'
import { GithubRepoCacheBuilder } from '../github/githubRepoCacheBuilder'
import { RateLimitError } from '../github/githubRepoQuery'

export function getCronWorker() {
  const connection = getRedisConnection()
  const cronWorker = new Worker(
    CRON_QUEUE,
    async () => {
      const client = await getPgClient()
      const processedRepoIds: string[] = []
      const skippedRepoIds: string[] = []
      let rateLimitHit = false
      let rateLimitResetTime: Date | null = null

      try {
        // Get repos that need to be checked, ordered by least recently checked first
        const repos = await getReposBySubscription.run(
          {
            limit: 10,
          },
          client
        )

        if (repos.length === 0) {
          console.log('No repos to check for updates')
          return {
            processed: true,
            reposChecked: 0,
            timestamp: new Date().toISOString(),
          }
        }

        console.log(`Found ${repos.length} repos to check for updates`)

        for (const repo of repos) {
          try {
            if (rateLimitHit) {
              // Skip remaining repos if we've already hit rate limit
              skippedRepoIds.push(repo.id)
              continue
            }

            const url = `https://github.com/${repo.owner}/${repo.repo_name}`

            const repoQuery = GithubRepoCacheBuilder.fullCache(
              url,
              client
            ).build()

            console.log(`Fetching releases for ${repo.owner}/${repo.repo_name}`)
            await repoQuery.listReleases({})

            // Mark as processed successfully
            processedRepoIds.push(repo.id)
            console.log(`Successfully checked ${repo.owner}/${repo.repo_name}`)
          } catch (error: any) {
            if (error instanceof RateLimitError) {
              console.warn(
                `Rate limit hit while processing ${repo.owner}/${repo.repo_name}. Will try again later.`
              )
              rateLimitHit = true
              rateLimitResetTime = error.resetAt
              skippedRepoIds.push(repo.id)
            } else {
              console.error(
                `Error processing repo ${repo.owner}/${repo.repo_name}:`,
                error.message || error
              )
              // We still mark it as processed to avoid getting stuck on problematic repos
              processedRepoIds.push(repo.id)
            }
          }
        }

        // Update the last_release_check timestamp for all processed repos
        if (processedRepoIds.length > 0) {
          await updateReposLastSubscription.run(
            { updateIds: processedRepoIds },
            client
          )
          console.log(
            `Updated last_release_check for ${processedRepoIds.length} repos`
          )
        }
      } catch (e: any) {
        console.error('Error in cron job:', e.message || e)
      } finally {
        client.release()
      }

      return {
        processed: true,
        reposProcessed: processedRepoIds.length,
        reposSkipped: skippedRepoIds.length,
        rateLimitHit,
        rateLimitResetTime: rateLimitResetTime?.toISOString(),
        timestamp: new Date().toISOString(),
      }
    },
    {
      connection,
      concurrency: 1,
    }
  )

  return cronWorker
}
