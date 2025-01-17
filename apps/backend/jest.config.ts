/* eslint-disable */
export default {
  displayName: 'backend',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/backend',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/index.ts',
  ],
  moduleNameMapper: {
    '^@gitroom/backend/(.*)$': '<rootDir>/../../apps/backend/src/$1',
    '^@gitroom/cron/(.*)$': '<rootDir>/../../apps/cron/src/$1',
    '^@gitroom/frontend/(.*)$': '<rootDir>/../../apps/frontend/src/$1',
    '^@gitroom/helpers/(.*)$': '<rootDir>/../../libs/helpers/src/$1',
    '^@gitroom/nestjs-libraries/(.*)$': '<rootDir>/../../libs/nestjs-libraries/src/$1',
    '^@gitroom/react/(.*)$': '<rootDir>/../../libs/react-shared-libraries/src/$1',
    '^@gitroom/plugins/(.*)$': '<rootDir>/../../libs/plugins/src/$1',
    '^@gitroom/workers/(.*)$': '<rootDir>/../../apps/workers/src/$1',
  },
  verbose: true,
  testTimeout: 30000,
};
