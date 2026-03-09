const orderService = require("../../../src/services/sales/orderService");
const orderRepository = require("../../../src/repositories/sales/orderRepository");
const { ValidationError, NotFoundError } = require("../../../src/utils/errors");

jest.mock("../../../src/repositories/sales/orderRepository");

describe("OrderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRecentOrders", () => {
    it("should return formatted recent orders", async () => {
      orderRepository.getRecentOrders.mockResolvedValue([
        {
          orderId: "JOB-001",
          customerId: "CUST-001",
          customerName: "Acme Corp",
          orderDate: new Date("2024-01-15"),
          status: "O",
        },
        {
          orderId: "JOB-002",
          customerId: "CUST-002",
          customerName: "Beta Inc",
          orderDate: new Date("2024-01-16"),
          status: "C",
        },
      ]);

      const result = await orderService.getRecentOrders(100);

      expect(result).toHaveLength(2);
      expect(orderRepository.getRecentOrders).toHaveBeenCalledWith(100);
    });

    it("should use default limit of 100", async () => {
      orderRepository.getRecentOrders.mockResolvedValue([]);

      await orderService.getRecentOrders();

      expect(orderRepository.getRecentOrders).toHaveBeenCalledWith(100);
    });

    it("should cap limit at 1000", async () => {
      orderRepository.getRecentOrders.mockResolvedValue([]);

      await orderService.getRecentOrders(5000);

      expect(orderRepository.getRecentOrders).toHaveBeenCalledWith(1000);
    });

    it("should treat 0 as falsy and use default", async () => {
      orderRepository.getRecentOrders.mockResolvedValue([]);

      await orderService.getRecentOrders(0);

      // 0 is falsy, so parseInt(0) || 100 = 100
      expect(orderRepository.getRecentOrders).toHaveBeenCalledWith(100);
    });

    it("should handle invalid limit gracefully", async () => {
      orderRepository.getRecentOrders.mockResolvedValue([]);

      await orderService.getRecentOrders("invalid");

      expect(orderRepository.getRecentOrders).toHaveBeenCalledWith(100);
    });
  });

  describe("searchOrders", () => {
    it("should return paginated orders with filters", async () => {
      orderRepository.countWithFilters.mockResolvedValue(50);
      orderRepository.searchWithFilters.mockResolvedValue([
        { orderId: "JOB-001", customerName: "Acme Corp", status: "O" },
      ]);

      const result = await orderService.searchOrders(
        { customerName: "Acme" },
        1,
        50
      );

      expect(result.records).toHaveLength(1);
      expect(result.meta.total).toBe(50);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.totalPages).toBe(1);
    });

    it("should validate and parse date filters", async () => {
      orderRepository.countWithFilters.mockResolvedValue(0);
      orderRepository.searchWithFilters.mockResolvedValue([]);

      await orderService.searchOrders(
        { startDate: "2024-01-01", endDate: "2024-01-31" },
        1,
        50
      );

      expect(orderRepository.countWithFilters).toHaveBeenCalledWith(
        null,
        expect.any(Date),
        expect.any(Date)
      );
    });

    it("should throw ValidationError when start date is after end date", async () => {
      await expect(
        orderService.searchOrders(
          { startDate: "2024-12-31", endDate: "2024-01-01" },
          1,
          50
        )
      ).rejects.toThrow(ValidationError);
    });

    it("should trim customer name filter", async () => {
      orderRepository.countWithFilters.mockResolvedValue(0);
      orderRepository.searchWithFilters.mockResolvedValue([]);

      await orderService.searchOrders({ customerName: "  Acme  " }, 1, 50);

      expect(orderRepository.countWithFilters).toHaveBeenCalledWith(
        "Acme",
        null,
        null
      );
    });

    it("should calculate correct offset for pagination", async () => {
      orderRepository.countWithFilters.mockResolvedValue(100);
      orderRepository.searchWithFilters.mockResolvedValue([]);

      await orderService.searchOrders({}, 3, 25);

      expect(orderRepository.searchWithFilters).toHaveBeenCalledWith(
        null,
        null,
        null,
        25,
        50 // offset = (3-1) * 25
      );
    });
  });

  describe("getOrderByJobNumber", () => {
    it("should return formatted order with line items", async () => {
      orderRepository.findByJobNumber.mockResolvedValue({
        orderId: "JOB-001",
        customerId: "CUST-001",
        customerName: "Acme Corp",
        orderDate: new Date("2024-01-15"),
        status: "O",
      });
      orderRepository.getOrderLineItems.mockResolvedValue([
        { lineNo: 1, partId: "PART-001", orderQty: 10 },
      ]);

      const result = await orderService.getOrderByJobNumber("job-001");

      expect(result).toBeDefined();
      expect(orderRepository.findByJobNumber).toHaveBeenCalledWith("JOB-001");
    });

    it("should throw ValidationError for empty job number", async () => {
      await expect(orderService.getOrderByJobNumber("")).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw NotFoundError when order not found", async () => {
      orderRepository.findByJobNumber.mockResolvedValue(null);

      await expect(orderService.getOrderByJobNumber("NOPE-999")).rejects.toThrow(
        NotFoundError
      );
    });

    it("should uppercase job number", async () => {
      orderRepository.findByJobNumber.mockResolvedValue({
        orderId: "JOB-001",
        customerId: "CUST-001",
      });
      orderRepository.getOrderLineItems.mockResolvedValue([]);

      await orderService.getOrderByJobNumber("job-001");

      expect(orderRepository.findByJobNumber).toHaveBeenCalledWith("JOB-001");
    });
  });

  describe("getOrderLineItems", () => {
    it("should return paginated line items", async () => {
      orderRepository.exists.mockResolvedValue(true);
      orderRepository.countLineItems.mockResolvedValue(25);
      orderRepository.getOrderLineItemsPaginated.mockResolvedValue([
        { lineNo: 1, partId: "PART-001", orderQty: 10 },
        { lineNo: 2, partId: "PART-002", orderQty: 5 },
      ]);

      const result = await orderService.getOrderLineItems("JOB-001", 1, 50);

      expect(result.records).toHaveLength(2);
      expect(result.meta.total).toBe(25);
      expect(result.meta.page).toBe(1);
    });

    it("should throw ValidationError for empty job number", async () => {
      await expect(
        orderService.getOrderLineItems("", 1, 50)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw NotFoundError when order does not exist", async () => {
      orderRepository.exists.mockResolvedValue(false);

      await expect(
        orderService.getOrderLineItems("NOPE-999", 1, 50)
      ).rejects.toThrow(NotFoundError);
    });

    it("should cap limit at 200", async () => {
      orderRepository.exists.mockResolvedValue(true);
      orderRepository.countLineItems.mockResolvedValue(0);
      orderRepository.getOrderLineItemsPaginated.mockResolvedValue([]);

      await orderService.getOrderLineItems("JOB-001", 1, 500);

      expect(orderRepository.getOrderLineItemsPaginated).toHaveBeenCalledWith(
        "JOB-001",
        200,
        0
      );
    });

    it("should uppercase job number", async () => {
      orderRepository.exists.mockResolvedValue(true);
      orderRepository.countLineItems.mockResolvedValue(0);
      orderRepository.getOrderLineItemsPaginated.mockResolvedValue([]);

      await orderService.getOrderLineItems("job-001", 1, 50);

      expect(orderRepository.exists).toHaveBeenCalledWith("JOB-001");
    });
  });

  describe("getLineExtendedDescription", () => {
    it("should return extended description", async () => {
      orderRepository.getLineExtendedDescription.mockResolvedValue(
        "Extended description text"
      );

      const result = await orderService.getLineExtendedDescription("JOB-001", 1);

      expect(result).toBe("Extended description text");
      expect(orderRepository.getLineExtendedDescription).toHaveBeenCalledWith(
        "JOB-001",
        1
      );
    });

    it("should throw ValidationError for empty job number", async () => {
      await expect(
        orderService.getLineExtendedDescription("", 1)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for invalid line number", async () => {
      await expect(
        orderService.getLineExtendedDescription("JOB-001", 0)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for negative line number", async () => {
      await expect(
        orderService.getLineExtendedDescription("JOB-001", -1)
      ).rejects.toThrow(ValidationError);
    });

    it("should uppercase job number", async () => {
      orderRepository.getLineExtendedDescription.mockResolvedValue(null);

      await orderService.getLineExtendedDescription("job-001", 1);

      expect(orderRepository.getLineExtendedDescription).toHaveBeenCalledWith(
        "JOB-001",
        1
      );
    });
  });
});
