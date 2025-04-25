import { memo } from 'react'
import { Box, Typography, Card, CardContent, Link, Switch, FormControlLabel } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import PublicIcon from '@mui/icons-material/Public'
import { ReleaseDetails } from './releaseDetails'
import { extractRepoFromUrl, useSubscriptions } from '../hooks/userSubscriptions'

interface RepositoryDetailsProps {
  description?: string | null
  name: string
  url: string
  isPrivate: boolean
}

export const RepositoryDetails = memo(function ({ name, description, isPrivate, url }: RepositoryDetailsProps) {
  const { subscribe, unsubscribe, hasSubscription, loading } = useSubscriptions()
  const { owner, repo } = extractRepoFromUrl(url)
  const checked = hasSubscription(owner, repo)
  const handleSubscriptionToggle = () => {
    if (checked) {
      unsubscribe({
        variables: {
          url,
        },
      })
    } else {
      subscribe({
        variables: {
          url,
        },
      })
    }
  }
  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isPrivate ? <LockIcon sx={{ mr: 1 }} /> : <PublicIcon sx={{ mr: 1 }} />}
              <Typography variant="h5" component="div">
                {name}
              </Typography>
            </Box>
            <FormControlLabel
              control={<Switch checked={checked} disabled={loading} onChange={handleSubscriptionToggle} />}
              label="Subscribe to updates"
            />
          </Box>

          <Typography variant="body1" color="text.secondary" paragraph>
            {description || 'No description available'}
          </Typography>

          <Link href={url} target="_blank" rel="noopener noreferrer">
            View Repository
          </Link>
        </CardContent>
      </Card>
      <Box sx={{ mt: 2 }}>
        <ReleaseDetails repositoryUrl={url} />
      </Box>
    </>
  )
})
RepositoryDetails.displayName = 'RepositoryDetails'
