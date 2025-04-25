import { useState } from 'react'
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import MenuIcon from '@mui/icons-material/Menu'
import HomeIcon from '@mui/icons-material/Home'
import BookIcon from '@mui/icons-material/Book'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import FullScreenLoading from '../components/fullscreenLoading'
import { useCurrentUser } from '../hooks/useCurrentUser'

const drawerWidth = 240

const MainLayout = (props: React.PropsWithChildren) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const { currentUser, loading } = useCurrentUser()
  if (!currentUser) {
    return (
      <div>
        You do not appear to be logged in, please login <RouterLink to="/">here</RouterLink>
      </div>
    )
  }

  if (loading) {
    return <FullScreenLoading />
  }

  if (!currentUser?.id) {
    window.location.href = '/'
    return null
  }

  const drawerContent = (
    <>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ mb: 2 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 60, width: 'auto' }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Avatar alt="User" src={currentUser.avatar ?? ''} />
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold' }}>
              {currentUser.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              @{currentUser.username}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/">
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/repositories">
            <ListItemIcon>
              <BookIcon />
            </ListItemIcon>
            <ListItemText primary="Repositories" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/logout">
            <ListItemIcon>
              <ExitToAppIcon />
            </ListItemIcon>
            <ListItemText primary="Sign out" />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
            bgcolor: '#24292e',
            boxShadow: 1,
          }}>
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { md: 'none' } }}>
                <MenuIcon />
              </IconButton>
              <Box sx={{ display: 'flex', justifyContent: 'center', flexGrow: 1 }}>
                <img src="/logo.png" alt="Logo" style={{ height: 40, width: 'auto' }} />
              </Box>
            </Box>
          </Toolbar>
        </AppBar>
      )}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={!isMobile || mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              bgcolor: 'background.paper',
            },
          }}>
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          maxWidth: '100vw',
          p: 2,
          background: 'rgb(252, 252, 252)',
        }}>
        {isMobile && <Toolbar />}
        {props.children}
      </Box>
    </Box>
  )
}

export default MainLayout
