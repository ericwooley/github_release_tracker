import { Box, Container, Paper, Typography, Button } from '@mui/material'
import GitHubIcon from '@mui/icons-material/GitHub'
import { useGetCurrentUserQuery } from '../api/api-generated'
import FullScreenLoading from '../components/fullscreenLoading'
import { CurrentUserProvider } from '../hooks/useCurrentUser'
const UnauthenticatedLayout = (props: React.PropsWithChildren) => {
  const handleGitHubLogin = () => {
    window.location.href = '/api/auth/github/callback'
  }
  const { data, loading } = useGetCurrentUserQuery()
  if (loading) {
    return <FullScreenLoading />
  }
  if (data?.getCurrentUser?.id) {
    return <CurrentUserProvider>{props.children}</CurrentUserProvider>
  }
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}>
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <img src="/logo.png" alt="Logo" style={{ height: 80, width: 'auto', marginBottom: 16 }} />
            <Typography component="h1" variant="h5">
              Welcome to star tracker!
            </Typography>
          </Box>

          <Button
            fullWidth
            variant="contained"
            startIcon={<GitHubIcon />}
            onClick={handleGitHubLogin}
            sx={{
              mt: 1,
              bgcolor: '#24292e',
              '&:hover': {
                bgcolor: '#1a1e21',
              },
            }}>
            Login with GitHub
          </Button>
        </Paper>
      </Container>
    </Box>
  )
}

export default UnauthenticatedLayout
