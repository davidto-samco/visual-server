const {
  formatWorkOrderId,
  formatWorkOrderStatus,
  formatWorkOrder,
} = require("../../../src/models/engineering/WorkOrder");

describe("WorkOrder Model Formatters", () => {
  describe("formatWorkOrderId", () => {
    it("should format ID with base only", () => {
      const wo = { baseId: "8113" };
      expect(formatWorkOrderId(wo)).toBe("8113");
    });

    it("should format ID with base and lot", () => {
      const wo = { baseId: "8113", lotId: "01" };
      expect(formatWorkOrderId(wo)).toBe("8113/01");
    });

    it("should format ID with base and sub", () => {
      const wo = { baseId: "8113", subId: "SUB" };
      expect(formatWorkOrderId(wo)).toBe("8113-SUB");
    });

    it("should format ID with base, lot, and sub", () => {
      const wo = { baseId: "8113", lotId: "01", subId: "SUB" };
      expect(formatWorkOrderId(wo)).toBe("8113-SUB/01");
    });

    it("should ignore empty string lot", () => {
      const wo = { baseId: "8113", lotId: "", subId: "SUB" };
      expect(formatWorkOrderId(wo)).toBe("8113-SUB");
    });

    it("should ignore whitespace-only lot", () => {
      const wo = { baseId: "8113", lotId: "   ", subId: "SUB" };
      expect(formatWorkOrderId(wo)).toBe("8113-SUB");
    });

    it('should ignore "0" lot', () => {
      const wo = { baseId: "8113", lotId: "0", subId: "SUB" };
      expect(formatWorkOrderId(wo)).toBe("8113-SUB");
    });

    it('should ignore "0" sub', () => {
      const wo = { baseId: "8113", lotId: "01", subId: "0" };
      expect(formatWorkOrderId(wo)).toBe("8113/01");
    });
  });

  describe("formatWorkOrderStatus", () => {
    it("should format Unreleased status", () => {
      expect(formatWorkOrderStatus("U")).toBe("[U]");
    });

    it("should format Firm status", () => {
      expect(formatWorkOrderStatus("F")).toBe("[F]");
    });

    it("should format Released status", () => {
      expect(formatWorkOrderStatus("R")).toBe("[R]");
    });

    it("should format Closed status", () => {
      expect(formatWorkOrderStatus("C")).toBe("[C]");
    });

    it("should format Cancelled status", () => {
      expect(formatWorkOrderStatus("X")).toBe("[X]");
    });

    it("should handle unknown status", () => {
      expect(formatWorkOrderStatus("Z")).toBe("[Z]");
    });

    it("should handle null/undefined status", () => {
      expect(formatWorkOrderStatus(null)).toBe("[U]");
      expect(formatWorkOrderStatus(undefined)).toBe("[U]");
    });
  });

  describe("formatWorkOrder", () => {
    it("should add formatted fields to work order", () => {
      const wo = {
        baseId: "8113",
        lotId: "01",
        subId: "SUB",
        status: "R",
        orderQty: 100.5,
      };

      const result = formatWorkOrder(wo);

      expect(result.formattedId).toBe("8113-SUB/01");
      expect(result.formattedStatus).toBe("[R]");
      expect(result.formattedQty).toBe("100.5000");
    });

    it("should preserve original properties", () => {
      const wo = {
        baseId: "8113",
        lotId: "01",
        partId: "PART123",
        description: "Test Part",
      };

      const result = formatWorkOrder(wo);

      expect(result.baseId).toBe("8113");
      expect(result.partId).toBe("PART123");
      expect(result.description).toBe("Test Part");
    });

    it("should handle null orderQty", () => {
      const wo = { baseId: "8113", orderQty: null };
      const result = formatWorkOrder(wo);
      expect(result.formattedQty).toBe("0.0000");
    });

    it("should handle zero orderQty", () => {
      const wo = { baseId: "8113", orderQty: 0 };
      const result = formatWorkOrder(wo);
      expect(result.formattedQty).toBe("0.0000");
    });
  });
});
