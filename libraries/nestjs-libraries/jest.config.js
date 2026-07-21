/*
 * Self-contained Jest config for nestjs-libraries.
 *
 * Root jest.config.ts uses @nx/jest getJestProjects(); this config lets us
 * run library unit tests without a full Nx workspace bootstrap:
 *
 *   npx jest --config libraries/nestjs-libraries/jest.config.js
 */
/** @type {import('jest').Config} */
module.exports = {
  displayName: 'nestjs-libraries',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.spec.json' },
    ],
  },
  moduleNameMapper: {
    '^@gitroom/nestjs-libraries/(.*)$': '<rootDir>/src/$1',
    '^@gitroom/helpers/(.*)$': '<rootDir>/../helpers/src/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
