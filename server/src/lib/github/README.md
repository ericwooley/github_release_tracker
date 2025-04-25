# GitHub Integration Module

This module provides functionality for interacting with GitHub's API, retrieving repository information and releases, and implementing a caching layer for optimized performance.

## Is it over engineered?

Definitely, this could for sure be a couple functions that accepts cacheResult and forceUpdate, but I read design patterns again recently and felt like exercising that part of my brain again.

## Overview

The GitHub module provides:

1. Querying GitHub repositories and releases
2. Caching repository and release data in a database
3. Utilities for GitHub URL parsing
4. Database schema and queries for storing GitHub data

## Components

### Core Types (`github.types.ts`)

Contains interfaces that define the shape of repository and release data structures.

### GitHub API Client (`githubRepoQuery.ts`)

Implements direct communication with GitHub's REST API using Octokit:
- `GithubRepoQuery`: Fetches repository data and release information

### Repository Search (`githubSearchRepositories.ts`)

Provides functionality to search GitHub repositories:
- `GithubSearchRepositories`: Searches repositories with filtering and sorting

### Caching Layer

The module implements a caching system with read/write capabilities:

- `GithubCacheQuery`: Reads data from the database cache first (`githubReadCacheQuery.ts`)
- `GithubWriteCacheQuery`: Writes data to the database cache (`githubWriteCacheQuery.ts`)
- `GithubRepoCacheBuilder`: Builder pattern for configuring caching behavior (`githubRepoCacheBuilder.ts`)

### Database Schema and Queries

SQL definitions for storing GitHub repository and release data:
- `githubCache.sql`: SQL schema and query definitions
- `githubCache.queries.ts`: TypeScript interfaces for database queries

### Utilities (`githubUtils.ts`)

Helper functions for working with GitHub data:
- `extractRepoFromUrl`: Parses owner and repository name from GitHub URLs

## Usage Example

```typescript
import { GithubRepoCacheBuilder } from './githubRepoCacheBuilder';
import { pool } from '../database'; // Your database connection

// Create a client with caching capabilities
async function getGitHubRepoClient(repoUrl: string, githubToken: string) {
  const client = await pool.connect();

  try {
    // Build the GitHub client with read and write caching
    const githubClient = new GithubRepoCacheBuilder(repoUrl, githubToken, client)
      .withReadCache(true)
      .withWriteCache(true)
      .build();

    // Get repository information
    const repo = await githubClient.getRepo();

    // Get latest releases (excluding pre-releases)
    const releases = await githubClient.listReleases({ includePrereleases: false });

    return { repo, releases };
  } finally {
    client.release();
  }
}
```

## Testing

This module includes comprehensive test coverage:
- Unit tests for each component
- Integration tests for database interactions
- Mocking of GitHub API responses

## Implementation Notes

- Uses the Decorator pattern for caching layers
- Builder pattern for configuring cache behavior
- Implements database optimization with conflict handling


