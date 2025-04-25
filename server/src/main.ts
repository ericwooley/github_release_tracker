import { getEnv } from './lib/env'
import { buildApp } from './lib/express'
import { getCronQueue } from './lib/queues/cronQueue'
import { getReleaseQueue } from './lib/queues/releaseQueue'
import { getEmailQueue } from './lib/queues/email'
import { buildYoga } from './lib/yoga/yoga'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'

const basicAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization || ''
  const base64Credentials = authHeader.split(' ')[1] || ''
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
  const [username, password] = credentials.split(':')
  const env = getEnv()
  const validUsername = env.BULL_BOARD_USERNAME
  const validPassword = env.BULL_BOARD_PASSWORD
  if (username === validUsername && password === validPassword) {
    return next()
  }
  res.set('WWW-Authenticate', 'Basic realm="Bull Board Admin"')
  return res.status(401).send('Authentication required for Bull Board')
}

function setupBullBoard(app: ReturnType<typeof buildApp>) {
  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath('/admin/queues')
  app.use('/admin/queues', basicAuth)
  createBullBoard({
    queues: [
      new BullMQAdapter(getCronQueue()),
      new BullMQAdapter(getReleaseQueue()),
      new BullMQAdapter(getEmailQueue()),
    ],
    serverAdapter,
  })
  app.use('/admin/queues', serverAdapter.getRouter())
  console.log(
    `Bull Board UI will be available at http://localhost:${
      getEnv().PORT
    }/admin/queues`
  )
  console.log(
    `Username: ${getEnv().BULL_BOARD_USERNAME}, Password: ${
      getEnv().BULL_BOARD_PASSWORD
    }`
  )
}

;(async function main() {
  // Initialize the environment immediately, to trigger an error
  // and exit early if it's a problem.
  getEnv()
  const app = buildApp()
  const yoga = buildYoga()
  setupBullBoard(app)
  app.use(yoga.graphqlEndpoint, yoga)
  app.listen(getEnv().PORT, () => {
    console.log(`Listening on port ${getEnv().PORT}`)
  })
})()
