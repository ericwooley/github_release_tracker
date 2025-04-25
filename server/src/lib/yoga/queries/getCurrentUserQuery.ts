import { query } from '../yogaHelpers'

export const getCurrentUser = query('getCurrentUser', async (_, _args, { user }) => {
  const { id, github_username: username, github_avatar: avatar, github_displayname: displayName } = user
  return {
    id,
    username,
    avatar,
    displayName,
  }
})
