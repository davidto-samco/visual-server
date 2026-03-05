// Test setup file
// Jest will automatically run this before tests

// Set test environment
process.env.NODE_ENV = "test";
process.env.API_PREFIX = "/api";

// Mock logger to prevent console output during tests
jest.mock("../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));
