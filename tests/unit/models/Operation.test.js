const {
  formatOperation,
} = require("../../../src/models/engineering/Operation");

describe("Operation Model Formatter", () => {
  describe("formatOperation", () => {
    it("should format operation with all fields", () => {
      const op = {
        sequence: 10,
        resourceId: "LASER01",
        operationType: "CUT",
        setupHrs: 1.5,
        runHrs: 0.25,
        runType: "HRS/PC",
      };

      const result = formatOperation(op);

      expect(result.formattedSequence).toBe("[10]");
      expect(result.formattedDescription).toBe("[10] LASER01 - CUT");
      expect(result.formattedHours).toBe("S/U 1.50 Hrs, 0.25 HRS/PC");
    });

    it("should preserve original properties", () => {
      const op = {
        sequence: 10,
        resourceId: "LASER01",
        workCenterId: "WC01",
      };

      const result = formatOperation(op);

      expect(result.sequence).toBe(10);
      expect(result.resourceId).toBe("LASER01");
      expect(result.workCenterId).toBe("WC01");
    });

    it("should handle missing resourceId", () => {
      const op = {
        sequence: 20,
        operationType: "WELD",
        setupHrs: 0.5,
        runHrs: 1.0,
      };

      const result = formatOperation(op);

      expect(result.formattedDescription).toBe("[20]  - WELD");
    });

    it("should handle missing operationType", () => {
      const op = {
        sequence: 30,
        resourceId: "MACHINE01",
        setupHrs: 0,
        runHrs: 0,
      };

      const result = formatOperation(op);

      expect(result.formattedDescription).toBe("[30] MACHINE01 - No Type");
    });

    it("should handle null hours", () => {
      const op = {
        sequence: 10,
        setupHrs: null,
        runHrs: null,
        runType: null,
      };

      const result = formatOperation(op);

      expect(result.formattedHours).toBe("S/U 0.00 Hrs, 0.00 HRS/PC");
    });

    it("should format decimal hours correctly", () => {
      const op = {
        sequence: 10,
        setupHrs: 2.333,
        runHrs: 0.167,
        runType: "MIN/PC",
      };

      const result = formatOperation(op);

      expect(result.formattedHours).toBe("S/U 2.33 Hrs, 0.17 MIN/PC");
    });
  });
});
