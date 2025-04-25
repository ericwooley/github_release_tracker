import { Suspense } from 'react'
import {
  useRoutes,
} from 'react-router-dom'
import UnauthenticatedLayout from './layouts/UnauthenticatedLayout'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import routes from '~react-pages'
import FullScreenLoading from './components/fullscreenLoading'

function App() {

  return (
    <UnauthenticatedLayout>
      <Suspense fallback={<FullScreenLoading />}>{useRoutes(routes)}</Suspense>
    </UnauthenticatedLayout>
  )
}

export default App
