import { useState, FormEvent, useEffect } from 'react'
import { useRepositorySearchLazyQuery, Repository } from '../api/api-generated'
import { Box, TextField, Paper, List, Typography, IconButton, CircularProgress } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import useUrlState from '../hooks/urlState'
import { RepositoryItem } from './repositoryItem'
import { RepositoryDetails } from './repositoryDetails'
import { ResponsiveLayout } from './ResponsiveLayout'

export function RepositorySearch() {
  const [query, setQuery] = useUrlState('query', '')
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [performSearch, { data, loading }] = useRepositorySearchLazyQuery()
  const [searchPerformed, setSearchPerformed] = useState(false)
  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    if (trimmedQuery && !loading) {
      setSearchPerformed(true)
      performSearch({
        variables: {
          query: trimmedQuery,
        },
      })
    }
  }
  useEffect(
    () => {
      const trimmedQuery = query.trim()
      if (trimmedQuery) {
        setSearchPerformed(true)
        performSearch({
          variables: {
            query: trimmedQuery,
          },
        })
      }
    },
    // using this as componentOnMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Create the search and list component
  const searchAndResults = (
    <Box>
      <form autoComplete="off" onSubmit={handleSearch}>
        <Box sx={{ p: 2, mb: 3, display: 'flex' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search repositories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ mr: 1 }}
          />
          <IconButton type="submit" aria-label="search" disabled={loading}>
            <SearchIcon />
          </IconButton>
        </Box>
      </form>

      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {data?.searchRepositories && data.searchRepositories.length > 0 ? (
              data.searchRepositories.map((repo) => {
                if (!repo) return null
                return (
                  <RepositoryItem key={repo.id} repo={repo} selectedRepo={selectedRepo} onSelect={setSelectedRepo} />
                )
              })
            ) : searchPerformed ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="text.secondary">No repositories found</Typography>
              </Box>
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="text.secondary">Search for a repository.</Typography>
              </Box>
            )}
          </List>
        )}
      </Paper>
    </Box>
  )

  // Create the details component
  const repositoryDetails = selectedRepo ? (
    <RepositoryDetails {...selectedRepo} isPrivate={!!selectedRepo.private} />
  ) : (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <Typography color="text.secondary">Select a repository to view details</Typography>
    </Box>
  )

  return (
    <ResponsiveLayout
      list={searchAndResults}
      details={repositoryDetails}
      isSelected={!!selectedRepo}
      onClearSelection={() => setSelectedRepo(null)}
      title="Back to search results"
    />
  )
}
