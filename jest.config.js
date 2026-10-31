module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/test/mocks/asset.js',
    '^expo-file-system/legacy$': '<rootDir>/test/mocks/expo-file-system.js',
    '^expo-sharing$': '<rootDir>/test/mocks/expo-sharing.js',
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo/.*|expo-.*)',
  ],
};
