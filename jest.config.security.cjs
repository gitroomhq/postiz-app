/**
 * Standalone Jest config for the Mapped Out security/authorization unit tests.
 *
 * The repo's root jest.config.ts uses @nx/jest's getJestProjects(), but @nx/jest
 * is not installed, so `pnpm test` cannot run. This config runs the pure
 * authorization decision tests with ts-jest (present) and no Nest/Prisma/Nx
 * dependencies, so the security regression suite is runnable today.
 *
 * Run:  npx jest -c jest.config.security.cjs
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/libraries/nestjs-libraries/src/security'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { isolatedModules: true, tsconfig: { esModuleInterop: true, strict: true } },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
