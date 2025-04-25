import {
  Box,
  Paper,
  List,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from '@mui/material'
import { useSubscriptions } from '../hooks/userSubscriptions/useSubscriptionsHook'
import { ReleaseDetails } from './releaseDetails'
import SearchOffIcon from '@mui/icons-material/SearchOff'
import DeleteIcon from '@mui/icons-material/Delete'
import useUrlState from '../hooks/urlState'
import { ResponsiveLayout } from './ResponsiveLayout'
import React, { useEffect, useState } from 'react'

export function Dashboard() {
  const { unsubscribe, subscriptions, loading } = useSubscriptions()
  const [selectedSubscriptionFromUrl, setSelectedSubscription] = useUrlState('selected-repo', '')
  const [overrides, setOvverides] = useState({} as { [key: string]: boolean })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null)

  useEffect(() => {
    setOvverides((oldVal) => ({ ...oldVal, [selectedSubscriptionFromUrl]: false }))
  }, [selectedSubscriptionFromUrl])
  const selectedSubscription = subscriptions.find((item) => item.id === selectedSubscriptionFromUrl)

  const handleDeleteClick = (subscriptionId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent selecting the subscription when clicking delete
    setSubscriptionToDelete(subscriptionId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (subscriptionToDelete) {
      const subscription = subscriptions.find((item) => item.id === subscriptionToDelete)
      if (subscription) {
        await unsubscribe({
          variables: {
            url: `github.com/${subscription.owner}/${subscription.repo}`,
          },
        })

        // If the deleted subscription was selected, clear the selection
        if (subscriptionToDelete === selectedSubscriptionFromUrl) {
          setSelectedSubscription('')
        }
      }
    }
    setDeleteDialogOpen(false)
    setSubscriptionToDelete(null)
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setSubscriptionToDelete(null)
  }

  // Create the list component
  const subscriptionsList = (
    <Paper>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Typography>Loading subscriptions...</Typography>
        </Box>
      ) : (
        <List>
          {subscriptions.length > 0 ? (
            subscriptions.map((subscription) => (
              <SubscriptionItem
                key={subscription.id}
                hasUpdated={overrides[subscription.id] ?? subscription.hasUpdated}
                id={subscription.id}
                owner={subscription.owner}
                repo={subscription.repo}
                isSelected={Boolean(selectedSubscriptionFromUrl && selectedSubscriptionFromUrl === subscription.id)}
                onSelect={(id) => setSelectedSubscription(id)}
                onDelete={handleDeleteClick}
              />
            ))
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">No subscriptions found</Typography>
            </Box>
          )}
        </List>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Unsubscribe from repository?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to unsubscribe from this repository? You will no longer receive updates.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">
            Unsubscribe
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )

  // Create the details component
  const subscriptionDetails = selectedSubscription ? (
    <ReleaseDetails
      repositoryUrl={['github.com', selectedSubscription?.owner, selectedSubscription?.repo].join('/')}
      markViewed
    />
  ) : (
    <Paper
      sx={{
        p: 4,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
        <Typography variant="h5" gutterBottom>
          No repository selected
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Select a repository from the list to view its release details and updates.
        </Typography>
        <Box sx={{ opacity: 0.7, mt: 2 }}>
          <SearchOffIcon sx={{ fontSize: 100, color: 'text.disabled' }} />
        </Box>
      </Box>
    </Paper>
  )

  return (
    <Box>
      <Typography variant="h4" sx={{ p: 2, mb: 3 }}>
        Your Repository Subscriptions
      </Typography>

      <ResponsiveLayout
        list={subscriptionsList}
        details={subscriptionDetails}
        isSelected={!!selectedSubscription}
        onClearSelection={() => setSelectedSubscription('')}
        title="Back to subscriptions"
      />
    </Box>
  )
}

interface SubscriptionItemProps {
  isSelected: boolean
  id: string
  owner: string
  repo: string
  onSelect: (subscription: string) => void
  onDelete: (subscription: string, event: React.MouseEvent) => void
  hasUpdated: boolean
}

const SubscriptionItem = React.memo(
  ({ id, isSelected, onSelect, onDelete, hasUpdated, owner, repo }: SubscriptionItemProps) => {
    return (
      <Box>
        <Box
          sx={{
            p: 2,
            cursor: 'pointer',
            bgcolor: isSelected ? 'action.selected' : 'background.paper',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => onSelect(id)}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={isSelected ? 'bold' : 'normal'}>
              {owner}/{repo}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {hasUpdated && <Chip label="Updated" color="primary" size="small" sx={{ mr: 1 }} />}
              <IconButton size="small" onClick={(e) => onDelete(id, e)} aria-label="delete subscription">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    )
  }
)
SubscriptionItem.displayName = 'SubscriptionItem'
