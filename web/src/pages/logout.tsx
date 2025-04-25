import { useEffect } from 'react'
import FullScreenLoading from '../components/fullscreenLoading'

export default function Logout() {
  useEffect(() => {
    const performLogout = async () => {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          credentials: 'include',
        })
      } catch (error) {
        console.error('Logout failed:', error)
      } finally {
        // Hard refresh to homepage
        window.location.href = '/'
      }
    }

    performLogout()
  }, [])

  return <FullScreenLoading>Logging you out</FullScreenLoading>
}
