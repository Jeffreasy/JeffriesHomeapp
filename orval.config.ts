import { defineConfig } from 'orval';

export default defineConfig({
  homeapp: {
    input: '../JeffriesBackend/backend/docs/swagger.json',
    output: {
      mode: 'tags-split',
      target: 'lib/api/generated',
      schemas: 'lib/api/model',
      client: 'react-query',
      mock: false,
      override: {
        mutator: {
          path: 'lib/orvalMutator.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
