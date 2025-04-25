import { Client, PoolClient } from 'pg'
import { IRepoQuery } from './github.types'
import { GithubRepoQuery } from './githubRepoQuery'
import { GithubWriteCacheQuery } from './githubWriteCacheQuery'
import { GithubCacheQuery } from './githubReadCacheQuery'

export class GithubRepoCacheBuilder {
  private enableReadCache: boolean = false
  private enableWriteCache: boolean = false
  private sourceOfTruth?: IRepoQuery
  private accessKey?: string
  constructor(private repoUrl: string, private client: PoolClient | Client) {}

  static readonly(repoUrl: string, client: PoolClient | Client): GithubRepoCacheBuilder {
    return new GithubRepoCacheBuilder(repoUrl, client).withReadCache(true).withWriteCache(false)
  }

  static writeOnly(repoUrl: string, client: PoolClient | Client): GithubRepoCacheBuilder {
    return new GithubRepoCacheBuilder(repoUrl, client).withReadCache(false).withWriteCache(true)
  }

  static noCache(repoUrl: string, client: PoolClient | Client): GithubRepoCacheBuilder {
    return new GithubRepoCacheBuilder(repoUrl, client).withReadCache(false).withWriteCache(false)
  }

  static fullCache(repoUrl: string, client: PoolClient | Client): GithubRepoCacheBuilder {
    return new GithubRepoCacheBuilder(repoUrl, client).withReadCache(true).withWriteCache(true)
  }

  withAccessKey = (key: string) => {
    this.accessKey = key
    return this
  }

  withReadCache = (enabled: boolean = true) => {
    this.enableReadCache = enabled
    return this
  }

  withWriteCache = (enabled: boolean = true) => {
    this.enableWriteCache = enabled
    return this
  }

  withSourceOfTruth(sourceOfTruth: IRepoQuery) {
    this.sourceOfTruth = sourceOfTruth
    return this
  }

  build() {
    // The source of truth could be one that the user supplied (useful for testing)
    // Otherwise, we will default to the GithubRepoQuery which hits the github
    // api.
    let sourceOfTruth =
      this.sourceOfTruth ??
      new GithubRepoQuery({
        repositoryUrl: this.repoUrl,
      })

    // If the user does not want any caching, we can just return whatever the
    // regular query, which will always hit the api.
    let finalBuild: IRepoQuery = sourceOfTruth
    // If they want write caching, which will write to the database any results
    // from the source of truth, then we wrap the source of truth in the write
    // cache decorator
    if (this.enableWriteCache) {
      finalBuild = new GithubWriteCacheQuery(sourceOfTruth, this.client)
    }
    // If the user wants to check the database before going to github, this
    // decorator does that.
    if (this.enableReadCache) {
      finalBuild = new GithubCacheQuery(finalBuild, this.repoUrl, this.client)
    }

    // If both enableWriteCache and enableReadCache are enabled, it will check
    // check the database reads before going to the source of truth, then once
    // the source of truth is got too, it will record it to the db.
    return finalBuild
  }
}
