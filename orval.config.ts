import { defineConfig } from 'orval';
import { existsSync } from 'node:fs';

const swaggerInput = [
  process.env.BACKEND_SWAGGER_PATH,
  '../JeffriesBackend-render-fix/backend/docs/swagger.json',
  '../JeffriesBackend/backend/docs/swagger.json',
].find((path): path is string => Boolean(path && existsSync(path))) ?? '../JeffriesBackend/backend/docs/swagger.json';

export default defineConfig({
  homeapp: {
    input: swaggerInput,
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
