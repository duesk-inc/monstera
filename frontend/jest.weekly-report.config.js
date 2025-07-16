const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

// 週報機能専用のJest設定
const weeklyReportJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.weekly-report.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  testMatch: [
    // 新規作成する週報テストのみを対象とする
    '<rootDir>/src/__tests__/weekly-report/**/*.test.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/**/*weekly*/**/*.{js,jsx,ts,tsx}',
    'src/**/*WeeklyReport*/**/*.{js,jsx,ts,tsx}',
    'src/**/*weekly-report*/**/*.{js,jsx,ts,tsx}',
    'src/**/*daily-record*/**/*.{js,jsx,ts,tsx}',
    'src/**/*DailyRecord*/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  verbose: true,
  silent: false,
}

module.exports = createJestConfig(weeklyReportJestConfig)