- [GitHub Release Tracker](#github-release-tracker)
  - [Features](#features)
  - [Project Structure](#project-structure)
  - [Requirements](#requirements)
  - [Getting Started](#getting-started)
  - [Services](#services)
    - [Docker Services](#docker-services)
    - [Server Components](#server-components)
    - [Root Project](#root-project)
  - [Development](#development)
  - [GraphQL Schema](#graphql-schema)
  - [Limitations](#limitations)
- [TODO](#todo)



# GitHub Release Tracker

A development-focused application for tracking and receiving notifications about GitHub repository releases.

## Features

- Track releases from your favorite GitHub repositories
- Search for GitHub repositories
- View detailed release information
- Receive notifications for new releases
- OAuth authentication with GitHub

## Project Structure

- `/web` - React frontend built with Vite
- `/server` - GraphQL API server built with Express and GraphQL Yoga

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

### Server Components

The server (`server/package.json`) includes:

- Core Express/GraphQL server
- Background workers (powered by BullMQ)
- Scheduled cron jobs
- Database migrations and type generation

Key scripts:
- `dev`: Sets up the database, generates types, and runs the server with workers
- `dev:server`: Starts just the Express server
- `dev:worker`: Runs background job workers
- `dev:cron`: Runs scheduled tasks
- `pgtyped`: Generates TypeScript types from SQL queries

### Root Project

The root project (`package.json`) coordinates the development workflow:

- `dev`: Runs the server, web client, and GraphQL code generation in parallel
- `generate`: Creates TypeScript types from GraphQL schema
- `dev:initdb`: Initializes the database schema

## Development

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

## GraphQL Schema

The GraphQL schema in the root directory defines the API contract between the server and client. Changes to the schema are automatically applied and code is generated when running in development mode.

## Limitations

This application is limited by GitHub's API rate limits. The GitHub REST API doesn't allow a lot. If you really wanted to use this application for real, you
would need a better strategy.


# TODO

There is a good amount that would be good to do before this went into production, but will never be done because this is a toy application made to explore some new tools.

- [ ] Validation of inputs is not great. Ideally validation should be enforced through `server/src/lib/yoga/yogaHelpers.ts`
- [ ] A build script which builds web, then copies the output to a public folder in server, and routes for the server to serve those public files.
- [ ] Figure out a higher limit on the github api.
- [ ] End to end tests.
- [ ] More testing generally, especially on the queue stuff. I wanted to be done with this, since I spent more than intended on it, and so i basically wrote no tests for the queues.
- [ ] Notifications for failing jobs.

I'm sure there is more.
