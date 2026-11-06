// Focused security regression suite, independent of the obsolete Nx Jest setup.
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['**/auth.service.auth.spec.ts', '**/users.auth.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: 'apps/backend/tsconfig.build.json' },
    ],
  },
  moduleNameMapper: {
    '^@gitroom/helpers/(.*)$': '<rootDir>/libraries/helpers/src/$1',
    '^@gitroom/nestjs-libraries/(.*)$':
      '<rootDir>/libraries/nestjs-libraries/src/$1',
    '^@gitroom/backend/(.*)$': '<rootDir>/apps/backend/src/$1',
  },
};
