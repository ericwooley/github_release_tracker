import { memo, useState } from 'react'
import { useReleaseDetailsQuery } from '../api/api-generated'
import {
  Box,
  Typography,
  List,
  ListItem,
  Chip,
  Switch,
  FormControlLabel,
  Paper,
  Link,
  CircularProgress,
} from '@mui/material'
import { format } from 'date-fns'
import Markdown from 'react-markdown'
export const ReleaseDetails = memo(function ({
  repositoryUrl,
  markViewed = false,
}: {
  repositoryUrl: string
  markViewed?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFetchWithMarkViewed?: () => any
}) {
  const [showPrereleases, setShowPrereleases] = useState(false)
  const { data, loading } = useReleaseDetailsQuery({
    variables: {
      url: repositoryUrl,
      includePrereleases: showPrereleases,
      markViewed,
    },
  })

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )

  const releases = data?.listReleases || []
  const filteredReleases = showPrereleases ? releases : releases.filter((release) => !release.prerelease)

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Releases</Typography>
        <FormControlLabel
          control={<Switch checked={showPrereleases} onChange={(e) => setShowPrereleases(e.target.checked)} />}
          label="Show prereleases"
        />
      </Box>

      {filteredReleases.length === 0 ? (
        <Typography color="text.secondary">No releases found</Typography>
      ) : (
        <List>
          {filteredReleases.map((release, index) => (
            <ListItem
              key={release.id}
              divider={index !== filteredReleases.length - 1}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                pt: index === 0 ? 0 : 2,
                pb: index === filteredReleases.length - 1 ? 0 : 2,
              }}>
              <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  <Link target="_blank" href={release.url}>
                    {release.name || release.tagName}
                  </Link>
                </Typography>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(release.createdAt), 'MMM d, yyyy')}
                  </Typography>
                  <Chip
                    label={release.prerelease ? 'Pre-release' : 'Release'}
                    size="small"
                    color={release.prerelease ? 'warning' : 'info'}
                    sx={{ ml: 1, width: 100 }}
                  />
                </Box>
              </Box>

              {release.body ? <Markdown>{release.body}</Markdown> : null}
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  )
})
ReleaseDetails.displayName = 'ReleaseDetails'
