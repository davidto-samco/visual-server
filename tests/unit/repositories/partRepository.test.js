const { createDbMock } = require("../../__mocks__/dbMock");

const { getPool } = require("../../../src/database/connection");
const partRepository = require("../../../src/repositories/inventory/partRepository");

describe("partRepository", () => {
  afterEach(() => jest.clearAllMocks());

  describe("findById()", () => {
    it("returns part when found", async () => {
      const fakeRow = {
        id: "PART-001",
        description: "Test Part",
        unitOfMeasure: "EA",
        purchased: "Y",
        fabricated: "N",
        partType: "Purchased",
        commodityCode: "STEEL",
        drawingNumber: "DWG-001",
        drawingRevision: "A",
        unitMaterialCost: 10.5,
        unitLaborCost: 5.0,
        unitBurdenCost: 2.0,
        unitServiceCost: 1.0,
        totalUnitCost: 18.5,
        qtyOnHand: 100,
        qtyAvailable: 80,
      };
      const { mockPool } = createDbMock([fakeRow]);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.findById("PART-001");

      expect(result).toMatchObject({ id: "PART-001", description: "Test Part" });
    });

    it("returns null when not found", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.findById("NOPE");

      expect(result).toBeNull();
    });
  });

  describe("exists()", () => {
    it("returns true when part exists", async () => {
      const { mockPool } = createDbMock([{ exists: 1 }]);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.exists("PART-001");

      expect(result).toBe(true);
    });

    it("returns false when part does not exist", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.exists("NOPE");

      expect(result).toBe(false);
    });
  });

  describe("searchByPartNumber()", () => {
    it("returns matching parts", async () => {
      const fakeRows = [
        { id: "PART-001", description: "Part 1", unitOfMeasure: "EA", partType: "Purchased" },
        { id: "PART-002", description: "Part 2", unitOfMeasure: "EA", partType: "Manufactured" },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.searchByPartNumber("PART");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("PART-001");
    });

    it("returns empty array when no matches", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.searchByPartNumber("NOPE");

      expect(result).toEqual([]);
    });
  });

  describe("countByPartNumber()", () => {
    it("returns count of matching parts", async () => {
      const { mockPool } = createDbMock([{ total: 15 }]);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.countByPartNumber("PART");

      expect(result).toBe(15);
    });
  });

  describe("getWhereUsed()", () => {
    it("returns where-used records", async () => {
      const fakeRows = [
        {
          workOrderType: "M",
          baseId: "WO-001",
          lotId: "1",
          subId: "0",
          manufacturedPartId: "WO-001",
          manufacturedPartDescription: "Assembly",
          seqNo: 10,
          pieceNo: 1,
          qtyPer: 2,
          scrapPercent: 0,
          fixedQty: 0,
          unitOfMeasure: "EA",
        },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.getWhereUsed("PART-001", 50, 0);

      expect(result).toHaveLength(1);
      expect(result[0].baseId).toBe("WO-001");
    });

    it("returns empty array when not used anywhere", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.getWhereUsed("UNUSED-PART", 50, 0);

      expect(result).toEqual([]);
    });
  });

  describe("countWhereUsed()", () => {
    it("returns count of where-used records", async () => {
      const { mockPool } = createDbMock([{ total: 5 }]);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.countWhereUsed("PART-001");

      expect(result).toBe(5);
    });
  });

  describe("getExtendedDescription()", () => {
    it("returns extended description when found", async () => {
      const { mockPool } = createDbMock([{ extendedDescription: "Long description text" }]);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.getExtendedDescription("PART-001");

      expect(result).toBe("Long description text");
    });

    it("returns null when no extended description", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await partRepository.getExtendedDescription("PART-001");

      expect(result).toBeNull();
    });
  });
});
