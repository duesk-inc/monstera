const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  setupFiles: ['<rootDir>/src/test/env.setup.js'],
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '/node_modules/', 
    '/.next/', 
    '/e2e/',
    'src/__tests__/weekly-report/utils/mockDataGenerators.ts',
    'src/__tests__/weekly-report/utils/apiMocks.ts',
    'src/__tests__/weekly-report/types/index.ts',
    'src/__tests__/weekly-report/jest.setup.ts',
    'src/__tests__/weekly-report/utils/index.ts',
    'src/__tests__/weekly-report/utils/testHelpers.tsx',
    'src/__tests__/expense/utils/expenseApiMocks.ts',
    'src/__tests__/expense/utils/expenseMockData.ts',
    'src/__tests__/expense/utils/expenseTestHelpers.tsx',
    'src/__tests__/expense/utils/index.ts',
    'src/__tests__/expense/types/index.ts',
    'src/__tests__/expense/jest.setup.ts',
    'src/__tests__/expense/setup.test.ts'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(@mui|@babel|@tanstack|date-fns|react-error-boundary)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)