# Web Frontend

This is the web frontend for the gpr project, built with React and Vite.

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

## Development

To start the development server:

```bash
npm run dev
```

This will start Vite's development server with hot module replacement.

## Build

To build the application for production:

```bash
npm run build
```

## GraphQL Integration

This project uses GraphQL for API communication. The GraphQL schema is defined in `schema.graphql` at the project root.

GraphQL types and hooks are automatically generated using GraphQL Code Generator:

1. The schema is defined in `schema.graphql`
2. Client queries are defined in `.graphql` files within the `web/src/` directory
3. Running `npm run generate` at the project root generates TypeScript types and Apollo hooks
4. Generated files are stored in `web/src/api/api-generated.ts`

The development workflow (`npm run dev` at the project root) automatically watches for GraphQL schema or query changes and regenerates the API code as needed.

## Proxy Configuration

During development, API requests are proxied to the backend server:
- `/api/*` routes to `http://localhost:3000`
- `/graphql` routes to `http://localhost:3000`
