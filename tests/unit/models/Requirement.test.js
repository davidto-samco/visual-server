const {
  formatRequirement,
} = require("../../../src/models/engineering/Requirement");

describe("Requirement Model Formatter", () => {
  describe("formatRequirement", () => {
    it("should format requirement with all fields", () => {
      const req = {
        partId: "PART-001",
        partDescription: "Steel Plate",
        qtyPer: 2.5,
        scrapPercent: 5.0,
      };

      const result = formatRequirement(req);

      expect(result.formattedPart).toBe("PART-001 - Steel Plate");
      expect(result.formattedQty).toBe("Qty: 2.5000");
      expect(result.formattedScrap).toBe("5.00%");
      expect(result.formattedDisplay).toBe(
        "PART-001 - Steel Plate - Qty: 2.5000",
      );
    });

    it("should preserve original properties", () => {
      const req = {
        partId: "PART-001",
        partDescription: "Steel Plate",
        qtyPer: 2.5,
        scrapPercent: 5.0,
        warehouse: "WH01",
      };

      const result = formatRequirement(req);

      expect(result.partId).toBe("PART-001");
      expect(result.warehouse).toBe("WH01");
    });

    it("should handle missing partDescription", () => {
      const req = {
        partId: "PART-002",
        qtyPer: 1.0,
        scrapPercent: 0,
      };

      const result = formatRequirement(req);

      expect(result.formattedPart).toBe("PART-002 - Unknown");
      expect(result.formattedDisplay).toBe("PART-002 - Unknown - Qty: 1.0000");
    });

    it("should handle null qtyPer", () => {
      const req = {
        partId: "PART-003",
        partDescription: "Bolt",
        qtyPer: null,
        scrapPercent: null,
      };

      const result = formatRequirement(req);

      expect(result.formattedQty).toBe("Qty: 0.0000");
      expect(result.formattedScrap).toBe("0.00%");
    });

    it("should handle zero values", () => {
      const req = {
        partId: "PART-004",
        partDescription: "Washer",
        qtyPer: 0,
        scrapPercent: 0,
      };

      const result = formatRequirement(req);

      expect(result.formattedQty).toBe("Qty: 0.0000");
      expect(result.formattedScrap).toBe("0.00%");
    });

    it("should format decimal values correctly", () => {
      const req = {
        partId: "PART-005",
        partDescription: "Wire",
        qtyPer: 0.125,
        scrapPercent: 2.5,
      };

      const result = formatRequirement(req);

      expect(result.formattedQty).toBe("Qty: 0.1250");
      expect(result.formattedScrap).toBe("2.50%");
    });
  });
});
