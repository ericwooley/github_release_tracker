import z from 'zod'
const envSchema = z.object({
  FRONTEND_URL: z.string().url(),
  EXPRESS_SESSION_SECRET: z.string().min(20),
  PORT: z.coerce.number().default(3000),
  SECURE_COOKIE: z.string().default('true'),
  REDIS_URL: z.string(),
  POSTGRES_URL: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GRAPHQL_FILE_LOCATION: z.string(),
  BULL_BOARD_USERNAME: z.string().default('admin'),
  BULL_BOARD_PASSWORD: z.string().default('password'),
  // Email configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587'),
  SMTP_SECURE: z.string().default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  CRON_SCHEDULE: z.string().default('*/5 * * * *'), // Run every 5 minutes by default
})
let parsedEnv: ReturnType<typeof envSchema.safeParse>['data']
export const getEnv = ({ env = process.env }: { env?: { [key: string]: string | undefined } } = {}) => {
  if (parsedEnv) return parsedEnv
  const result = envSchema.safeParse(env)

  if (!result.success) {
    console.error('Invalid environment')
    console.error(result.error)
    process.exit(1)
  }
  parsedEnv = result.data
  return parsedEnv
}
