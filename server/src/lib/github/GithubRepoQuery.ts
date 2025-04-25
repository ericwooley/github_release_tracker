import { Octokit } from 'octokit'
import { extractRepoFromUrl } from './githubUtils'
import { IRelease, IRepoQuery } from './github.types'

export class RateLimitError extends Error {
  public resetAt: Date
  
  constructor(message: string, resetTime: Date) {
    super(message)
    this.name = 'RateLimitError'
    this.resetAt = resetTime
  }
}

export class GithubRepoQuery implements IRepoQuery {
  private octokit: Octokit
  private repositoryUrl: string

  constructor({ repositoryUrl, accessKey }: { repositoryUrl: string; accessKey?: string }) {
    this.octokit = new Octokit({ auth: accessKey })
    this.repositoryUrl = repositoryUrl
  }

  /**
   * Checks and handles rate limit errors from GitHub API responses
   */
  private checkRateLimit(response: any) {
    const rateLimit = response.headers['x-ratelimit-remaining']
    const rateLimitReset = response.headers['x-ratelimit-reset']
    
    if (rateLimit && parseInt(rateLimit) === 0) {
      const resetTime = new Date(parseInt(rateLimitReset) * 1000)
      const resetTimeFormatted = resetTime.toLocaleTimeString()
      const errorMessage = `GitHub API rate limit exceeded. Quota will reset at ${resetTimeFormatted}`
      console.warn(errorMessage)
      throw new RateLimitError(errorMessage, resetTime)
    }
    
    // Log remaining requests when getting low
    if (rateLimit && parseInt(rateLimit) < 10) {
      console.warn(`GitHub API rate limit running low: ${rateLimit} requests remaining`)
    }
  }

  async getRepo() {
    try {
      const { repo, owner } = extractRepoFromUrl(this.repositoryUrl)
      console.log('Getting data for', repo, owner)
      
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      })
      
      // Check for rate limiting
      this.checkRateLimit(response)
      
      const { id: githubId } = response.data
      
      return {
        owner,
        repo,
        githubId,
      }
    } catch (e: any) {
      // Handle GitHub API specific errors
      if (e.status === 403 && e.response?.headers?.['x-ratelimit-remaining'] === '0') {
        const resetTime = new Date(parseInt(e.response.headers['x-ratelimit-reset']) * 1000)
        throw new RateLimitError(`GitHub API rate limit exceeded for ${this.repositoryUrl}`, resetTime)
      }
      
      console.warn('Error getting repo', e.message || e)
      throw e
    }
  }

  // This should be refactored to be testable
  // We are also assuming they are giving it to us by most recent first,
  // there doesn't seem to be any sort options so 🤷‍♂️
  async listReleases({ includePrereleases = false }) {
    console.log('Getting releases for', this.repositoryUrl)
    const { repo, owner } = extractRepoFromUrl(this.repositoryUrl)
    let currentPage = 0
    let perPage = 10
    let allReleases: IRelease[] = []

    try {
      // Keep fetching pages until we find a non-prerelease or run out of results
      // max 20
      for (let loopCount = 0; loopCount < 20; loopCount++) {
        const response = await this.octokit.rest.repos.listReleases({
          owner,
          repo,
          page: currentPage,
          per_page: perPage,
        })
        
        // Check for rate limiting
        this.checkRateLimit(response)

        const { data: releaseList } = response
        if (releaseList.length === 0) {
          break
        }
        
        let releasesWeCareAbout: IRelease[] = []
        let foundNonPrerelease = false
        
        for (let i = 0; i < releaseList.length; i++) {
          const { id, name, tag_name, prerelease, created_at, body, html_url } = releaseList[i]
          const formatted: IRelease = {
            id,
            name: name ?? '< No Release Name >',
            tagName: tag_name,
            prerelease,
            createdAt: created_at,
            body: body ?? '< No Body Text >',
            url: html_url,
          }
          if (prerelease) {
            if (includePrereleases) {
              releasesWeCareAbout.push(formatted)
            }
          } else {
            releasesWeCareAbout.push(formatted)
            foundNonPrerelease = true
            // we only want 1 release
            break
          }
        }
        
        allReleases = allReleases.concat(releasesWeCareAbout)
        if (foundNonPrerelease) {
          break
        }
        
        currentPage++
      }

      return allReleases
    } catch (e: any) {
      // Handle GitHub API specific errors
      if (e.status === 403 && e.response?.headers?.['x-ratelimit-remaining'] === '0') {
        const resetTime = new Date(parseInt(e.response.headers['x-ratelimit-reset']) * 1000)
        throw new RateLimitError(`GitHub API rate limit exceeded when listing releases for ${owner}/${repo}`, resetTime)
      }
      
      console.error('Error fetching releases:', e.message || e)
      throw e
    }
  }
}
