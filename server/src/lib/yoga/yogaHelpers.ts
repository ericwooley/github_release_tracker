import { MutationResolvers, QueryResolvers } from '../../resolvers-types'

export function mutation<K extends keyof MutationResolvers>(
  mutation: K,
  cb: MutationResolvers[K]
): MutationResolvers[K] {
  return async (arg1, arg2, context, ...args: any[]) => {
    // TODO: start transaction, and rollback on error
    const start = Date.now()
    try {
      const results = await (cb as any)(arg1, arg2, context, ...args)
      const end = Date.now()
      console.warn('\t[mutation]', mutation, 'took', end - start, 'ms')
      return results
    } catch (e: any) {
      console.error('\t[mutation]', mutation, 'error:', e)
     return {
       success: false,
       error: {
         message: mutation + ': Unknown Error',
       },
     }
    }
  }
}

export function query<K extends keyof QueryResolvers>(query: K, cb: NonNullable<QueryResolvers[K]>): QueryResolvers[K] {
  return async (...args: any[]) => {
    const start = Date.now()
    const results = await (cb as any)(...args)
    const end = Date.now()
    console.warn('\t[query]', query, 'took', end - start, 'ms')
    return results
  }
}
