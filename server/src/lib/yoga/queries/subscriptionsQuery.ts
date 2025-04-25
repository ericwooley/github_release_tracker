import { getSubscriptions } from '../../../queries/subscriptions.queries'
import { query } from '../yogaHelpers'

export const listSubscriptions = query('listSubscriptions', async (_, _args, { user, pgClient }) => {
  let result = await getSubscriptions.run(
    {
      userId: user.id,
    },
    pgClient
  )
  return result.map(({ id, has_updated, owner, repo_name }) => ({
    id,
    hasUpdated: has_updated,
    owner,
    repo: repo_name,
  }))
})
