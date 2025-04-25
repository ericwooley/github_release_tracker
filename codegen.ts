import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'schema.graphql',
  generates: {
    './server/src/resolvers-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
    },
    'web/src/api/api-generated.ts': {
      documents: './web/src/**/*.graphql',
      plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
      config: {
        withHooks: true,
      },
    },
  },
}

export default config
