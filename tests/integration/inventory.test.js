const request = require("supertest");
const app = require("../../src/app");

// Mock the service
jest.mock("../../src/services/inventory/partService");

const partService = require("../../src/services/inventory/partService");

describe("Inventory Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/inventory/parts/search", () => {
    it("should return parts matching search pattern", async () => {
      const mockResults = {
        results: [
          {
            partId: "PART-001",
            description: "Steel Plate",
          },
        ],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };

      partService.searchPart.mockResolvedValue(mockResults);

      const response = await request(app)
        .get("/api/inventory/parts/search")
        .query({ partNumber: "PART" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].partId).toBe("PART-001");
      expect(response.body.meta.total).toBe(1);
    });

    it("should return 400 for missing partNumber", async () => {
      const { ValidationError } = require("../../src/utils/errors");
      partService.searchPart.mockRejectedValue(
        new ValidationError("Part number is required"),
      );

      const response = await request(app)
        .get("/api/inventory/parts/search")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should pass pagination parameters", async () => {
      partService.searchPart.mockResolvedValue({
        results: [],
        meta: { total: 0, page: 3, limit: 20, totalPages: 0 },
      });

      await request(app)
        .get("/api/inventory/parts/search")
        .query({ partNumber: "PART", page: 3, limit: 20 })
        .expect(200);

      expect(partService.searchPart).toHaveBeenCalledWith("PART", "3", "20");
    });
  });

  describe("GET /api/inventory/parts/:partId", () => {
    it("should return part details", async () => {
      const mockPart = {
        partId: "PART-001",
        description: "Steel Plate",
        unitOfMeasure: "EA",
        productCode: "RAW",
      };

      partService.getPartById.mockResolvedValue(mockPart);

      const response = await request(app)
        .get("/api/inventory/parts/PART-001")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.partId).toBe("PART-001");
      expect(response.body.data.description).toBe("Steel Plate");
    });

    it("should return 404 for non-existent part", async () => {
      const { NotFoundError } = require("../../src/utils/errors");
      partService.getPartById.mockRejectedValue(
        new NotFoundError("Part UNKNOWN"),
      );

      const response = await request(app)
        .get("/api/inventory/parts/UNKNOWN")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/inventory/parts/:partId/where-used", () => {
    it("should return where-used records", async () => {
      const mockWhereUsed = {
        records: [
          {
            parentPartId: "ASSEMBLY-001",
            parentDescription: "Main Assembly",
            qtyPer: 2.0,
          },
        ],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };

      partService.getWhereUsed.mockResolvedValue(mockWhereUsed);

      const response = await request(app)
        .get("/api/inventory/parts/PART-001/where-used")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].parentPartId).toBe("ASSEMBLY-001");
    });

    it("should return empty array when no where-used records", async () => {
      partService.getWhereUsed.mockResolvedValue({
        records: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });

      const response = await request(app)
        .get("/api/inventory/parts/PART-001/where-used")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe("GET /api/inventory/parts/:partId/extended-description", () => {
    it("should return extended description", async () => {
      partService.getExtendedDescription.mockResolvedValue(
        "This is a detailed description of the part.\nLine 2 of description.",
      );

      const response = await request(app)
        .get("/api/inventory/parts/PART-001/extended-description")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.extendedDescription).toContain(
        "detailed description",
      );
    });

    it("should return empty string when no extended description", async () => {
      partService.getExtendedDescription.mockResolvedValue("");

      const response = await request(app)
        .get("/api/inventory/parts/PART-001/extended-description")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.extendedDescription).toBe("");
    });
  });
  describe("GET /api/inventory/parts/:partId/purchase-history", () => {
    it("should return purchase history records", async () => {
      const mockRecords = [
        {
          orderDate: "2013-01-25",
          desiredRecvDate: "2013-01-28",
          promiseDate: null,
          lastReceivedDate: null,
          purchaseOrder: "P13-0429",
          lineNo: 7,
          lineStatus: "A",
          delSched: false,
          vendorId: "KARRIC",
          vendorName: "KARL W. RICHTER",
          vendorDisplay: "KARRIC - KARL W. RICHTER",
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
      ];
      partService.getPurchaseHistory.mockResolvedValue(mockRecords);

      const response = await request(app)
        .get("/api/inventory/parts/F0195/purchase-history")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].purchaseOrder).toBe("P13-0429");
      expect(response.body.data[0].vendorDisplay).toBe(
        "KARRIC - KARL W. RICHTER",
      );
    });

    it("should return empty array when part has no purchase history", async () => {
      partService.getPurchaseHistory.mockResolvedValue([]);

      const response = await request(app)
        .get("/api/inventory/parts/PART-001/purchase-history")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it("should return 404 for non-existent part", async () => {
      const { NotFoundError } = require("../../src/utils/errors");
      partService.getPurchaseHistory.mockRejectedValue(
        new NotFoundError("Part UNKNOWN"),
      );

      const response = await request(app)
        .get("/api/inventory/parts/UNKNOWN/purchase-history")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should pass partId from URL to service", async () => {
      partService.getPurchaseHistory.mockResolvedValue([]);

      await request(app)
        .get("/api/inventory/parts/F0195/purchase-history")
        .expect(200);

      expect(partService.getPurchaseHistory).toHaveBeenCalledWith("F0195");
    });

    it("should return data without meta (not paginated)", async () => {
      partService.getPurchaseHistory.mockResolvedValue([]);

      const response = await request(app)
        .get("/api/inventory/parts/PART-001/purchase-history")
        .expect(200);

      expect(response.body.meta).toBeUndefined();
    });
  });
});
