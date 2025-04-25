import { getUserById } from '../../../queries/users.queries'
import { getAccessKey } from '../../../utils'
import { GithubSearchRepositories } from '../../github/githubSearchRepositories'
import { query } from '../yogaHelpers'

export const searchRepositories = query('searchRepositories', async (_, { query }, { user, pgClient }) => {
  const accessKey = await getAccessKey(user.id, pgClient)
  return await new GithubSearchRepositories(accessKey).searchRepositories(query)
})
