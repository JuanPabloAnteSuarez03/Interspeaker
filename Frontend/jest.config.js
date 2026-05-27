// jest.config.js
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '(.*)/firebase(\\.js)?$': '<rootDir>/__mocks__/firebase.js',
    '^../../services/api$': '<rootDir>/src/services/__mocks__/api.js',
    '^../services/api$': '<rootDir>/src/services/__mocks__/api.js',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.{js,jsx}', '<rootDir>/src/**/*.test.{js,jsx}'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/setupTests.js',
  ],
}