const quoteService = require("../../../src/services/sales/quoteService");
const quoteRepository = require("../../../src/repositories/sales/quoteRepository");
const { ValidationError, NotFoundError } = require("../../../src/utils/errors");

jest.mock("../../../src/repositories/sales/quoteRepository");

describe("QuoteService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getQuoteByQuoteId", () => {
    const mockHeader = {
      quoteId: "Q01-0116",
      customerId: "TRABUI",
      customerName: "TRACHTE BUILDING SYSTEMS, INC.",
      address1: "314 WILBURN ROAD",
      address2: null,
      address3: null,
      city: "SUN PRAIRIE",
      state: "WI",
      zipCode: "53590-1469",
      country: "USA",
      contactFirstName: "BILL",
      contactLastName: "SWAN",
      contactPosition: "MFG ENGINEER",
      contactHonorific: "Mr.",
      contactSalutation: "Dear Mr. SWAN:",
      contactInitial: null,
      contactPhone: "608-837-7899 X. 3108",
      contactFax: "608-837-0251",
      salesRepId: "JEFCAR",
      salesRepName: "JEFF CARSON ext.227",
      status: "P",
      quoteDate: new Date("2001-02-21"),
      expirationDate: new Date("2001-02-28"),
      followupDate: null,
      expectedWinDate: null,
      winProbability: null,
      wonLossDate: null,
      wonLossReason: null,
      termsDescription: "25% DOWN; 35% WEEK 8; 30% WEEK 16; 10% SIGN-OFF",
      shipVia: "TRUCKING COMPANY",
      freeOnBoard: "SAMCO",
      freightTerms: "B",
      quotedLeadtime: 27,
      currencyId: "USD",
      printedDate: null,
    };

    const mockLineItems = [
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

    const mockLineDescMap = new Map([
      [1, "SAMCO 10,000-lb Single-ended Uncoiler"],
    ]);

    const mockLinkedOrders = [
      { customerOrderId: "4225", createDate: new Date("2001-02-22") },
    ];

    it("should return formatted quote document with all data", async () => {
      quoteRepository.findByQuoteId.mockResolvedValue(mockHeader);
      quoteRepository.getQuoteDescription.mockResolvedValue(
        "SAMCO QUICK CHANGE LINE",
      );
      quoteRepository.getLineItems.mockResolvedValue(mockLineItems);
      quoteRepository.getLineDescriptions.mockResolvedValue(mockLineDescMap);
      quoteRepository.getLinkedOrders.mockResolvedValue(mockLinkedOrders);

      const result = await quoteService.getQuoteByQuoteId("Q01-0116");

      expect(result).toBeDefined();
      expect(result.quoteId).toBe("Q01-0116");
      expect(result.customer.name).toBe("TRACHTE BUILDING SYSTEMS, INC.");
      expect(result.contact.fullName).toBe("BILL SWAN");
      expect(result.salesRep.name).toBe("JEFF CARSON ext.227");
      expect(result.description).toBe("SAMCO QUICK CHANGE LINE");
      expect(result.terms.description).toBe(
        "25% DOWN; 35% WEEK 8; 30% WEEK 16; 10% SIGN-OFF",
      );
      expect(result.lineItems).toHaveLength(2);
      expect(result.linkedOrders).toHaveLength(1);
      expect(result.lineItemCount).toBe(2);
    });

    it("should merge extended descriptions into line items", async () => {
      quoteRepository.findByQuoteId.mockResolvedValue(mockHeader);
      quoteRepository.getQuoteDescription.mockResolvedValue("");
      quoteRepository.getLineItems.mockResolvedValue(mockLineItems);
      quoteRepository.getLineDescriptions.mockResolvedValue(mockLineDescMap);
      quoteRepository.getLinkedOrders.mockResolvedValue([]);

      const result = await quoteService.getQuoteByQuoteId("Q01-0116");

      // Line 1 has extended description
      expect(result.lineItems[0].extendedDescription).toBe(
        "SAMCO 10,000-lb Single-ended Uncoiler",
      );
      // Line 41 does not
      expect(result.lineItems[1].extendedDescription).toBeNull();
    });

    it("should throw ValidationError for empty quote ID", async () => {
      await expect(quoteService.getQuoteByQuoteId("")).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw ValidationError for null quote ID", async () => {
      await expect(quoteService.getQuoteByQuoteId(null)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw NotFoundError when quote not found", async () => {
      quoteRepository.findByQuoteId.mockResolvedValue(null);

      await expect(quoteService.getQuoteByQuoteId("NOPE-999")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should uppercase quote ID", async () => {
      quoteRepository.findByQuoteId.mockResolvedValue(mockHeader);
      quoteRepository.getQuoteDescription.mockResolvedValue("");
      quoteRepository.getLineItems.mockResolvedValue([]);
      quoteRepository.getLineDescriptions.mockResolvedValue(new Map());
      quoteRepository.getLinkedOrders.mockResolvedValue([]);

      await quoteService.getQuoteByQuoteId("q01-0116");

      expect(quoteRepository.findByQuoteId).toHaveBeenCalledWith("Q01-0116");
    });

    it("should handle quote with no line items", async () => {
      quoteRepository.findByQuoteId.mockResolvedValue(mockHeader);
      quoteRepository.getQuoteDescription.mockResolvedValue("");
      quoteRepository.getLineItems.mockResolvedValue([]);
      quoteRepository.getLineDescriptions.mockResolvedValue(new Map());
      quoteRepository.getLinkedOrders.mockResolvedValue([]);

      const result = await quoteService.getQuoteByQuoteId("Q01-0116");

      expect(result.lineItems).toEqual([]);
      expect(result.lineItemCount).toBe(0);
      expect(result.totalPrice).toBe(0);
    });

    it("should handle quote with no linked orders", async () => {
      quoteRepository.findByQuoteId.mockResolvedValue(mockHeader);
      quoteRepository.getQuoteDescription.mockResolvedValue("");
      quoteRepository.getLineItems.mockResolvedValue(mockLineItems);
      quoteRepository.getLineDescriptions.mockResolvedValue(new Map());
      quoteRepository.getLinkedOrders.mockResolvedValue([]);

      const result = await quoteService.getQuoteByQuoteId("Q01-0116");

      expect(result.linkedOrders).toEqual([]);
    });

    it("should call all repository methods with normalized ID", async () => {
      quoteRepository.findByQuoteId.mockResolvedValue(mockHeader);
      quoteRepository.getQuoteDescription.mockResolvedValue("");
      quoteRepository.getLineItems.mockResolvedValue([]);
      quoteRepository.getLineDescriptions.mockResolvedValue(new Map());
      quoteRepository.getLinkedOrders.mockResolvedValue([]);

      await quoteService.getQuoteByQuoteId("  q01-0116  ");

      expect(quoteRepository.findByQuoteId).toHaveBeenCalledWith("Q01-0116");
      expect(quoteRepository.getQuoteDescription).toHaveBeenCalledWith(
        "Q01-0116",
      );
      expect(quoteRepository.getLineItems).toHaveBeenCalledWith("Q01-0116");
      expect(quoteRepository.getLineDescriptions).toHaveBeenCalledWith(
        "Q01-0116",
      );
      expect(quoteRepository.getLinkedOrders).toHaveBeenCalledWith("Q01-0116");
    });
  });
});
