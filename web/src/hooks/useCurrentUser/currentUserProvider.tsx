import { ReactNode } from 'react'
import { useGetCurrentUserQuery } from '../../api/api-generated'
import { CurrentUserContext } from './useCurrentUser'

// this has to be in it's own file for fast refresh or whatever
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { data, loading, error } = useGetCurrentUserQuery()

  const value = {
    currentUser: data?.getCurrentUser,
    loading,
    error,
  }

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}
