import { getJestProjects } from '@nx/jest';

module.exports = {
  preset: 'ts-jest',  // Usando ts-jest para suportar TypeScript
  testEnvironment: 'node',  // Ambiente de teste para Node.js
  moduleFileExtensions: ['js', 'json', 'ts'],
  testMatch: ['**/tests/**/*.spec.ts', '**/tests/**/*.test.ts'],  // Caminho para os testes
  testPathIgnorePatterns: ['/node_modules/'],  // Ignora a pasta node_modules
  verbose: true,  // Exibe detalhes adicionais ao executar os testes
};