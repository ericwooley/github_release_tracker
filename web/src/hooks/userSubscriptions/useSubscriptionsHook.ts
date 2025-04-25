import {
  useSubscribeToRepoMutation,
  useUnsubscribeToRepoMutation,
  useGetSubscriptionsQuery,
} from '../../api/api-generated'
export function extractRepoFromUrl(url: string) {
  const parts = url.split('/')
  const baseIndex = parts.findIndex((str) => str.toLowerCase() === 'github.com')
  if (baseIndex === -1) {
    return {
      owner: '',
      repo: '',
      error: 'Invalid Link',
    }
  }
  const owner = parts[baseIndex + 1]
  const repo = parts[baseIndex + 2]
  return {
    owner: owner.toLowerCase(),
    repo: repo.toLowerCase(),
    error: '',
  }
}
export const useSubscriptions = () => {
  const { data, refetch, loading: listLoading } = useGetSubscriptionsQuery({})
  const [subscribe, { loading: subscribeLoading }] = useSubscribeToRepoMutation({
    onCompleted: () => refetch({}),
  })
  const [unsubscribe, { loading: unsubscribeLoading }] = useUnsubscribeToRepoMutation({
    onCompleted: () => refetch(),
  })
  // if these get real big, consider useMemo and useCallback
  const subscriptionMap = (data?.listSubscriptions ?? []).reduce((acc, item) => {
    acc[[item.owner, item.repo].join('/')] = true
    return acc
  }, {} as { [key: string]: boolean })

  const hasSubscription = (owner: string, repo: string) => {
    return subscriptionMap[[owner, repo].join('/')] ?? false
  }
  return {
    subscribe,
    unsubscribe,
    subscriptions: data?.listSubscriptions ?? [],
    hasSubscription,
    loading: unsubscribeLoading || listLoading || subscribeLoading,
    refetchSubscriptions: refetch,
  }
}
