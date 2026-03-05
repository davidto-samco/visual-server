const {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  TimeoutError,
} = require("../../../src/utils/errors");

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create error with default values", () => {
      const error = new AppError("Something went wrong");
      expect(error.message).toBe("Something went wrong");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.isOperational).toBe(true);
    });

    it("should create error with custom values", () => {
      const error = new AppError("Custom error", 418, "TEAPOT");
      expect(error.statusCode).toBe(418);
      expect(error.code).toBe("TEAPOT");
    });

    it("should be instance of Error", () => {
      const error = new AppError("test");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it("should have stack trace", () => {
      const error = new AppError("test");
      expect(error.stack).toBeDefined();
    });
  });

  describe("ValidationError", () => {
    it("should create error with correct properties", () => {
      const error = new ValidationError("Invalid input");
      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.isOperational).toBe(true);
    });

    it("should be instance of AppError", () => {
      const error = new ValidationError("test");
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe("NotFoundError", () => {
    it("should create error with resource name in message", () => {
      const error = new NotFoundError("Work Order");
      expect(error.message).toBe("Work Order not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
    });

    it("should format different resource names", () => {
      expect(new NotFoundError("Part").message).toBe("Part not found");
      expect(new NotFoundError("Order 12345").message).toBe(
        "Order 12345 not found",
      );
    });
  });

  describe("DatabaseError", () => {
    it("should create error with correct properties", () => {
      const error = new DatabaseError("Connection failed");
      expect(error.message).toBe("Connection failed");
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe("DATABASE_ERROR");
    });
  });

  describe("TimeoutError", () => {
    it("should create error with default message", () => {
      const error = new TimeoutError();
      expect(error.message).toBe("Request timeout");
      expect(error.statusCode).toBe(408);
      expect(error.code).toBe("TIMEOUT");
    });
  });
});
