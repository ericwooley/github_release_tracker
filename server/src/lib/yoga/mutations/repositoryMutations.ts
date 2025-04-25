import { getAccessKey, tryCatch } from '../../../utils'
import { GithubRepoCacheBuilder } from '../../github/githubRepoCacheBuilder'
import { mutation } from '../yogaHelpers'
import { userFollowsRepository, userUnfollowsRepository } from './repositoryMutations.queries'
export const followRepository = mutation('followRepository', async (_, { repositoryUrl }, { user, pgClient }) => {
  const accessKey = await getAccessKey(user.id, pgClient)
  const githubRepoQuery = GithubRepoCacheBuilder.fullyLoaded(
    repositoryUrl,
    pgClient
  )
    .withAccessKey(accessKey)
    .build()
  let [repo, err] = await tryCatch(githubRepoQuery.getRepo())
  if (err) {
    console.error('error getting repo', err)
    return {
      success: false,
      error: {
        message: 'Error Fetching Repository',
      },
    }
  }
  if (!repo || !repo.id) {
    throw new Error('Could not create repo')
  }
  ;[, err] = await tryCatch(
    userFollowsRepository.run(
      {
        appUserId: user.id,
        repoId: repo.id,
      },
      pgClient
    )
  )

  if (err) {
    console.error('Error creating subscription', err)
    return {
      success: false,
      error: {
        message: 'Error Creating Subscription',
      },
    }
  }

  return {
    success: true,
  }
})
export const unfollowRepository = mutation('followRepository', async (_, { repositoryUrl }, { user, pgClient }) => {
  const accessKey = await getAccessKey(user.id, pgClient)
  const githubRepoQuery = GithubRepoCacheBuilder.fullyLoaded(
    repositoryUrl,
    pgClient
  )
    .withAccessKey(accessKey)
    .build()
  let [repo, err] = await tryCatch(githubRepoQuery.getRepo())
  if (err) {
    console.error('error getting repo', err)
    return {
      success: false,
      error: {
        message: 'Error Fetching Repository',
      },
    }
  }
  if (!repo || !repo.id) {
    throw new Error('Could not create repo')
  }
  ;[, err] = await tryCatch(
    userUnfollowsRepository.run(
      {
        appUserId: user.id,
        repoId: repo.id,
      },
      pgClient
    )
  )

  if (err) {
    console.error('Error creating subscription', err)
    return {
      success: false,
      error: {
        message: 'Error Creating Subscription',
      },
    }
  }

  return {
    success: true,
  }
})
