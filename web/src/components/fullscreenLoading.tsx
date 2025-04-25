import CircularProgress from '@mui/material/CircularProgress'
import { PropsWithChildren } from 'react'

export default function FullScreenLoading(props: PropsWithChildren) {
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
      <div style={{ textAlign: 'center' }}>
        <CircularProgress />
      </div>
      {props.children}
    </div>
  )
}
