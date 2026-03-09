const { createDbMock } = require("../../__mocks__/dbMock");

const { getPool } = require("../../../src/database/connection");
const workOrderRepository = require("../../../src/repositories/engineering/workOrderRepository");

describe("workOrderRepository", () => {
  afterEach(() => jest.clearAllMocks());

  describe("search()", () => {
    it("returns matching work orders", async () => {
      const fakeRows = [
        {
          baseId: "WO-001",
          lotId: "1",
          subId: "0",
          partId: "PART-001",
          partDescription: "Test Part",
          orderQty: 10,
          status: "R",
          closeDate: null,
          createdDate: new Date("2024-01-01"),
          customerName: "Acme Corp",
        },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.search("WO");

      expect(result).toHaveLength(1);
      expect(result[0].baseId).toBe("WO-001");
    });

    it("returns empty array when no matches", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.search("NOPE");

      expect(result).toEqual([]);
    });
  });

  describe("countByBaseId()", () => {
    it("returns count of matching work orders", async () => {
      const { mockPool } = createDbMock([{ total: 25 }]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.countByBaseId("WO");

      expect(result).toBe(25);
    });
  });

  describe("findByCompositeKey()", () => {
    it("returns work order when found", async () => {
      const fakeRow = {
        baseId: "WO-001",
        lotId: "1",
        subId: "0",
        partId: "PART-001",
        partDescription: "Test Part",
        unitOfMeasure: "EA",
        orderQty: 10,
        type: "M",
        status: "R",
        startDate: new Date("2024-01-01"),
        finishDate: new Date("2024-01-15"),
        closeDate: null,
        createdDate: new Date("2024-01-01"),
        notes: "Test notes",
      };
      const { mockPool } = createDbMock([fakeRow]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.findByCompositeKey("WO-001", "1", "0");

      expect(result).toMatchObject({ baseId: "WO-001", lotId: "1", subId: "0" });
    });

    it("returns null when not found", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.findByCompositeKey("NOPE", "1", "0");

      expect(result).toBeNull();
    });
  });

  describe("getAggregateCounts()", () => {
    it("returns counts for operations, labor tickets, and inventory transactions", async () => {
      const fakeRow = {
        operations: 5,
        laborTickets: 12,
        inventoryTrans: 8,
      };
      const { mockPool } = createDbMock([fakeRow]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.getAggregateCounts("WO-001", "1", "0");

      expect(result).toEqual({ operations: 5, laborTickets: 12, inventoryTrans: 8 });
    });
  });

  describe("getOperations()", () => {
    it("returns operations for work order", async () => {
      const fakeRows = [
        {
          sequence: 10,
          resourceId: "RESOURCE-01",
          operationType: "I",
          setupHrs: 1.0,
          runHrs: 2.5,
          runType: "H",
          status: "R",
          calcStartQty: 10,
          closeDate: null,
          notes: null,
          requirementCount: 3,
        },
        {
          sequence: 20,
          resourceId: "RESOURCE-02",
          operationType: "I",
          setupHrs: 0.5,
          runHrs: 1.0,
          runType: "H",
          status: "R",
          calcStartQty: 10,
          closeDate: null,
          notes: null,
          requirementCount: 2,
        },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.getOperations("WO-001", "1", "0");

      expect(result).toHaveLength(2);
      expect(result[0].sequence).toBe(10);
      expect(result[1].sequence).toBe(20);
    });

    it("returns empty array when no operations", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.getOperations("WO-001", "1", "0");

      expect(result).toEqual([]);
    });
  });

  describe("getRequirements()", () => {
    it("returns requirements for operation", async () => {
      const fakeRows = [
        {
          operationSeqNo: 10,
          partId: "PART-001",
          partDescription: "Component A",
          unitOfMeasure: "EA",
          qtyPer: 2,
          fixedQty: 0,
          scrapPercent: 5,
          pieceNo: 1,
          subordWoSubId: null,
          subordWoStatus: null,
          subordWoQty: null,
          notes: null,
        },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.getRequirements("WO-001", "1", "0", 10);

      expect(result).toHaveLength(1);
      expect(result[0].partId).toBe("PART-001");
    });

    it("returns empty array when no requirements", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.getRequirements("WO-001", "1", "0", 10);

      expect(result).toEqual([]);
    });
  });

  describe("getSubWorkOrders()", () => {
    it("returns work orders and relationships", async () => {
      const workOrderRows = [
        {
          baseId: "WO-001",
          lotId: "1",
          subId: "1",
          partId: "SUB-PART-001",
          partDescription: "Sub Assembly",
          orderQty: 5,
          type: "M",
          status: "R",
          startDate: new Date("2024-01-02"),
          finishDate: new Date("2024-01-10"),
          closeDate: null,
          createDate: new Date("2024-01-01"),
        },
      ];
      const relationshipRows = [{ parentSubId: "0", childSubId: "1" }];

      // Mock pool that returns different results for sequential queries
      const mockQuery = jest
        .fn()
        .mockResolvedValueOnce({ recordset: workOrderRows })
        .mockResolvedValueOnce({ recordset: relationshipRows });
      const mockInput = jest.fn().mockReturnThis();
      const mockRequest = jest.fn().mockReturnValue({
        input: mockInput,
        query: mockQuery,
      });
      const mockPool = { request: mockRequest };
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.getSubWorkOrders("WO-001", "1");

      expect(result.workOrders).toHaveLength(1);
      expect(result.relationships).toHaveLength(1);
      expect(result.workOrders[0].subId).toBe("1");
      expect(result.relationships[0].childSubId).toBe("1");
    });

    it("returns empty arrays when no sub work orders", async () => {
      const mockQuery = jest
        .fn()
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });
      const mockInput = jest.fn().mockReturnThis();
      const mockRequest = jest.fn().mockReturnValue({
        input: mockInput,
        query: mockQuery,
      });
      const mockPool = { request: mockRequest };
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.getSubWorkOrders("WO-001", "1");

      expect(result.workOrders).toEqual([]);
      expect(result.relationships).toEqual([]);
    });
  });

  describe("getWipBalance()", () => {
    it("returns WIP balance when found", async () => {
      const fakeRow = {
        materialCost: 1000,
        laborCost: 500,
        burdenCost: 250,
        totalCost: 1750,
        postingDate: new Date("2024-01-15"),
      };
      const { mockPool } = createDbMock([fakeRow]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.getWipBalance("WO-001", "1", "0");

      expect(result).toMatchObject({ materialCost: 1000, laborCost: 500 });
    });

    it("returns null when no WIP balance", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderRepository.getWipBalance("WO-001", "1", "0");

      expect(result).toBeNull();
    });
  });
});
