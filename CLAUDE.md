# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Build: `pnpm build` (server), `pnpm dev` (web)
- Test: `pnpm test` (all tests), `pnpm test src/path/to/file.test.ts` (single test)
- Lint: `pnpm lint`

## Code Style
- TypeScript with strict types, prefer interfaces over types for objects
- No semicolons, 80 character line width
- Use functional components with hooks for React
- Imports: group by external/internal, alphabetize
- Naming: camelCase for variables/functions, PascalCase for components/classes
- Use async/await with try/catch for error handling

## Database
- PostgreSQL with pg-typed for type-safe queries
- SQL files in queries/ directory with corresponding test files

## Architecture
- Server: Express + GraphQL Yoga + BullMQ for background jobs
- Web: React + Apollo Client + React Router

## Git Commits

use conventional commits, but do not include yourself as an author
