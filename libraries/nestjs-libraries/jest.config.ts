/*
 * Self-contained Jest config for the nestjs-libraries library.
 *
 * The repo's root jest.config.ts uses @nx/jest's getJestProjects(), but neither
 * `nx` nor `@nx/jest` is installed, so the root config cannot load and
 * `pnpm test` discovers nothing. Until Nx is wired up, run this project's tests
 * directly:
 *
 *   npx jest --config libraries/nestjs-libraries/jest.config.ts
 */
export default {
  displayName: 'nestjs-libraries',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^@gitroom/nestjs-libraries/(.*)$': '<rootDir>/src/$1',
    '^@gitroom/helpers/(.*)$': '<rootDir>/../helpers/src/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
