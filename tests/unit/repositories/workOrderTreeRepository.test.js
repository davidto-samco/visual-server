const { createDbMock } = require("../../__mocks__/dbMock");

const { getPool } = require("../../../src/database/connection");
const workOrderTreeRepository = require("../../../src/repositories/engineering/workOrderTreeRepository");

describe("workOrderTreeRepository", () => {
  afterEach(() => jest.clearAllMocks());

  describe("getSimplifiedTree()", () => {
    it("returns hierarchical work order tree", async () => {
      const fakeRows = [
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
          parentSubId: null,
          depth: 0,
          sortPath: "000",
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
          parentSubId: "0",
          depth: 1,
          sortPath: "000.001",
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
          parentSubId: "1",
          depth: 2,
          sortPath: "000.001.002",
        },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getSimplifiedTree("WO-001", "1");

      expect(result).toHaveLength(3);
      expect(result[0].subId).toBe("0");
      expect(result[0].depth).toBe(0);
      expect(result[1].parentSubId).toBe("0");
      expect(result[2].depth).toBe(2);
    });

    it("returns single root when no children", async () => {
      const fakeRows = [
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
          parentSubId: null,
          depth: 0,
          sortPath: "000",
        },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getSimplifiedTree("WO-002", "1");

      expect(result).toHaveLength(1);
      expect(result[0].subId).toBe("0");
      expect(result[0].parentSubId).toBeNull();
    });

    it("returns empty array when work order not found", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getSimplifiedTree("NOPE", "1");

      expect(result).toEqual([]);
    });
  });

  describe("getDetailedTree()", () => {
    it("returns tree with work orders, operations, and materials", async () => {
      const fakeRows = [
        {
          nodeType: "WO",
          depth: 0,
          subId: "0",
          partId: "MAIN-ASSY",
          partDescription: "Main Assembly",
          qty: 1,
          status: "R",
          type: "M",
          startDate: new Date("2024-01-01"),
          finishDate: new Date("2024-01-15"),
          opSeq: null,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0000-0000",
        },
        {
          nodeType: "OP",
          depth: 1,
          subId: "0",
          partId: null,
          partDescription: null,
          qty: null,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: "WELD-01",
          resourceDescription: "Welding Station 1",
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0000",
        },
        {
          nodeType: "MAT",
          depth: 2,
          subId: "0",
          partId: "STEEL-PLATE",
          partDescription: "Steel Plate 1/4 inch",
          qty: 5,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: null,
          resourceDescription: null,
          dimensions: "24x48",
          pieceNo: 1,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0001",
        },
        {
          nodeType: "WO",
          depth: 2,
          subId: "1",
          partId: "SUB-ASSY",
          partDescription: "Sub Assembly",
          qty: 2,
          status: "R",
          type: "M",
          startDate: new Date("2024-01-02"),
          finishDate: new Date("2024-01-10"),
          opSeq: null,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: null,
          parentSubId: "0",
          parentOpSeq: 10,
          sortKey: "000.001-0000-0000",
        },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getDetailedTree("WO-001", "1");

      expect(result).toHaveLength(4);

      const woNodes = result.filter((r) => r.nodeType === "WO");
      const opNodes = result.filter((r) => r.nodeType === "OP");
      const matNodes = result.filter((r) => r.nodeType === "MAT");

      expect(woNodes).toHaveLength(2);
      expect(opNodes).toHaveLength(1);
      expect(matNodes).toHaveLength(1);

      expect(opNodes[0].resourceId).toBe("WELD-01");
      expect(matNodes[0].partId).toBe("STEEL-PLATE");
    });

    it("returns empty array when work order not found", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getDetailedTree("NOPE", "1");

      expect(result).toEqual([]);
    });

    it("handles work order with only operations (no materials)", async () => {
      const fakeRows = [
        {
          nodeType: "WO",
          depth: 0,
          subId: "0",
          partId: "SERVICE-WO",
          partDescription: "Service Work Order",
          qty: 1,
          status: "R",
          type: "S",
          startDate: new Date("2024-01-01"),
          finishDate: new Date("2024-01-02"),
          opSeq: null,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0000-0000",
        },
        {
          nodeType: "OP",
          depth: 1,
          subId: "0",
          partId: null,
          partDescription: null,
          qty: null,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: "LABOR-01",
          resourceDescription: "Labor",
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0000",
        },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await workOrderTreeRepository.getDetailedTree("WO-SVC", "1");

      expect(result).toHaveLength(2);
      expect(result[0].nodeType).toBe("WO");
      expect(result[1].nodeType).toBe("OP");
    });
  });
});
