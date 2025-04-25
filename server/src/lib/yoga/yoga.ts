import { readFileSync } from 'node:fs'
import { createYoga, createSchema } from 'graphql-yoga'
import { Resolvers } from '../../resolvers-types'
import { getEnv } from '../env'
import * as mutations from './mutations'
import * as queries from './queries'

export const buildYoga = () => {
  const typeDefs = readFileSync((process.cwd(), getEnv().GRAPHQL_FILE_LOCATION), 'utf8')

  const resolvers: Resolvers = {
    Mutation: mutations,
    Query: queries,
  }
  const schema = createSchema({ typeDefs, resolvers })
  const yoga = createYoga({
    schema,
    context: async ({ req }: any) => {
      return { pgClient: req.pgClient, req, user: req.session?.passport?.user ?? {} }
    },
    graphqlEndpoint: '/graphql',
    landingPage: false,
  })
  return yoga
}
