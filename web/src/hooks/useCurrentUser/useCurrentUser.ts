import { createContext, useContext } from 'react'
import { ApolloError } from '@apollo/client'
import { CurrentUser } from '../../api/api-generated'

type CurrentUserContextType = {
  currentUser?: CurrentUser | null
  loading: boolean
  error?: ApolloError
}

export const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined)

export function useCurrentUser() {
  const context = useContext(CurrentUserContext)
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider')
  }
  return context
}
