// postmonster: the upstream config pulled in @nx/jest, which is not installed
// in this repo (nx workspace is gone), so `pnpm test` could not even start.
// Replaced with a plain ts-jest setup wired to the monorepo path aliases.
export default {
  testEnvironment: 'node',
  // imported module chains open redis/temporal sockets the tests never close
  forceExit: true,
  roots: ['<rootDir>/apps', '<rootDir>/libraries'],
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        diagnostics: {
          // upstream tsconfig is strict; tests deal with mock shapes freely
          noImplicitAny: false,
        },
        tsconfig: {
          module: 'commonjs',
          target: 'es2019',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          strict: false,
          noImplicitAny: false,
          strictNullChecks: false,
          strictPropertyInitialization: false,
          skipLibCheck: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    // postmonster: ESM-only dependency pulled in transitively by upload code
    '^file-type$': '<rootDir>/jest.stubs/file-type.js',
    // postmonster: ESM-only dependency pulled in transitively by the provider
    // registry (integration.manager) through users.service -> integration.service
    '^nostr-tools$': '<rootDir>/jest.stubs/nostr-tools.js',
    '^@gitroom/backend/(.*)$': '<rootDir>/apps/backend/src/$1',
    '^@gitroom/frontend/(.*)$': '<rootDir>/apps/frontend/src/$1',
    '^@gitroom/helpers/(.*)$': '<rootDir>/libraries/helpers/src/$1',
    '^@gitroom/nestjs-libraries/(.*)$': '<rootDir>/libraries/nestjs-libraries/src/$1',
    '^@gitroom/react/(.*)$': '<rootDir>/libraries/react-shared-libraries/src/$1',
    '^@gitroom/orchestrator/(.*)$': '<rootDir>/apps/orchestrator/src/$1',
    '^@gitroom/extension/(.*)$': '<rootDir>/apps/extension/src/$1',
    '^@gitroom/plugins/(.*)$': '<rootDir>/libraries/plugins/src/$1',
  },
};
