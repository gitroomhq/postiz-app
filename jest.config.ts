import type { Config } from 'jest';

// prisma loads the .env file of the repo when it is imported, so a REDIS_URL from
// there (or from a dev shell) reaches the redis module during a test run. A real
// client opens a socket and keeps jest alive, the in memory mock is what the tests
// want, so the value is emptied here: prisma's dotenv never overwrites an existing
// key, empty or not. Workers inherit this environment from this process.
process.env.REDIS_URL = '';

const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  // unit tests sit next to the code they cover: libraries/.../foo.spec.ts
  testMatch: ['<rootDir>/apps/**/*.spec.ts', '<rootDir>/libraries/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.next/', '/coverage/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        // transpile only, pnpm run build is what type checks
        isolatedModules: true,
      },
    ],
  },
  moduleNameMapper: {
    // the optional native canvas binding jsdom looks for is unused in the tests
    '^canvas$': '<rootDir>/jest.canvas.mock.js',
    '^@gitroom/helpers/(.*)$': '<rootDir>/libraries/helpers/src/$1',
    '^@gitroom/nestjs-libraries/(.*)$':
      '<rootDir>/libraries/nestjs-libraries/src/$1',
    '^@gitroom/backend/(.*)$': '<rootDir>/apps/backend/src/$1',
    '^@gitroom/orchestrator/(.*)$': '<rootDir>/apps/orchestrator/src/$1',
  },
};

export default config;
