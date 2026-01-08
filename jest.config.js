module.exports = {
  // Use multiple projects to handle different environments
  projects: [
    {
      displayName: 'backend',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/backend/**/__tests__/**/*.(ts|js)',
        '<rootDir>/backend/**/*.(test|spec).(ts|js)',
      ],
      extensionsToTreatAsEsm: ['.ts'],
      transform: {
        '^.+\\.(ts)$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: {
              module: 'ESNext',
              target: 'ES2020',
              moduleResolution: 'node',
              allowSyntheticDefaultImports: true,
              esModuleInterop: true,
            },
          },
        ],
      },
      collectCoverageFrom: [
        'backend/src/**/*.{ts,js}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**',
        '!**/__tests__/**',
      ],
    },
    {
      displayName: 'frontend',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/frontend/**/__tests__/**/*.(ts|tsx)',
        '<rootDir>/frontend/**/*.(test|spec).(ts|tsx)',
      ],
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      transform: {
        '^.+\\.(ts|tsx)$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: {
              jsx: 'react-jsx',
              module: 'ESNext',
              target: 'ES2020',
              moduleResolution: 'node',
              allowSyntheticDefaultImports: true,
              esModuleInterop: true,
            },
          },
        ],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          'jest-transform-stub',
      },
      collectCoverageFrom: [
        'frontend/src/**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**',
        '!**/__tests__/**',
      ],
    },
  ],

  // Global settings
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 15000,

  // Module resolution for backend and frontend
  moduleDirectories: [
    'node_modules',
    '<rootDir>/backend/src',
    '<rootDir>/frontend/src',
  ],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Coverage reporting
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
};
