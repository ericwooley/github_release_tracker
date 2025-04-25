# gpr Server

## Overview

This is the server component of the gpr application, providing a GraphQL API with GitHub integration capabilities. The server handles authentication, database operations, and API interactions.

## Features

- **GraphQL API**: Modern API architecture using GraphQL Yoga
- **GitHub Integration**: OAuth authentication and repository data access
- **Database Integration**: PostgreSQL for persistent storage
- **Session Management**: Redis-based session storage
- **Security**: Helmet middleware implementation for Express
- **Background Job Processing**: BullMQ for reliable task execution
- **Release Notification**: PostgreSQL notification listener for real-time release updates

## Prerequisites

- Node.js (v16+)
- PostgreSQL
- Redis
- GitHub OAuth application credentials

## Setup

1. Install dependencies:
   ```
   pnpm install
   ```

2. Set up environment variables.

3. Initialize database:
   ```
   pnpm run migrate:local
   ```

4. Start development server:
   ```
   pnpm run dev
   ```

5. Start the release listener (in a separate terminal):
   ```
   pnpm run dev:listener
   ```

## Architecture

The server architecture consists of several interconnected layers:

### Express Layer
The Express layer serves as the HTTP server foundation, handling requests, middleware, security, and session management. It orchestrates the flow of requests to the GraphQL engine and authentication services.

### GraphQL Layer
The GraphQL layer provides a type-safe API interface. It leverages GraphQL Yoga to create a performant and developer-friendly GraphQL server that integrates with the Express application.

### Authentication Layer
The authentication layer uses Passport.js with GitHub OAuth strategy to authenticate users, manage sessions, and provide secure access to the application's resources.

### Database Layer
The database layer manages connections to PostgreSQL, handles database schema setup, and provides transaction management for data consistency.

For the latest schema see (the database graph)[./database.md]

### GitHub Integration Layer
The GitHub integration layer facilitates interaction with GitHub's API and implements efficient caching strategies to optimize performance.

[See the README in src/lib/github](./src/lib/github)

### Release Notification Layer
The release notification layer listens for PostgreSQL notifications about new releases and processes them.

#### Two Implementation Options:

1. **Simple Listener (recommended)**:
   - A standalone process (src/listener.ts) that listens for PostgreSQL notifications
   - Simple and lightweight with no dependencies beyond the database
   - Designed to be run as a singleton process (configure your deployment to ensure only one instance runs)
   - Start with `pnpm run dev:listener`

2. **Worker with BullMQ**:
   - Uses Redis and BullMQ for job queue management (src/worker.ts)
   - Provides job locking and coordination across multiple processes
   - More complex but offers better failure recovery
   - Start with `pnpm run dev:worker`

## GraphQL Schema and Code Generation

The GraphQL schema is the core definition for the API's capabilities and type system. The workflow follows:

1. `schema.graphql` defines the API contract with queries, mutations, and types
2. `graphql.config.yml` configures the GraphQL tooling to use this schema
3. GraphQL Code Generator uses this schema to generate TypeScript types
4. The generated types are used in `yoga.ts` to provide type safety for resolvers

This code generation process ensures type consistency between the schema, resolvers, and client applications, preventing type-related bugs and providing better developer experience through autocomplete.

## Development

During development, you can use the watch mode to automatically restart the server:

```
pnpm run dev
```

To run the release listener in development mode:

```
pnpm run dev:listener
```

## API Structure

The GraphQL API provides operations for:

- User authentication and profile management
- GitHub repository search and interaction
- Release tracking and filtering

## License

[License Information]
