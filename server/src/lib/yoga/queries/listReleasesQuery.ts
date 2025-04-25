import { markSubscriptionViewed } from '../../../queries/subscriptions.queries'
import { getAccessKey } from '../../../utils'
import { GithubRepoCacheBuilder } from '../../github/githubRepoCacheBuilder'
import { query } from '../yogaHelpers'

export const listReleases = query(
  'listReleases',
  async (_, { repositoryUrl, includePrereleases, markViewed }, { user, pgClient }) => {
    const accessKey = await getAccessKey(user.id, pgClient)
    let result = await GithubRepoCacheBuilder.fullyLoaded(
      repositoryUrl,
      pgClient
    )
      .withAccessKey(accessKey)
      .build()
      .listReleases({
        includePrereleases,
      })
    if (result.length && markViewed) {
      // this could be done in a single query 🤷‍♂️
      await Promise.all(
        result
          .filter(r => !r.prerelease)
          .filter(r => r.dbRepoId)
          .map(async r => {
            if (!r.dbRepoId) return
            markSubscriptionViewed.run(
              {
                app_user_id: user.id,
                repo_id: r.dbRepoId,
              },
              pgClient
            )
          })
      )
    }
    return result
  }
)
