const { createMultiQueryDbMock } = require("../../__mocks__/dbMock");

const { getPool } = require("../../../src/database/connection");
const workOrderTreeRepository = require("../../../src/repositories/engineering/workOrderTreeRepository");

describe("workOrderTreeRepository", () => {
  afterEach(() => jest.clearAllMocks());

  describe("getSimplifiedTree()", () => {
    it("returns workOrders and relationships", async () => {
      // Query 1: workOrders
      const workOrders = [
        {
          subId: "0",
          partId: "MAIN-ASSY",
          partDescription: "Main Assembly",
          orderQty: 1,
          status: "R",
          type: "M",
          startDate: new Date("2024-01-01"),
          finishDate: new Date("2024-01-15"),
          closeDate: null,
        },
        {
          subId: "1",
          partId: "SUB-ASSY-001",
          partDescription: "Sub Assembly 1",
          orderQty: 2,
          status: "R",
          type: "M",
          startDate: new Date("2024-01-02"),
          finishDate: new Date("2024-01-10"),
          closeDate: null,
        },
        {
          subId: "2",
          partId: "SUB-ASSY-002",
          partDescription: "Sub Assembly 2",
          orderQty: 1,
          status: "R",
          type: "M",
          startDate: new Date("2024-01-03"),
          finishDate: new Date("2024-01-08"),
          closeDate: null,
        },
      ];
      // Query 2: relationships
      const relationships = [
        { parentSubId: "0", childSubId: "1", opSeq: 10, pieceNo: 1 },
        { parentSubId: "1", childSubId: "2", opSeq: 10, pieceNo: 1 },
      ];

      const { mockPool } = createMultiQueryDbMock([workOrders, relationships]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getSimplifiedTree("WO-001", "1");

      expect(result.workOrders).toHaveLength(3);
      expect(result.relationships).toHaveLength(2);
      expect(result.workOrders[0].subId).toBe("0");
      expect(result.relationships[0].parentSubId).toBe("0");
      expect(result.relationships[0].childSubId).toBe("1");
    });

    it("returns single root when no children", async () => {
      const workOrders = [
        {
          subId: "0",
          partId: "SINGLE-PART",
          partDescription: "Single Part WO",
          orderQty: 10,
          status: "R",
          type: "M",
          startDate: new Date("2024-01-01"),
          finishDate: new Date("2024-01-05"),
          closeDate: null,
        },
      ];
      const relationships = [];

      const { mockPool } = createMultiQueryDbMock([workOrders, relationships]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getSimplifiedTree("WO-002", "1");

      expect(result.workOrders).toHaveLength(1);
      expect(result.relationships).toHaveLength(0);
      expect(result.workOrders[0].subId).toBe("0");
    });

    it("returns empty arrays when work order not found", async () => {
      const { mockPool } = createMultiQueryDbMock([[], []]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getSimplifiedTree("NOPE", "1");

      expect(result.workOrders).toEqual([]);
      expect(result.relationships).toEqual([]);
    });
  });

  describe("getDetailedTree()", () => {
    it("returns workOrders, relationships, operations, and materials", async () => {
      // Query 1: workOrders
      const workOrders = [
        {
          subId: "0",
          partId: "MAIN-ASSY",
          partDescription: "Main Assembly",
          orderQty: 1,
          status: "R",
          type: "M",
          startDate: new Date("2024-01-01"),
          finishDate: new Date("2024-01-15"),
        },
        {
          subId: "1",
          partId: "SUB-ASSY",
          partDescription: "Sub Assembly",
          orderQty: 2,
          status: "R",
          type: "M",
          startDate: new Date("2024-01-02"),
          finishDate: new Date("2024-01-10"),
        },
      ];
      // Query 2: relationships
      const relationships = [
        { parentSubId: "0", childSubId: "1", opSeq: 10, pieceNo: 1 },
      ];
      // Query 3: operations
      const operations = [
        {
          subId: "0",
          opSeq: 10,
          resourceId: "WELD-01",
          resourceDescription: "Welding Station 1",
          status: "R",
        },
      ];
      // Query 4: materials
      const materials = [
        {
          subId: "0",
          opSeq: 10,
          pieceNo: 1,
          partId: "STEEL-PLATE",
          partDescription: "Steel Plate 1/4 inch",
          qty: 5,
          status: "R",
          dimensions: "24x48",
        },
      ];

      const { mockPool } = createMultiQueryDbMock([
        workOrders,
        relationships,
        operations,
        materials,
      ]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getDetailedTree("WO-001", "1");

      expect(result.workOrders).toHaveLength(2);
      expect(result.relationships).toHaveLength(1);
      expect(result.operations).toHaveLength(1);
      expect(result.materials).toHaveLength(1);

      expect(result.operations[0].resourceId).toBe("WELD-01");
      expect(result.materials[0].partId).toBe("STEEL-PLATE");
    });

    it("returns empty arrays when work order not found", async () => {
      const { mockPool } = createMultiQueryDbMock([[], [], [], []]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getDetailedTree("NOPE", "1");

      expect(result.workOrders).toEqual([]);
      expect(result.relationships).toEqual([]);
      expect(result.operations).toEqual([]);
      expect(result.materials).toEqual([]);
    });

    it("handles work order with only operations (no materials)", async () => {
      const workOrders = [
        {
          subId: "0",
          partId: "SERVICE-WO",
          partDescription: "Service Work Order",
          orderQty: 1,
          status: "R",
          type: "S",
          startDate: new Date("2024-01-01"),
          finishDate: new Date("2024-01-02"),
        },
      ];
      const relationships = [];
      const operations = [
        {
          subId: "0",
          opSeq: 10,
          resourceId: "LABOR-01",
          resourceDescription: "Labor",
          status: "R",
        },
      ];
      const materials = [];

      const { mockPool } = createMultiQueryDbMock([
        workOrders,
        relationships,
        operations,
        materials,
      ]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getDetailedTree("WO-SVC", "1");

      expect(result.workOrders).toHaveLength(1);
      expect(result.operations).toHaveLength(1);
      expect(result.materials).toHaveLength(0);
      expect(result.workOrders[0].partId).toBe("SERVICE-WO");
      expect(result.operations[0].resourceId).toBe("LABOR-01");
    });
  });
});
