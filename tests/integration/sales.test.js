const request = require("supertest");
const app = require("../../src/app");

// Mock the service
jest.mock("../../src/services/sales/orderService");

const orderService = require("../../src/services/sales/orderService");

describe("Sales Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/sales/orders", () => {
    it("should return recent orders without filters", async () => {
      const mockOrders = [
        {
          jobNumber: "JOB-001",
          customerName: "ACME Corp",
          orderDate: "2024-01-15",
        },
      ];

      orderService.getRecentOrders.mockResolvedValue(mockOrders);

      const response = await request(app).get("/api/sales/orders").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].jobNumber).toBe("JOB-001");
      expect(orderService.getRecentOrders).toHaveBeenCalled();
    });

    it("should search orders with customer filter", async () => {
      const mockResults = {
        records: [
          {
            jobNumber: "JOB-002",
            customerName: "ACME Corp",
          },
        ],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };

      orderService.searchOrders.mockResolvedValue(mockResults);

      const response = await request(app)
        .get("/api/sales/orders")
        .query({ customerName: "ACME" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(orderService.searchOrders).toHaveBeenCalledWith(
        expect.objectContaining({ customerName: "ACME" }),
        undefined,
        undefined,
      );
    });

    it("should search orders with date range filter", async () => {
      const mockResults = {
        records: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
      };

      orderService.searchOrders.mockResolvedValue(mockResults);

      const response = await request(app)
        .get("/api/sales/orders")
        .query({ startDate: "2024-01-01", endDate: "2024-01-31" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(orderService.searchOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        }),
        undefined,
        undefined,
      );
    });

    it("should return 400 for invalid date format", async () => {
      const { ValidationError } = require("../../src/utils/errors");
      orderService.searchOrders.mockRejectedValue(
        new ValidationError("startDate must be a valid date (YYYY-MM-DD)"),
      );

      const response = await request(app)
        .get("/api/sales/orders")
        .query({ startDate: "invalid-date" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/sales/orders/:jobNumber", () => {
    it("should return order by job number", async () => {
      const mockOrder = {
        jobNumber: "JOB-001",
        customerName: "ACME Corp",
        orderDate: "2024-01-15",
        status: "Open",
      };

      orderService.getOrderByJobNumber.mockResolvedValue(mockOrder);

      const response = await request(app)
        .get("/api/sales/orders/JOB-001")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobNumber).toBe("JOB-001");
      expect(response.body.data.customerName).toBe("ACME Corp");
    });

    it("should return 404 for non-existent order", async () => {
      const { NotFoundError } = require("../../src/utils/errors");
      orderService.getOrderByJobNumber.mockRejectedValue(
        new NotFoundError("Order JOB-999"),
      );

      const response = await request(app)
        .get("/api/sales/orders/JOB-999")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/sales/orders/:jobNumber/line-items", () => {
    it("should return order line items", async () => {
      const mockLineItems = {
        records: [
          {
            lineNumber: 1,
            partId: "PART-001",
            quantity: 10,
          },
          {
            lineNumber: 2,
            partId: "PART-002",
            quantity: 5,
          },
        ],
        meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
      };

      orderService.getOrderLineItems.mockResolvedValue(mockLineItems);

      const response = await request(app)
        .get("/api/sales/orders/JOB-001/line-items")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].lineNumber).toBe(1);
      expect(response.body.meta.total).toBe(2);
    });

    it("should pass pagination parameters", async () => {
      orderService.getOrderLineItems.mockResolvedValue({
        records: [],
        meta: { total: 0, page: 2, limit: 25, totalPages: 0 },
      });

      await request(app)
        .get("/api/sales/orders/JOB-001/line-items")
        .query({ page: 2, limit: 25 })
        .expect(200);

      expect(orderService.getOrderLineItems).toHaveBeenCalledWith(
        "JOB-001",
        "2",
        "25",
      );
    });
  });

  describe("GET /api/sales/orders/:jobNumber/line-items/:lineNumber/extended-description", () => {
    it("should return line extended description", async () => {
      orderService.getLineExtendedDescription.mockResolvedValue(
        "Detailed line item description\nWith multiple lines",
      );

      const response = await request(app)
        .get("/api/sales/orders/JOB-001/line-items/1/extended-description")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.extendedDescription).toContain(
        "Detailed line item description",
      );
    });

    it("should parse line number as integer", async () => {
      orderService.getLineExtendedDescription.mockResolvedValue("");

      await request(app)
        .get("/api/sales/orders/JOB-001/line-items/5/extended-description")
        .expect(200);

      expect(orderService.getLineExtendedDescription).toHaveBeenCalledWith(
        "JOB-001",
        5,
      );
    });

    it("should return empty string when no extended description", async () => {
      orderService.getLineExtendedDescription.mockResolvedValue("");

      const response = await request(app)
        .get("/api/sales/orders/JOB-001/line-items/1/extended-description")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.extendedDescription).toBe("");
    });
  });
});
