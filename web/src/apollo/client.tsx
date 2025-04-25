import { ApolloClient, InMemoryCache, ApolloLink, HttpLink, from } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import { ToastContextType } from '../contexts/ToastContext'

// Apollo client setup with toast
export function createApolloClient() {
  // Get the toast function from outside of the Apollo client setup
  let showToast: ToastContextType['showToast'] | null = null

  // Function to set the toast function later
  const setToastFunction = (toastFn: ToastContextType['showToast']) => {
    showToast = toastFn
  }

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) => {
        const errorMsg = `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
        if (showToast) {
          showToast(errorMsg, 'error')
        }
        console.error(errorMsg)
      })
    }

    if (networkError) {
      const errorMsg = `[Network error]: ${networkError}`
      if (showToast) {
        showToast(errorMsg, 'error')
      }
      console.error(errorMsg)
    }
  })

  // Add middleware to check for success:false responses
  const successCheckLink = new ApolloLink((operation, forward) => {
    return forward(operation).map((response) => {
      // Define interfaces for type safety
      interface ErrorObject {
        message: string
      }

      interface FailureResponse {
        success: false
        error: ErrorObject
      }

      // Check all fields in the response for the success:false pattern
      const checkForFailure = (obj: unknown) => {
        if (!obj || typeof obj !== 'object') return

        // Type guard to check if object has the right structure
        const hasErrorPattern = (o: object): o is Record<string, unknown> & FailureResponse => {
          if (!o || typeof o !== 'object') return false

          const record = o as Record<string, unknown>
          return (
            record.success === false &&
            typeof record.error === 'object' &&
            record.error !== null &&
            record.error &&
            typeof record.error === 'object' &&
            'message' in record.error &&
            typeof (record.error as Record<string, unknown>).message === 'string'
          )
        }

        // Check if this object has the success:false pattern
        if (obj && typeof obj === 'object' && hasErrorPattern(obj)) {
          // Display error in toast instead of alert
          const record = obj as Record<string, unknown> & FailureResponse
          const errorMsg = `[Application error]: ${record.error.message ?? 'Unknown Error'}`
          if (showToast) {
            showToast(errorMsg, 'error')
          }
          console.error(errorMsg)
        }

        // Check nested objects and arrays
        if (Array.isArray(obj)) {
          obj.forEach((item) => checkForFailure(item))
        } else if (obj && typeof obj === 'object') {
          Object.values(obj).forEach((value) => checkForFailure(value))
        }
      }

      // Check the entire response data
      if (response.data) {
        checkForFailure(response.data)
      }

      return response
    })
  })

  const httpLink = new HttpLink({
    uri: '/graphql',
  })

  return {
    client: new ApolloClient({
      link: from([errorLink, successCheckLink, httpLink]),
      cache: new InMemoryCache(),
    }),
    setToastFunction,
  }
}

export default createApolloClient
