module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/index.js",
    "!src/database/connection.js",
  ],
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 30,
      lines: 35,
      statements: 35,
    },
  },
  coveragePathIgnorePatterns: [
    "/node_modules/",
    //"/src/repositories/", // Repositories require database for testing
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  verbose: true,
  testTimeout: 10000,
};
