const partService = require("../../../src/services/inventory/partService");
const partRepository = require("../../../src/repositories/inventory/partRepository");
const { ValidationError, NotFoundError } = require("../../../src/utils/errors");

jest.mock("../../../src/repositories/inventory/partRepository");

describe("PartService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("searchPart", () => {
    it("should return paginated part search results", async () => {
      partRepository.countByPartNumber.mockResolvedValue(100);
      partRepository.searchByPartNumber.mockResolvedValue([
        { id: "PART-001", description: "Part One", partType: "Purchased" },
        { id: "PART-002", description: "Part Two", partType: "Manufactured" },
      ]);

      const result = await partService.searchPart("PART", 1, 50);

      expect(result.results).toHaveLength(2);
      expect(result.meta.total).toBe(100);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.totalPages).toBe(2);
    });

    it("should throw ValidationError for empty part number", async () => {
      await expect(partService.searchPart("", 1, 50)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should uppercase the part number", async () => {
      partRepository.countByPartNumber.mockResolvedValue(0);
      partRepository.searchByPartNumber.mockResolvedValue([]);

      await partService.searchPart("part", 1, 50);

      expect(partRepository.countByPartNumber).toHaveBeenCalledWith("PART");
      expect(partRepository.searchByPartNumber).toHaveBeenCalledWith(
        "PART",
        50,
        0,
      );
    });

    it("should calculate correct offset for page 2", async () => {
      partRepository.countByPartNumber.mockResolvedValue(100);
      partRepository.searchByPartNumber.mockResolvedValue([]);

      await partService.searchPart("PART", 2, 50);

      expect(partRepository.searchByPartNumber).toHaveBeenCalledWith(
        "PART",
        50,
        50,
      );
    });

    it("should return empty results when no matches", async () => {
      partRepository.countByPartNumber.mockResolvedValue(0);
      partRepository.searchByPartNumber.mockResolvedValue([]);

      const result = await partService.searchPart("NOPE", 1, 50);

      expect(result.results).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe("getPartById", () => {
    it("should return part when found", async () => {
      const mockPart = {
        id: "PART-001",
        description: "Test Part",
        unitOfMeasure: "EA",
        partType: "Purchased",
        qtyOnHand: 100,
        qtyAvailable: 80,
      };
      partRepository.findById.mockResolvedValue(mockPart);

      const result = await partService.getPartById("part-001");

      expect(result).toEqual(mockPart);
      expect(partRepository.findById).toHaveBeenCalledWith("PART-001");
    });

    it("should throw ValidationError for empty part ID", async () => {
      await expect(partService.getPartById("")).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw NotFoundError when part not found", async () => {
      partRepository.findById.mockResolvedValue(null);

      await expect(partService.getPartById("NOPE-999")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should uppercase part ID", async () => {
      partRepository.findById.mockResolvedValue({ id: "PART-001" });

      await partService.getPartById("part-001");

      expect(partRepository.findById).toHaveBeenCalledWith("PART-001");
    });
  });

  describe("getWhereUsed", () => {
    it("should return paginated where-used records", async () => {
      partRepository.exists.mockResolvedValue(true);
      partRepository.countWhereUsed.mockResolvedValue(25);
      partRepository.getWhereUsed.mockResolvedValue([
        {
          workOrderType: "M",
          baseId: "WO-001",
          lotId: "1",
          seqNo: 10,
          qtyPer: 2,
        },
        {
          workOrderType: "M",
          baseId: "WO-002",
          lotId: "1",
          seqNo: 20,
          qtyPer: 1,
        },
      ]);

      const result = await partService.getWhereUsed("PART-001", 1, 50);

      expect(result.records).toHaveLength(2);
      expect(result.meta.total).toBe(25);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
    });

    it("should throw ValidationError for empty part ID", async () => {
      await expect(partService.getWhereUsed("", 1, 50)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw NotFoundError when part does not exist", async () => {
      partRepository.exists.mockResolvedValue(false);

      await expect(partService.getWhereUsed("NOPE-999", 1, 50)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should uppercase part ID", async () => {
      partRepository.exists.mockResolvedValue(true);
      partRepository.countWhereUsed.mockResolvedValue(0);
      partRepository.getWhereUsed.mockResolvedValue([]);

      await partService.getWhereUsed("part-001", 1, 50);

      expect(partRepository.exists).toHaveBeenCalledWith("PART-001");
      expect(partRepository.countWhereUsed).toHaveBeenCalledWith("PART-001");
    });

    it("should calculate correct offset for pagination", async () => {
      partRepository.exists.mockResolvedValue(true);
      partRepository.countWhereUsed.mockResolvedValue(100);
      partRepository.getWhereUsed.mockResolvedValue([]);

      await partService.getWhereUsed("PART-001", 3, 25);

      expect(partRepository.getWhereUsed).toHaveBeenCalledWith(
        "PART-001",
        25,
        50,
      );
    });

    it("should format where-used records", async () => {
      partRepository.exists.mockResolvedValue(true);
      partRepository.countWhereUsed.mockResolvedValue(1);
      partRepository.getWhereUsed.mockResolvedValue([
        {
          workOrderType: "M",
          baseId: "WO-001",
          lotId: "1",
          subId: "0",
          seqNo: 10,
          qtyPer: 2,
          manufacturedPartId: "ASSY-001",
          manufacturedPartDescription: "Assembly",
        },
      ]);

      const result = await partService.getWhereUsed("PART-001", 1, 50);

      expect(result.records).toHaveLength(1);
      // formatWhereUsed should have been applied
      expect(result.records[0]).toBeDefined();
    });
  });

  describe("getExtendedDescription", () => {
    it("should return extended description when found", async () => {
      partRepository.exists.mockResolvedValue(true);
      partRepository.getExtendedDescription.mockResolvedValue(
        "This is an extended description for the part",
      );

      const result = await partService.getExtendedDescription("PART-001");

      expect(result).toBe("This is an extended description for the part");
    });

    it("should throw ValidationError for empty part ID", async () => {
      await expect(partService.getExtendedDescription("")).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw NotFoundError when part does not exist", async () => {
      partRepository.exists.mockResolvedValue(false);

      await expect(
        partService.getExtendedDescription("NOPE-999"),
      ).rejects.toThrow(NotFoundError);
    });

    it("should uppercase part ID", async () => {
      partRepository.exists.mockResolvedValue(true);
      partRepository.getExtendedDescription.mockResolvedValue(null);

      await partService.getExtendedDescription("part-001");

      expect(partRepository.exists).toHaveBeenCalledWith("PART-001");
      expect(partRepository.getExtendedDescription).toHaveBeenCalledWith(
        "PART-001",
      );
    });

    it("should return null when no extended description exists", async () => {
      partRepository.exists.mockResolvedValue(true);
      partRepository.getExtendedDescription.mockResolvedValue(null);

      const result = await partService.getExtendedDescription("PART-001");

      expect(result).toBeNull();
    });
  });
  describe("getPurchaseHistory", () => {
    it("returns formatted purchase history records", async () => {
      partRepository.exists.mockResolvedValue(true);
      partRepository.getPurchaseHistory.mockResolvedValue([
        {
          orderDate: new Date(Date.UTC(2013, 0, 25)),
          desiredRecvDate: new Date(Date.UTC(2013, 0, 28)),
          promiseDate: null,
          lastReceivedDate: null,
          purchaseOrder: "P13-0429",
          lineNo: 7,
          lineStatus: "A",
          delSched: false,
          vendorId: "KARRIC",
          vendorName: "KARL W. RICHTER",
          orderQty: 4,
          receivedQty: 0,
          currencyId: "CDN",
          currencyName: "CANADIAN DOLLAR",
          unitPrice: 0.04,
          nativeCurrencyId: "CDN",
          nativeCurrencyName: "CANADIAN DOLLAR",
          nativeUnitPrice: 0.04,
          discPercent: 0,
          fixedCost: 0,
          standardUnitCost: 0.04,
        },
      ]);

      const result = await partService.getPurchaseHistory("F0195");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        purchaseOrder: "P13-0429",
        orderDate: "2013-01-25",
        desiredRecvDate: "2013-01-28",
        vendorDisplay: "KARRIC - KARL W. RICHTER",
      });
    });

    it("returns empty array when part has no purchase history", async () => {
      partRepository.exists.mockResolvedValue(true);
      partRepository.getPurchaseHistory.mockResolvedValue([]);

      const result = await partService.getPurchaseHistory("PART-001");

      expect(result).toEqual([]);
    });

    it("throws ValidationError for empty part ID", async () => {
      await expect(partService.getPurchaseHistory("")).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws NotFoundError when part does not exist", async () => {
      partRepository.exists.mockResolvedValue(false);

      await expect(partService.getPurchaseHistory("NOPE-999")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("uppercases the part ID", async () => {
      partRepository.exists.mockResolvedValue(true);
      partRepository.getPurchaseHistory.mockResolvedValue([]);

      await partService.getPurchaseHistory("f0195");

      expect(partRepository.exists).toHaveBeenCalledWith("F0195");
      expect(partRepository.getPurchaseHistory).toHaveBeenCalledWith("F0195");
    });

    it("does not call getPurchaseHistory when part does not exist", async () => {
      partRepository.exists.mockResolvedValue(false);

      await expect(partService.getPurchaseHistory("NOPE")).rejects.toThrow(
        NotFoundError,
      );

      expect(partRepository.getPurchaseHistory).not.toHaveBeenCalled();
    });
  });
});
