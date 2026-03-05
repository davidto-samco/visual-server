const request = require("supertest");
const app = require("../../src/app");

describe("Middleware", () => {
  describe("404 Not Found Handler", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(app)
        .get("/api/unknown/route")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
      expect(response.body.error.message).toContain("not found");
    });

    it("should return 404 for unknown POST routes", async () => {
      const response = await request(app)
        .post("/api/nonexistent")
        .send({ data: "test" })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Error Handler", () => {
    // Mock a route that throws an error for testing
    const express = require("express");
    const { ValidationError, NotFoundError } = require("../../src/utils/errors");
    const errorHandler = require("../../src/middleware/errorHandler");

    let testApp;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());

      // Test routes that throw different errors
      testApp.get("/test/validation-error", (req, res, next) => {
        next(new ValidationError("Test validation error"));
      });

      testApp.get("/test/not-found-error", (req, res, next) => {
        next(new NotFoundError("Test Resource"));
      });

      testApp.get("/test/unexpected-error", (req, res, next) => {
        const error = new Error("Unexpected error");
        next(error);
      });

      testApp.use(errorHandler);
    });

    it("should handle ValidationError with 400 status", async () => {
      const response = await request(testApp)
        .get("/test/validation-error")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.message).toBe("Test validation error");
    });

    it("should handle NotFoundError with 404 status", async () => {
      const response = await request(testApp)
        .get("/test/not-found-error")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
      expect(response.body.error.message).toBe("Test Resource not found");
    });

    it("should handle unexpected errors with 500 status", async () => {
      const response = await request(testApp)
        .get("/test/unexpected-error")
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INTERNAL_ERROR");
      expect(response.body.error.message).toBe("An unexpected error occurred");
    });
  });

  describe("JSON Body Parser", () => {
    it("should accept valid JSON body", async () => {
      // Use a mock endpoint to test JSON parsing
      const response = await request(app)
        .post("/api/nonexistent")
        .set("Content-Type", "application/json")
        .send({ test: "data" })
        .expect(404); // Route doesn't exist, but JSON was parsed

      // If we get 404, the JSON was parsed successfully
      expect(response.body.success).toBe(false);
    });
  });

  describe("Security Headers (Helmet)", () => {
    it("should include security headers", async () => {
      const response = await request(app).get("/api/health");

      // Helmet adds various security headers
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBeDefined();
    });
  });

  describe("CORS", () => {
    it("should handle CORS preflight requests", async () => {
      const response = await request(app)
        .options("/api/health")
        .set("Origin", "http://localhost:5173")
        .set("Access-Control-Request-Method", "GET");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });
  });
});
