export default {
  roots: ['<rootDir>/libraries/nestjs-libraries/src'],
  testMatch: ['**/__tests__/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.base.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@gitroom/backend/(.*)$': '<rootDir>/apps/backend/src/$1',
    '^@gitroom/frontend/(.*)$': '<rootDir>/apps/frontend/src/$1',
    '^@gitroom/helpers/(.*)$': '<rootDir>/libraries/helpers/src/$1',
    '^@gitroom/nestjs-libraries/(.*)$':
      '<rootDir>/libraries/nestjs-libraries/src/$1',
    '^@gitroom/react/(.*)$':
      '<rootDir>/libraries/react-shared-libraries/src/$1',
    '^@gitroom/plugins/(.*)$': '<rootDir>/libraries/plugins/src/$1',
    '^@gitroom/orchestrator/(.*)$': '<rootDir>/apps/orchestrator/src/$1',
    '^@gitroom/extension/(.*)$': '<rootDir>/apps/extension/src/$1',
  },
  testTimeout: 15000,
  detectOpenHandles: true,
  maxWorkers: 1,
  collectCoverageFrom: [
    'libraries/nestjs-libraries/src/integrations/**/*.ts',
    '!libraries/nestjs-libraries/src/integrations/__tests__/**',
    '!libraries/nestjs-libraries/src/integrations/social/mastodon.custom.provider.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
};
