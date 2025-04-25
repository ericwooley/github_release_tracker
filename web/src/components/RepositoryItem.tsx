import { memo } from 'react'
import { Repository } from '../api/api-generated'
import { Box, ListItemButton, ListItemText, Divider } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import PublicIcon from '@mui/icons-material/Public'

interface RepositoryItemProps {
  repo: Repository
  selectedRepo: Repository | null
  onSelect: (repo: Repository) => void
}

export const RepositoryItem = memo(function ({ repo, selectedRepo, onSelect }: RepositoryItemProps) {
  const desc = repo.description ?? 'No description available'
  const truncatedDesc = desc.length > 100 ? desc.slice(0, 97) + '...' : desc

  return (
    <Box key={repo.id}>
      <ListItemButton selected={selectedRepo?.id === repo.id} onClick={() => onSelect(repo)}>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {repo.private ? (
                <LockIcon fontSize="small" sx={{ mr: 1 }} />
              ) : (
                <PublicIcon fontSize="small" sx={{ mr: 1 }} />
              )}
              {repo.name}
            </Box>
          }
          secondary={truncatedDesc}
        />
      </ListItemButton>
      <Divider />
    </Box>
  )
})
RepositoryItem.displayName = 'RepositoryItem'
