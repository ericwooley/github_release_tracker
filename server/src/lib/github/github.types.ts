export interface IRepoQuery {
  getRepo: () => Promise<IRepo>
  listReleases: (options: IListReleaseOptions) => Promise<IRelease[]>
}

export interface IRepo {
  /**
   * If this exists, it comes from the db
   */
  id?: string
  owner: string
  repo: string
  /**
   * This is the id github gives to us
   */
  githubId: number
}
export interface IRelease {
  id: number
  name: string
  tagName: string
  prerelease: boolean
  createdAt: string
  body: string
  url: string
  dbId?: string
  dbRepoId?: string
}

export interface IListReleaseOptions {
  includePrereleases?: boolean
}
