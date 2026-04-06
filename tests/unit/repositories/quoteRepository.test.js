const { createDbMock } = require("../../__mocks__/dbMock");

const { getPool } = require("../../../src/database/connection");
const quoteRepository = require("../../../src/repositories/sales/quoteRepository");

describe("quoteRepository", () => {
  afterEach(() => jest.clearAllMocks());

  describe("exists()", () => {
    it("returns true when quote is found", async () => {
      const { mockPool } = createDbMock([{ exists_flag: 1 }]);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.exists("Q01-0116");

      expect(result).toBe(true);
    });

    it("returns false when quote is not found", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.exists("NOPE-999");

      expect(result).toBe(false);
    });
  });

  describe("findByQuoteId()", () => {
    it("returns the quote header when found", async () => {
      const fakeRow = {
        quoteId: "Q01-0116",
        customerId: "TRABUI",
        customerName: "TRACHTE BUILDING SYSTEMS, INC.",
        address1: "314 WILBURN ROAD",
        city: "SUN PRAIRIE",
        state: "WI",
        zipCode: "53590-1469",
        country: "USA",
        contactFirstName: "BILL",
        contactLastName: "SWAN",
        contactPhone: "608-837-7899 X. 3108",
        contactFax: "608-837-0251",
        contactPosition: "MFG ENGINEER",
        contactHonorific: "Mr.",
        contactSalutation: "Dear Mr. SWAN:",
        contactInitial: null,
        salesRepId: "JEFCAR",
        salesRepName: "JEFF CARSON ext.227",
        status: "P",
        quoteDate: new Date("2001-02-21"),
        expirationDate: new Date("2001-02-28"),
        termsDescription: "25% DOWN; 35% WEEK 8; 30% WEEK 16; 10% SIGN-OFF",
        shipVia: "TRUCKING COMPANY",
        freeOnBoard: "SAMCO",
        freightTerms: "B",
        quotedLeadtime: 27,
        currencyId: "USD",
      };
      const { mockPool } = createDbMock([fakeRow]);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.findByQuoteId("Q01-0116");

      expect(result).toMatchObject({
        quoteId: "Q01-0116",
        customerId: "TRABUI",
      });
    });

    it("returns null when not found", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.findByQuoteId("NOPE");

      expect(result).toBeNull();
    });
  });

  describe("getQuoteDescription()", () => {
    it("returns description text when present", async () => {
      const { mockPool } = createDbMock([
        { description: "SAMCO QUICK CHANGE LINE" },
      ]);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.getQuoteDescription("Q01-0116");

      expect(result).toBe("SAMCO QUICK CHANGE LINE");
    });

    it("returns empty string when no binary record exists", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.getQuoteDescription("Q01-0116");

      expect(result).toBe("");
    });

    it("returns empty string when description is null", async () => {
      const { mockPool } = createDbMock([{ description: null }]);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.getQuoteDescription("Q01-0116");

      expect(result).toBe("");
    });
  });

  describe("getLineItems()", () => {
    it("returns line items with pricing", async () => {
      const fakeRows = [
        {
          lineNumber: 1,
          partId: null,
          description: "UNCOILER",
          customerPartId: null,
          quantity: 1,
          unitPrice: 0,
          sellingUm: null,
        },
        {
          lineNumber: 41,
          partId: null,
          description: "TOTAL",
          customerPartId: null,
          quantity: 1,
          unitPrice: 744260,
          sellingUm: null,
        },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.getLineItems("Q01-0116");

      expect(result).toHaveLength(2);
      expect(result[0].description).toBe("UNCOILER");
      expect(result[1].unitPrice).toBe(744260);
    });

    it("returns empty array when no line items", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.getLineItems("Q01-0116");

      expect(result).toEqual([]);
    });
  });

  describe("getLineDescriptions()", () => {
    it("returns a Map of lineNumber to description", async () => {
      const fakeRows = [
        { lineNumber: 1, description: "SAMCO 10,000-lb Uncoiler" },
        { lineNumber: 14, description: "SAMCO Thru-Shaft Duplex Rollformer" },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.getLineDescriptions("Q01-0116");

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get(1)).toBe("SAMCO 10,000-lb Uncoiler");
      expect(result.get(14)).toBe("SAMCO Thru-Shaft Duplex Rollformer");
    });

    it("skips entries with null description", async () => {
      const fakeRows = [
        { lineNumber: 1, description: "Some text" },
        { lineNumber: 2, description: null },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.getLineDescriptions("Q01-0116");

      expect(result.size).toBe(1);
      expect(result.has(2)).toBe(false);
    });

    it("returns empty Map when no binary records", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.getLineDescriptions("Q01-0116");

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe("getLinkedOrders()", () => {
    it("returns linked customer orders", async () => {
      const fakeRows = [
        { customerOrderId: "4225", createDate: new Date("2001-02-22") },
      ];
      const { mockPool } = createDbMock(fakeRows);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.getLinkedOrders("Q01-0116");

      expect(result).toHaveLength(1);
      expect(result[0].customerOrderId).toBe("4225");
    });

    it("returns empty array when no linked orders", async () => {
      const { mockPool } = createDbMock([]);
      getPool.mockResolvedValue(mockPool);

      const result = await quoteRepository.getLinkedOrders("Q01-0116");

      expect(result).toEqual([]);
    });
  });
});
