import { Box, Breadcrumbs, Typography, IconButton, useMediaQuery, useTheme } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import React from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface ResponsiveLayoutProps {
  list: React.ReactNode
  details: React.ReactNode
  isSelected: boolean
  onClearSelection: () => void
  title?: string
}
const distance = 40
const duration = 0.1
export function ResponsiveLayout({
  list,
  details,
  isSelected,
  onClearSelection,
  title = 'Back to list',
}: ResponsiveLayoutProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))

  // On desktop, show both list and details
  // On mobile, show either list or details based on selection
  return (
    <Box sx={{ overflow: 'hidden' }}>
      {!isMobile ? (
        // Desktop layout - side by side without animation
        <Box sx={{ display: 'flex' }}>
          <Box sx={{ width: '30%', mr: 3 }}>{list}</Box>
          <Box sx={{ width: '70%' }}>{details}</Box>
        </Box>
      ) : (
        // Mobile layout - with animation on transition
        <AnimatePresence mode="wait">
          {isSelected ? (
            <motion.div
              key="details"
              initial={{ x: distance, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: distance, opacity: 0 }}
              transition={{ duration: duration }}>
              <Box sx={{ p: 1, mb: 2 }}>
                <Breadcrumbs aria-label="breadcrumb">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={onClearSelection} size="small" sx={{ mr: 0.5 }}>
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ cursor: 'pointer' }}
                      onClick={onClearSelection}>
                      {title}
                    </Typography>
                  </Box>
                </Breadcrumbs>
              </Box>
              {details}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ x: -distance, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -distance, opacity: 0 }}
              transition={{ duration: duration }}>
              {list}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Box>
  )
}
