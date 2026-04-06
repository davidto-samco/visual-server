const request = require("supertest");
const app = require("../../src/app");

// Mock the service
jest.mock("../../src/services/sales/quoteService");

const quoteService = require("../../src/services/sales/quoteService");

describe("Quote Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/sales/quotes/:quoteId", () => {
    it("should return quote document data", async () => {
      const mockQuote = {
        quoteId: "Q01-0116",
        status: "Pending",
        quoteDate: "2001-02-21",
        expirationDate: "2001-02-28",
        currency: "USD",
        customer: {
          customerId: "TRABUI",
          name: "TRACHTE BUILDING SYSTEMS, INC.",
          address1: "314 WILBURN ROAD",
          city: "SUN PRAIRIE",
          state: "WI",
          zipCode: "53590-1469",
          country: "USA",
        },
        contact: {
          firstName: "BILL",
          lastName: "SWAN",
          fullName: "BILL SWAN",
          phone: "608-837-7899 X. 3108",
          fax: "608-837-0251",
        },
        salesRep: {
          id: "JEFCAR",
          name: "JEFF CARSON ext.227",
        },
        description: "SAMCO QUICK CHANGE COLUMN ROLLFORMING LINE",
        terms: {
          description: "25% DOWN; 35% WEEK 8; 30% WEEK 16; 10% SIGN-OFF",
          shipVia: "TRUCKING COMPANY",
          freeOnBoard: "SAMCO",
          quotedLeadtimeWeeks: 27,
        },
        lineItems: [
          {
            lineNumber: 1,
            description: "UNCOILER",
            quantity: 1,
            unitPrice: 0,
            lineTotal: 0,
            extendedDescription: "SAMCO 10,000-lb Single-ended Uncoiler",
          },
        ],
        totalPrice: 744260,
        formattedTotalPrice: "$744,260.00",
        linkedOrders: [{ customerOrderId: "4225", createDate: "2001-02-22" }],
        lineItemCount: 1,
      };

      quoteService.getQuoteByQuoteId.mockResolvedValue(mockQuote);

      const response = await request(app)
        .get("/api/sales/quotes/Q01-0116")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quoteId).toBe("Q01-0116");
      expect(response.body.data.customer.name).toBe(
        "TRACHTE BUILDING SYSTEMS, INC.",
      );
      expect(response.body.data.lineItems).toHaveLength(1);
      expect(response.body.data.totalPrice).toBe(744260);
      expect(response.body.data.linkedOrders).toHaveLength(1);
    });

    it("should pass quoteId param to service", async () => {
      quoteService.getQuoteByQuoteId.mockResolvedValue({
        quoteId: "Q20-0470",
        lineItems: [],
      });

      await request(app).get("/api/sales/quotes/Q20-0470").expect(200);

      expect(quoteService.getQuoteByQuoteId).toHaveBeenCalledWith("Q20-0470");
    });

    it("should return 404 for non-existent quote", async () => {
      const { NotFoundError } = require("../../src/utils/errors");
      quoteService.getQuoteByQuoteId.mockRejectedValue(
        new NotFoundError("Quote NOPE-999"),
      );

      const response = await request(app)
        .get("/api/sales/quotes/NOPE-999")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should return 400 for validation errors", async () => {
      const { ValidationError } = require("../../src/utils/errors");
      quoteService.getQuoteByQuoteId.mockRejectedValue(
        new ValidationError("Quote ID is required"),
      );

      const response = await request(app)
        .get("/api/sales/quotes/%20")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should handle internal server errors", async () => {
      quoteService.getQuoteByQuoteId.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await request(app)
        .get("/api/sales/quotes/Q01-0116")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
