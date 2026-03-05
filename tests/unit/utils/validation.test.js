const {
  validateRequired,
  validatePagination,
  validateDate,
  calculateOffset,
  calculateTotalPages,
} = require("../../../src/utils/validation");
const { ValidationError } = require("../../../src/utils/errors");

describe("Validation Utilities", () => {
  describe("validateRequired", () => {
    it("should return trimmed value for valid string", () => {
      expect(validateRequired("  hello  ", "field")).toBe("hello");
    });

    it("should throw ValidationError for empty string", () => {
      expect(() => validateRequired("", "field")).toThrow(ValidationError);
      expect(() => validateRequired("", "field")).toThrow("field is required");
    });

    it("should throw ValidationError for whitespace-only string", () => {
      expect(() => validateRequired("   ", "field")).toThrow(ValidationError);
    });

    it("should throw ValidationError for null/undefined", () => {
      expect(() => validateRequired(null, "field")).toThrow(ValidationError);
      expect(() => validateRequired(undefined, "field")).toThrow(
        ValidationError,
      );
    });

    it("should include field name in error message", () => {
      expect(() => validateRequired("", "BASE_ID")).toThrow(
        "BASE_ID is required",
      );
    });
  });

  describe("validatePagination", () => {
    it("should return default values when no params provided", () => {
      const result = validatePagination();
      expect(result).toEqual({ page: 1, limit: 50 });
    });

    it("should parse valid page and limit", () => {
      const result = validatePagination(2, 100);
      expect(result).toEqual({ page: 2, limit: 100 });
    });

    it("should parse string values", () => {
      const result = validatePagination("3", "25");
      expect(result).toEqual({ page: 3, limit: 25 });
    });

    it("should enforce minimum page of 1", () => {
      expect(validatePagination(0, 50)).toEqual({ page: 1, limit: 50 });
      expect(validatePagination(-5, 50)).toEqual({ page: 1, limit: 50 });
    });

    it("should handle zero/negative limit with default", () => {
      // When parseInt returns 0 or NaN, it falls back to default 50
      // then Math.max(1, 50) = 50
      expect(validatePagination(1, 0)).toEqual({ page: 1, limit: 50 });
      // parseInt(-10) = -10, Math.max(1, -10) = 1, Math.min(1000, 1) = 1
      expect(validatePagination(1, -10)).toEqual({ page: 1, limit: 1 });
    });

    it("should enforce maximum limit of 1000", () => {
      expect(validatePagination(1, 2000)).toEqual({ page: 1, limit: 1000 });
      expect(validatePagination(1, 9999)).toEqual({ page: 1, limit: 1000 });
    });

    it("should handle NaN values with defaults", () => {
      expect(validatePagination("abc", "xyz")).toEqual({ page: 1, limit: 50 });
    });
  });

  describe("validateDate", () => {
    it("should return null for empty/falsy input", () => {
      expect(validateDate(null, "startDate")).toBeNull();
      expect(validateDate(undefined, "startDate")).toBeNull();
      expect(validateDate("", "startDate")).toBeNull();
    });

    it("should return Date object for valid date string", () => {
      const result = validateDate("2024-01-15", "startDate");
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      // Use UTC methods to avoid timezone issues
      expect(result.getUTCDate()).toBe(15);
    });

    it("should throw ValidationError for invalid date", () => {
      expect(() => validateDate("not-a-date", "startDate")).toThrow(
        ValidationError,
      );
      expect(() => validateDate("2024-13-45", "startDate")).toThrow(
        "startDate must be a valid date (YYYY-MM-DD)",
      );
    });
  });

  describe("calculateOffset", () => {
    it("should calculate correct offset for page 1", () => {
      expect(calculateOffset(1, 50)).toBe(0);
    });

    it("should calculate correct offset for subsequent pages", () => {
      expect(calculateOffset(2, 50)).toBe(50);
      expect(calculateOffset(3, 50)).toBe(100);
      expect(calculateOffset(5, 20)).toBe(80);
    });
  });

  describe("calculateTotalPages", () => {
    it("should calculate total pages correctly", () => {
      expect(calculateTotalPages(100, 50)).toBe(2);
      expect(calculateTotalPages(101, 50)).toBe(3);
      expect(calculateTotalPages(50, 50)).toBe(1);
    });

    it("should handle zero total", () => {
      expect(calculateTotalPages(0, 50)).toBe(0);
    });

    it("should round up partial pages", () => {
      expect(calculateTotalPages(51, 50)).toBe(2);
      expect(calculateTotalPages(99, 50)).toBe(2);
    });
  });
});
