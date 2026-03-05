const request = require("supertest");
const app = require("../../src/app");

// Mock the database module
jest.mock("../../src/database", () => ({
  testConnection: jest.fn(),
}));

const { testConnection } = require("../../src/database");

describe("Health Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("healthy");
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.uptime).toBeDefined();
      expect(typeof response.body.data.uptime).toBe("number");
    });

    it("should return valid ISO timestamp", async () => {
      const response = await request(app).get("/api/health").expect(200);

      const timestamp = new Date(response.body.data.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.data.timestamp);
    });
  });

  describe("GET /api/health/db", () => {
    it("should return connected status when database is available", async () => {
      testConnection.mockResolvedValue({
        connected: true,
        responseTime: 15,
      });

      const response = await request(app).get("/api/health/db").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("connected");
      expect(response.body.data.responseTime).toBe("15ms");
    });

    it("should return disconnected status with 503 when database is unavailable", async () => {
      testConnection.mockResolvedValue({
        connected: false,
        responseTime: 0,
      });

      const response = await request(app).get("/api/health/db").expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe("disconnected");
    });
  });
});
