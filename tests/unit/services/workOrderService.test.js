const workOrderService = require("../../../src/services/engineering/workOrderService");
const workOrderRepository = require("../../../src/repositories/engineering/workOrderRepository");
const { ValidationError, NotFoundError } = require("../../../src/utils/errors");

// Mock the repository
jest.mock("../../../src/repositories/engineering/workOrderRepository");

describe("WorkOrderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("searchWorkOrders", () => {
    it("should return paginated work orders", async () => {
      workOrderRepository.countByBaseId.mockResolvedValue(100);
      workOrderRepository.search.mockResolvedValue([
        { baseId: "8113", lotId: "01", subId: "", status: "R", orderQty: 10 },
        { baseId: "8113", lotId: "02", subId: "", status: "R", orderQty: 20 },
      ]);

      const result = await workOrderService.searchWorkOrders("8113", 1, 50);

      expect(result.results).toHaveLength(2);
      expect(result.meta.total).toBe(100);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.totalPages).toBe(2);
    });

    it("should throw ValidationError for empty baseId", async () => {
      await expect(workOrderService.searchWorkOrders("", 1, 50)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should uppercase the search pattern", async () => {
      workOrderRepository.countByBaseId.mockResolvedValue(0);
      workOrderRepository.search.mockResolvedValue([]);

      await workOrderService.searchWorkOrders("abc", 1, 50);

      expect(workOrderRepository.countByBaseId).toHaveBeenCalledWith("ABC");
      expect(workOrderRepository.search).toHaveBeenCalledWith("ABC", 50, 0);
    });

    it("should calculate correct offset for page 2", async () => {
      workOrderRepository.countByBaseId.mockResolvedValue(100);
      workOrderRepository.search.mockResolvedValue([]);

      await workOrderService.searchWorkOrders("8113", 2, 50);

      expect(workOrderRepository.search).toHaveBeenCalledWith("8113", 50, 50);
    });

    it("should format work orders with formatted fields", async () => {
      workOrderRepository.countByBaseId.mockResolvedValue(1);
      workOrderRepository.search.mockResolvedValue([
        { baseId: "8113", lotId: "01", subId: "SUB", status: "R", orderQty: 10 },
      ]);

      const result = await workOrderService.searchWorkOrders("8113", 1, 50);

      expect(result.results[0].formattedId).toBe("8113-SUB/01");
      expect(result.results[0].formattedStatus).toBe("[R]");
    });
  });

  describe("getWorkOrderHeader", () => {
    it("should return work order with counts", async () => {
      workOrderRepository.findByCompositeKey.mockResolvedValue({
        baseId: "8113",
        lotId: "01",
        subId: "",
        status: "R",
        orderQty: 100,
      });
      workOrderRepository.getAggregateCounts.mockResolvedValue({
        operationCount: 5,
        requirementCount: 10,
      });

      const result = await workOrderService.getWorkOrderHeader(
        "8113",
        "01",
        "-",
      );

      expect(result.baseId).toBe("8113");
      expect(result.counts.operationCount).toBe(5);
      expect(result.formattedId).toBeDefined();
    });

    it("should throw NotFoundError when work order not found", async () => {
      workOrderRepository.findByCompositeKey.mockResolvedValue(null);

      await expect(
        workOrderService.getWorkOrderHeader("9999", "01", "-"),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError for missing baseId", async () => {
      await expect(
        workOrderService.getWorkOrderHeader("", "01", "-"),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for missing lotId", async () => {
      await expect(
        workOrderService.getWorkOrderHeader("8113", "", "-"),
      ).rejects.toThrow(ValidationError);
    });

    it('should normalize "-" subId to empty string', async () => {
      workOrderRepository.findByCompositeKey.mockResolvedValue({
        baseId: "8113",
        lotId: "01",
        subId: "",
      });
      workOrderRepository.getAggregateCounts.mockResolvedValue({});

      await workOrderService.getWorkOrderHeader("8113", "01", "-");

      expect(workOrderRepository.findByCompositeKey).toHaveBeenCalledWith(
        "8113",
        "01",
        "",
      );
    });
  });

  describe("getOperations", () => {
    it("should return formatted operations", async () => {
      workOrderRepository.getOperations.mockResolvedValue([
        { sequence: 10, resourceId: "LASER", setupHrs: 1, runHrs: 0.5 },
      ]);

      const result = await workOrderService.getOperations("8113", "01", "-");

      expect(result).toHaveLength(1);
      expect(result[0].formattedSequence).toBe("[10]");
    });

    it("should throw ValidationError for missing baseId", async () => {
      await expect(
        workOrderService.getOperations("", "01", "-"),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getRequirements", () => {
    it("should return formatted requirements", async () => {
      workOrderRepository.getRequirements.mockResolvedValue([
        { partId: "PART-001", partDescription: "Test", qtyPer: 2.5 },
      ]);

      const result = await workOrderService.getRequirements(
        "8113",
        "01",
        "-",
        10,
      );

      expect(result).toHaveLength(1);
      expect(result[0].formattedQty).toBe("Qty: 2.5000");
    });

    it("should throw ValidationError for invalid operation sequence", async () => {
      await expect(
        workOrderService.getRequirements("8113", "01", "-", 0),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for negative operation sequence", async () => {
      await expect(
        workOrderService.getRequirements("8113", "01", "-", -1),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getWipBalance", () => {
    it("should return WIP balance data", async () => {
      const mockWip = { materialCost: 1000, laborCost: 500 };
      workOrderRepository.getWipBalance.mockResolvedValue(mockWip);

      const result = await workOrderService.getWipBalance("8113", "01", "-");

      expect(result).toEqual(mockWip);
    });

    it("should throw ValidationError for missing parameters", async () => {
      await expect(
        workOrderService.getWipBalance("", "01", "-"),
      ).rejects.toThrow(ValidationError);
    });
  });
});
