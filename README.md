# GitHub Release Tracker

A toy application which basically replicates the watch function on github, but with extra steps. This is really only to explore the pitfalls of this architecture.

## Features

- Track releases from your favorite GitHub repositories
- Search for GitHub repositories
- View detailed release information
- Receive notifications for new releases
- OAuth authentication with GitHub

## Project Structure

- [/web](/web) - React frontend built with Vite
- [/server](/server) - GraphQL API server built with Express and GraphQL Yoga

## Requirements

- Node.js (v22+)
- pnpm (for package management)
- Docker and Docker Compose (for local development environment)

## Getting Started

This project is designed for development purposes only and uses Docker Compose to set up the required services.

1. Start the Docker services:

```bash
docker-compose up -d
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up GitHub OAuth credentials:
   - Go to your GitHub account settings
   - Navigate to Developer settings > OAuth Apps > New OAuth App
   - Register a new application with:
     - Application name: GitHub Release Tracker (Dev)
     - Homepage URL: http://localhost:5173
     - Authorization callback URL: http://localhost:5173/api/auth/github/callback
   - After registering, you'll receive a Client ID and can generate a Client Secret
   - Create a `.env` file in the project root with these credentials:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

4. Start the development environment:

```bash
pnpm dev
```

This single command will:
- Initialize the database
- Start the server (including background workers)
- Start the web frontend
- Set up GraphQL code generation in watch mode

## Services

### Docker Services

The `docker-compose.yml` file defines the following services:

- **redis**: Message queue for background jobs and session storage
  - Port: 6482 (mapped to 6379 internally)

- **postgres**: Database for storing application data
  - Port: 5759 (mapped to 5432 internally)
  - Default credentials: postgres/postgres
  - Default database: gpr_dev

- **mailpit**: Local email testing service
  - SMTP Port: 1025
  - Web UI Port: 8025 (for viewing sent emails)

## Development Workflow

After starting the Docker services, you can:

1. Run the full development environment:
```bash
pnpm dev
```

2. Or run specific components separately:
```bash
# Server only
cd server
pnpm dev

# Web frontend only
cd web
pnpm dev
```

## GraphQL Code Generation

This project uses a centralized GraphQL schema with automatic code generation for both the server and client sides:

- Schema defined once in `schema.graphql` in the project root
- Code generation configured in `codegen.ts`
- Automatically generates TypeScript types and Apollo hooks while in development mode
- Run manually with `pnpm generate`

The code generation system:
1. Creates server-side resolver types at `server/src/resolvers-types.ts`
2. Creates client-side query hooks at `web/src/api/api-generated.ts`

For more information:
- See [server documentation](/server#graphql-code-generation) for server-side type generation and resolver usage
- See [web documentation](/web#graphql-integration) for client-side hook usage and examples

## Documentation Structure

This README provides a high-level overview and quickstart guide for the entire application. For detailed information:

- **[Server Documentation](/server)**: Covers backend architecture, database schema, queue system, and API structure
- **[Web Documentation](/web)**: Details frontend structure, component usage, and GraphQL client integration

## Limitations

This application is limited by GitHub's API rate limits. The GitHub REST API doesn't allow a lot of requests. If you wanted to use this application for real, you would need a better strategy.

## TODO

There is a good amount that would be good to do before this went into production, but will never be done because this is a toy application made to explore some new tools.

- [ ] Validation of inputs is not great. Ideally validation should be enforced through `server/src/lib/yoga/yogaHelpers.ts` using a zod schema or something.
- [ ] A build script which builds web, then copies the output to a public folder in server, and routes for the server to serve those public files.
- [ ] Figure out a higher limit on the github api.
- [ ] End to end tests.
- [ ] More testing generally, especially on the queue stuff. I wanted to be done with this, since I spent more than intended on it, and so i basically wrote no tests for the queues.
- [ ] Notifications for failing jobs.
