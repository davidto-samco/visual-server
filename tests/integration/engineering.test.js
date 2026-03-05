const request = require("supertest");
const app = require("../../src/app");

// Mock the services
jest.mock("../../src/services/engineering/workOrderService");
jest.mock("../../src/services/engineering/workOrderTreeService");

const workOrderService = require("../../src/services/engineering/workOrderService");
const workOrderTreeService = require("../../src/services/engineering/workOrderTreeService");

describe("Engineering Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/engineering/work-orders/search", () => {
    it("should return work orders matching search pattern", async () => {
      const mockResults = {
        results: [
          {
            baseId: "8113",
            lotId: "01",
            subId: "",
            formattedId: "8113/01",
          },
        ],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };

      workOrderService.searchWorkOrders.mockResolvedValue(mockResults);

      const response = await request(app)
        .get("/api/engineering/work-orders/search")
        .query({ baseId: "8113" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].baseId).toBe("8113");
      expect(response.body.meta.total).toBe(1);
    });

    it("should return 400 for missing baseId parameter", async () => {
      const { ValidationError } = require("../../src/utils/errors");
      workOrderService.searchWorkOrders.mockRejectedValue(
        new ValidationError("BASE_ID pattern is required"),
      );

      const response = await request(app)
        .get("/api/engineering/work-orders/search")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should pass pagination parameters to service", async () => {
      workOrderService.searchWorkOrders.mockResolvedValue({
        results: [],
        meta: { total: 0, page: 2, limit: 25, totalPages: 0 },
      });

      await request(app)
        .get("/api/engineering/work-orders/search")
        .query({ baseId: "8113", page: 2, limit: 25 })
        .expect(200);

      expect(workOrderService.searchWorkOrders).toHaveBeenCalledWith(
        "8113",
        "2",
        "25",
      );
    });
  });

  describe("GET /api/engineering/work-orders/:baseId/:lotId/:subId", () => {
    it("should return work order header", async () => {
      const mockWorkOrder = {
        baseId: "8113",
        lotId: "01",
        subId: "",
        partId: "PART-001",
        description: "Test Part",
        formattedId: "8113/01",
        formattedStatus: "[R]",
        counts: { operations: 5, requirements: 10 },
      };

      workOrderService.getWorkOrderHeader.mockResolvedValue(mockWorkOrder);

      const response = await request(app)
        .get("/api/engineering/work-orders/8113/01/-")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.baseId).toBe("8113");
      expect(response.body.data.counts.operations).toBe(5);
    });

    it("should return 404 for non-existent work order", async () => {
      const { NotFoundError } = require("../../src/utils/errors");
      workOrderService.getWorkOrderHeader.mockRejectedValue(
        new NotFoundError("Work Order 9999/01"),
      );

      const response = await request(app)
        .get("/api/engineering/work-orders/9999/01/-")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/engineering/work-orders/:baseId/:lotId/:subId/operations", () => {
    it("should return operations list", async () => {
      const mockOperations = [
        {
          sequence: 10,
          resourceId: "LASER01",
          formattedSequence: "[10]",
        },
        {
          sequence: 20,
          resourceId: "WELD01",
          formattedSequence: "[20]",
        },
      ];

      workOrderService.getOperations.mockResolvedValue(mockOperations);

      const response = await request(app)
        .get("/api/engineering/work-orders/8113/01/-/operations")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].sequence).toBe(10);
    });
  });

  describe("GET /api/engineering/work-orders/:baseId/:lotId/:subId/operations/:sequence/requirements", () => {
    it("should return requirements for operation", async () => {
      const mockRequirements = [
        {
          partId: "PART-001",
          partDescription: "Steel Plate",
          qtyPer: 2.5,
        },
      ];

      workOrderService.getRequirements.mockResolvedValue(mockRequirements);

      const response = await request(app)
        .get("/api/engineering/work-orders/8113/01/-/operations/10/requirements")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].partId).toBe("PART-001");
    });

    it("should return 400 for invalid operation sequence", async () => {
      const { ValidationError } = require("../../src/utils/errors");
      workOrderService.getRequirements.mockRejectedValue(
        new ValidationError("Operation sequence required"),
      );

      const response = await request(app)
        .get("/api/engineering/work-orders/8113/01/-/operations/0/requirements")
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/engineering/work-orders/:baseId/:lotId/:subId/sub-work-orders", () => {
    it("should return sub work orders", async () => {
      const mockSubWorkOrders = [
        {
          baseId: "8113",
          lotId: "01",
          subId: "SUB1",
          depth: 1,
        },
      ];

      workOrderService.getSubWorkOrders.mockResolvedValue(mockSubWorkOrders);

      const response = await request(app)
        .get("/api/engineering/work-orders/8113/01/-/sub-work-orders")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/engineering/work-orders/:baseId/:lotId/:subId/wip-balance", () => {
    it("should return WIP balance", async () => {
      const mockWipBalance = {
        materialCost: 1000.5,
        laborCost: 500.25,
        overheadCost: 200.0,
      };

      workOrderService.getWipBalance.mockResolvedValue(mockWipBalance);

      const response = await request(app)
        .get("/api/engineering/work-orders/8113/01/-/wip-balance")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.materialCost).toBe(1000.5);
    });
  });

  describe("GET /api/engineering/work-orders/:baseId/:lotId/tree/simplified", () => {
    it("should return simplified tree", async () => {
      const mockTree = {
        root: { baseId: "8113", lotId: "01" },
        children: [],
      };

      workOrderTreeService.getSimplifiedTree.mockResolvedValue(mockTree);

      const response = await request(app)
        .get("/api/engineering/work-orders/8113/01/tree/simplified")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.root.baseId).toBe("8113");
    });
  });

  describe("GET /api/engineering/work-orders/:baseId/:lotId/tree/detailed", () => {
    it("should return detailed tree", async () => {
      const mockTree = {
        root: { baseId: "8113", lotId: "01", operations: [] },
        children: [],
      };

      workOrderTreeService.getDetailedTree.mockResolvedValue(mockTree);

      const response = await request(app)
        .get("/api/engineering/work-orders/8113/01/tree/detailed")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.root).toBeDefined();
    });
  });
});
