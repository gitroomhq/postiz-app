module.exports = {
  rootDir: require('path').resolve(__dirname, '../..'),
  testEnvironment: 'jsdom',
  testMatch: ['**/calendar.week.test.ts'],
  moduleNameMapper: {
    '^@gitroom/frontend/(.*)$': '<rootDir>/apps/frontend/src/$1',
    '^@gitroom/helpers/(.*)$': '<rootDir>/libraries/helpers/src/$1',
    '^@gitroom/react/(.*)$':
      '<rootDir>/libraries/react-shared-libraries/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          module: 'CommonJS',
          jsx: 'react-jsx',
          esModuleInterop: true,
          experimentalDecorators: true,
        },
        diagnostics: false,
        isolatedModules: true,
      },
    ],
  },
};
