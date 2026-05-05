import type { Config } from 'jest';

const config: Config = {
  displayName: 'nestjs-libraries',
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@gitroom/nestjs-libraries/(.*)$': '<rootDir>/src/$1',
    '^@gitroom/helpers/(.*)$': '<rootDir>/../../libraries/helpers/src/$1',
    '^@gitroom/backend/(.*)$': '<rootDir>/../../apps/backend/src/$1',
  },
};

export default config;
