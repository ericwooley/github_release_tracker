import { Client, PoolClient } from 'pg'
import { getUserById } from './queries/users.queries'

type Success<T> = [T, null]

type Failure<E> = [null, E]
export async function tryCatch<T, E = Error>(promise: Promise<T>): Promise<Success<T> | Failure<E>> {
  try {
    const data = await promise
    return [data, null]
  } catch (error) {
    return [null, error as E]
  }
}

export async function getAccessKey(userId: string, pgClient: PoolClient | Client) {
  const result = await getUserById.run({ id: userId }, pgClient)
  if (result.length === 0) return ''
  const [{ access_key }] = result
  return access_key ?? ''
}
