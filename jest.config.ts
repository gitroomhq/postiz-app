export default {
  roots: ['<rootDir>/apps', '<rootDir>/libraries'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx,js,jsx}',
    'libraries/**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
  ],
};
