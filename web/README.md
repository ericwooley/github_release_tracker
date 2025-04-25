# GitHub Release Tracker Web Frontend

This is the web frontend for the GitHub Release Tracker project, built with React and Vite.

## Technology Stack

- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and development server
- **Material UI 7** - Component library for consistent design
- **Apollo Client** - GraphQL client
- **React Router 7** - Navigation and routing
- **React Markdown** - Markdown rendering
- **GraphQL** - API communication

## Project Structure

- `src/pages/` - Page components (using file-based routing via vite-plugin-pages)
- `src/layouts/` - Layout components including MainLayout
- `src/api/` - Generated GraphQL API code
- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks for shared logic
- `src/contexts/` - React contexts for global state management
- `src/apollo/` - Apollo Client configuration and setup

## Development

To start the development server:

```bash
pnpm run dev
```

This will start Vite's development server with hot module replacement.

## Build

To build the application for production:

```bash
pnpm run build
```

## GraphQL Integration

This project uses GraphQL for API communication with automatic code generation:

### Code Generation Process

1. The schema is defined in `schema.graphql` at the project root
2. Client queries are defined in `.graphql` files within the `web/src/` directory 
3. Running `pnpm run generate` at the project root generates TypeScript types and Apollo hooks
4. Generated files are stored in `web/src/api/api-generated.ts`

The development workflow (`pnpm run dev` at the project root) automatically watches for GraphQL schema or query changes and regenerates the API code as needed.

### Using Generated Hooks

The generated hooks provide type-safe GraphQL operations. For example, in `src/hooks/userSubscriptions/useSubscriptionsHook.ts`:

```typescript
import {
  useSubscribeToRepoMutation,
  useUnsubscribeToRepoMutation,
  useGetSubscriptionsQuery,
} from '../../api/api-generated'

export const useSubscriptions = () => {
  const { data, refetch, loading: listLoading } = useGetSubscriptionsQuery({})
  const [subscribe, { loading: subscribeLoading }] = useSubscribeToRepoMutation({
    onCompleted: () => refetch({}),
  })
  // ...rest of implementation
}
```

The hooks are automatically generated from `.graphql` files like `useSubscriptions.graphql` in the same directory:

```graphql
query getSubscriptions {
  listSubscriptions {
    id
    owner
    repo
    hasUpdated
    lastRelease
  }
}
```

### Apollo Client Configuration

The Apollo Client is configured in `src/apollo/client.tsx` to:

- Connect to the GraphQL endpoint
- Handle error notifications
- Process custom success/error patterns in responses

```typescript
// From src/apollo/client.tsx
export function createApolloClient() {
  // ... implementation
  return {
    client: new ApolloClient({
      link: from([errorLink, successCheckLink, httpLink]),
      cache: new InMemoryCache(),
    }),
    setToastFunction,
  }
}
```

## Proxy Configuration

During development, API requests are proxied to the backend server:
- `/api/*` routes to `http://localhost:3000`
- `/graphql` routes to `http://localhost:3000`

For more information about the overall project setup, see the [root README](/) and for details about the backend API, see the [server documentation](/server).