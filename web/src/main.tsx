import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ApolloProvider } from '@apollo/client'
import { BrowserRouter } from 'react-router-dom'
import ToastContext, { ToastProvider, ToastContextType } from './contexts/ToastContext'
import createApolloClient from './apollo/client'

// Create Apollo client
const { client, setToastFunction } = createApolloClient()

// Root component that sets up providers
function Root() {
  return (
    <StrictMode>
      <ToastProvider>
        <ToastContext.Consumer>
          {(context: ToastContextType | undefined) => {
            // Set the toast function for Apollo client to use
            if (context) {
              setToastFunction(context.showToast)
            }
            return (
              <ApolloProvider client={client}>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </ApolloProvider>
            )
          }}
        </ToastContext.Consumer>
      </ToastProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
