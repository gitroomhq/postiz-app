module.exports = {
  displayName: 'linkedin-page',
  testEnvironment: 'node',
  roots: ['<rootDir>/libraries/nestjs-libraries/src/integrations/social'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.base.json',
        isolatedModules: true,
        diagnostics: false,
      },
    ],
  },
  moduleNameMapper: {
    '^@gitroom/nestjs-libraries/(.*)$':
      '<rootDir>/libraries/nestjs-libraries/src/$1',
    '^@gitroom/helpers/(.*)$': '<rootDir>/libraries/helpers/src/$1',
    '^@gitroom/(.*)$': '<rootDir>/$1',
  },
};
