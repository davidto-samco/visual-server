const { createDbMock } = require("../../__mocks__/dbMock");

const { getPool } = require("../../../src/database/connection");
const orderRepository = require("../../../src/repositories/sales/orderRepository");

describe("orderRepository", () => {
  afterEach(() => jest.clearAllMocks());

  describe("exists()", () => {
    it("returns true when order is found", async () => {
      const { mockPool } = createDbMock([{ exists_flag: 1 }]);
      getPool.mockResolvedValue(mockPool);

      const result = await orderRepository.exists("JOB-001");

      expect(result).toBe(true);
    });

    it("returns false when order is not found", async () => {
      const { mockPool } = createDbMock([]); // empty recordset
      getPool.mockResolvedValue(mockPool);

      const result = await orderRepository.exists("NOPE-999");

      expect(result).toBe(false);
    });
  });

  describe("findByJobNumber()", () => {
    it("returns the order when found", async () => {
      const fakeRow = {
        orderId: "JOB-001",
        customerName: "Acme",
        totalAmount: 5000,
      };
      const { mockPool } = createDbMock([fakeRow]);
      getPool.mockResolvedValue(mockPool);

      const result = await orderRepository.findByJobNumber("JOB-001");

      expect(result).toMatchObject({ orderId: "JOB-001" });
    });

    it("returns null when not found", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await orderRepository.findByJobNumber("NOPE");

      expect(result).toBeNull();
    });
  });
});
