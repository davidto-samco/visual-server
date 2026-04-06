const {
  formatQuoteDocument,
  formatQuoteLineItem,
  formatQuoteStatus,
} = require("../../../src/models/sales/Quote");

describe("Quote Model", () => {
  describe("formatQuoteStatus", () => {
    it("should map P to Pending", () => {
      expect(formatQuoteStatus("P")).toBe("Pending");
    });

    it("should map W to Won", () => {
      expect(formatQuoteStatus("W")).toBe("Won");
    });

    it("should map L to Lost", () => {
      expect(formatQuoteStatus("L")).toBe("Lost");
    });

    it("should map C to Cancelled", () => {
      expect(formatQuoteStatus("C")).toBe("Cancelled");
    });

    it("should return Unknown for unmapped status", () => {
      expect(formatQuoteStatus("X")).toBe("X");
    });

    it("should handle null status", () => {
      expect(formatQuoteStatus(null)).toBe("Unknown");
    });

    it("should trim whitespace from status", () => {
      expect(formatQuoteStatus("P ")).toBe("Pending");
    });
  });

  describe("formatQuoteLineItem", () => {
    it("should format a line item with pricing", () => {
      const row = {
        lineNumber: 1,
        description: "UNCOILER",
        partId: null,
        customerPartId: null,
        quantity: 2,
        unitPrice: 5000,
        sellingUm: "EA",
        extendedDescription: "SAMCO Uncoiler details",
      };

      const result = formatQuoteLineItem(row);

      expect(result.lineNumber).toBe(1);
      expect(result.description).toBe("UNCOILER");
      expect(result.quantity).toBe(2);
      expect(result.unitPrice).toBe(5000);
      expect(result.lineTotal).toBe(10000);
      expect(result.sellingUm).toBe("EA");
      expect(result.extendedDescription).toBe("SAMCO Uncoiler details");
    });

    it("should handle zero pricing", () => {
      const row = {
        lineNumber: 1,
        description: "INCLUDED ITEM",
        partId: null,
        customerPartId: null,
        quantity: 1,
        unitPrice: 0,
        sellingUm: null,
        extendedDescription: null,
      };

      const result = formatQuoteLineItem(row);

      expect(result.lineTotal).toBe(0);
      expect(result.extendedDescription).toBeNull();
    });

    it("should handle null/undefined fields gracefully", () => {
      const row = {
        lineNumber: null,
        description: null,
        partId: null,
        customerPartId: null,
        quantity: null,
        unitPrice: null,
        sellingUm: null,
        extendedDescription: null,
      };

      const result = formatQuoteLineItem(row);

      expect(result.lineNumber).toBe(0);
      expect(result.description).toBe("");
      expect(result.quantity).toBe(0);
      expect(result.unitPrice).toBe(0);
      expect(result.lineTotal).toBe(0);
      expect(result.partId).toBeNull();
    });

    it("should trim whitespace from string fields", () => {
      const row = {
        lineNumber: 1,
        description: "  UNCOILER  ",
        partId: "  PART-001  ",
        customerPartId: "  CUST-PART  ",
        quantity: 1,
        unitPrice: 100,
        sellingUm: "  EA  ",
        extendedDescription: null,
      };

      const result = formatQuoteLineItem(row);

      expect(result.description).toBe("UNCOILER");
      expect(result.partId).toBe("PART-001");
      expect(result.customerPartId).toBe("CUST-PART");
      expect(result.sellingUm).toBe("EA");
    });
  });

  describe("formatQuoteDocument", () => {
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
      contactPhone: "608-837-7899 X. 3108",
      contactFax: "608-837-0251",
      salesRepId: "JEFCAR",
      salesRepName: "JEFF CARSON ext.227",
      status: "P",
      quoteDate: new Date("2001-02-21"),
      expirationDate: new Date("2001-02-28"),
      termsDescription: "25% DOWN",
      shipVia: "TRUCKING COMPANY",
      freeOnBoard: "SAMCO",
      freightTerms: "B",
      quotedLeadtime: 27,
      currencyId: "USD",
    };

    it("should format full quote document structure", () => {
      const lineItems = [
        {
          lineNumber: 1,
          description: "UNCOILER",
          partId: null,
          customerPartId: null,
          quantity: 1,
          unitPrice: 100000,
          sellingUm: null,
          extendedDescription: "Details here",
        },
      ];
      const linkedOrders = [
        { customerOrderId: "4225", createDate: new Date("2001-02-22") },
      ];

      const result = formatQuoteDocument(
        mockHeader,
        "SAMCO QUICK CHANGE LINE",
        lineItems,
        linkedOrders,
      );

      expect(result.quoteId).toBe("Q01-0116");
      expect(result.status).toBe("Pending");
      expect(result.currency).toBe("USD");
      expect(result.description).toBe("SAMCO QUICK CHANGE LINE");
      expect(result.customer.customerId).toBe("TRABUI");
      expect(result.customer.name).toBe("TRACHTE BUILDING SYSTEMS, INC.");
      expect(result.contact.fullName).toBe("BILL SWAN");
      expect(result.contact.position).toBe("MFG ENGINEER");
      expect(result.salesRep.id).toBe("JEFCAR");
      expect(result.salesRep.name).toBe("JEFF CARSON ext.227");
      expect(result.terms.description).toBe("25% DOWN");
      expect(result.terms.shipVia).toBe("TRUCKING COMPANY");
      expect(result.terms.freeOnBoard).toBe("SAMCO");
      expect(result.terms.quotedLeadtimeWeeks).toBe(27);
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItemCount).toBe(1);
      expect(result.totalPrice).toBe(100000);
      expect(result.linkedOrders).toHaveLength(1);
      expect(result.linkedOrders[0].customerOrderId).toBe("4225");
    });

    it("should return null salesRep when no salesRepId", () => {
      const headerNoRep = {
        ...mockHeader,
        salesRepId: null,
        salesRepName: null,
      };

      const result = formatQuoteDocument(headerNoRep, "", [], []);

      expect(result.salesRep).toBeNull();
    });

    it("should calculate total from multiple line items", () => {
      const lineItems = [
        {
          lineNumber: 1,
          description: "A",
          quantity: 2,
          unitPrice: 100,
          extendedDescription: null,
        },
        {
          lineNumber: 2,
          description: "B",
          quantity: 3,
          unitPrice: 200,
          extendedDescription: null,
        },
      ];

      const result = formatQuoteDocument(mockHeader, "", lineItems, []);

      // (2 * 100) + (3 * 200) = 200 + 600 = 800
      expect(result.totalPrice).toBe(800);
    });

    it("should handle empty line items and linked orders", () => {
      const result = formatQuoteDocument(mockHeader, "", [], []);

      expect(result.lineItems).toEqual([]);
      expect(result.lineItemCount).toBe(0);
      expect(result.totalPrice).toBe(0);
      expect(result.linkedOrders).toEqual([]);
    });

    it("should handle contact with missing first or last name", () => {
      const headerNoContact = {
        ...mockHeader,
        contactFirstName: null,
        contactLastName: null,
      };

      const result = formatQuoteDocument(headerNoContact, "", [], []);

      expect(result.contact.fullName).toBe("N/A");
      expect(result.contact.firstName).toBeNull();
      expect(result.contact.lastName).toBeNull();
    });
  });
});
