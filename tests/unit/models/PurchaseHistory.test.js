const {
  formatPurchaseHistory,
} = require("../../../src/models/inventory/PurchaseHistory");

describe("PurchaseHistory Model Formatter", () => {
  describe("formatPurchaseHistory", () => {
    const baseRow = {
      orderDate: new Date(Date.UTC(2013, 0, 25)),
      desiredRecvDate: new Date(Date.UTC(2013, 0, 28)),
      promiseDate: null,
      lastReceivedDate: new Date(Date.UTC(2013, 1, 3)),
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
    };

    it("formats a complete row", () => {
      const result = formatPurchaseHistory(baseRow);

      expect(result).toMatchObject({
        orderDate: "2013-01-25",
        desiredRecvDate: "2013-01-28",
        promiseDate: null,
        lastReceivedDate: "2013-02-03",
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
      });
    });

    it("formats dates as YYYY-MM-DD without timezone shift", () => {
      const result = formatPurchaseHistory({
        ...baseRow,
        orderDate: new Date(Date.UTC(2024, 11, 31)),
      });
      expect(result.orderDate).toBe("2024-12-31");
    });

    it("returns null for missing dates", () => {
      const result = formatPurchaseHistory({
        ...baseRow,
        orderDate: null,
        desiredRecvDate: null,
        promiseDate: null,
        lastReceivedDate: null,
      });
      expect(result.orderDate).toBeNull();
      expect(result.desiredRecvDate).toBeNull();
      expect(result.promiseDate).toBeNull();
      expect(result.lastReceivedDate).toBeNull();
    });

    it("returns null for invalid dates", () => {
      const result = formatPurchaseHistory({
        ...baseRow,
        orderDate: "not-a-date",
      });
      expect(result.orderDate).toBeNull();
    });

    it("accepts ISO date strings", () => {
      const result = formatPurchaseHistory({
        ...baseRow,
        orderDate: "2013-01-25T00:00:00.000Z",
      });
      expect(result.orderDate).toBe("2013-01-25");
    });

    it("trims string fields", () => {
      const result = formatPurchaseHistory({
        ...baseRow,
        purchaseOrder: "  P13-0429  ",
        vendorId: " KARRIC ",
        vendorName: "  KARL W. RICHTER  ",
        currencyId: " CDN ",
        currencyName: " CANADIAN DOLLAR ",
        nativeCurrencyId: " CDN ",
        nativeCurrencyName: " CANADIAN DOLLAR ",
        lineStatus: " A ",
      });

      expect(result.purchaseOrder).toBe("P13-0429");
      expect(result.vendorId).toBe("KARRIC");
      expect(result.vendorName).toBe("KARL W. RICHTER");
      expect(result.currencyId).toBe("CDN");
      expect(result.currencyName).toBe("CANADIAN DOLLAR");
      expect(result.nativeCurrencyId).toBe("CDN");
      expect(result.nativeCurrencyName).toBe("CANADIAN DOLLAR");
      expect(result.lineStatus).toBe("A");
    });

    it("builds vendorDisplay from id and name", () => {
      const result = formatPurchaseHistory(baseRow);
      expect(result.vendorDisplay).toBe("KARRIC - KARL W. RICHTER");
    });

    it("builds vendorDisplay with only id when name is missing", () => {
      const result = formatPurchaseHistory({
        ...baseRow,
        vendorName: null,
      });
      expect(result.vendorDisplay).toBe("KARRIC");
    });

    it("builds vendorDisplay with only name when id is missing", () => {
      const result = formatPurchaseHistory({
        ...baseRow,
        vendorId: null,
      });
      expect(result.vendorDisplay).toBe("KARL W. RICHTER");
    });

    it("returns empty vendorDisplay when both id and name are missing", () => {
      const result = formatPurchaseHistory({
        ...baseRow,
        vendorId: null,
        vendorName: null,
      });
      expect(result.vendorDisplay).toBe("");
      expect(result.vendorId).toBe("");
      expect(result.vendorName).toBe("");
    });

    it("coerces numeric fields", () => {
      const result = formatPurchaseHistory({
        ...baseRow,
        orderQty: "4.0000",
        receivedQty: "0.0000",
        unitPrice: "0.04",
        nativeUnitPrice: "0.04",
        discPercent: "5",
        fixedCost: "1.50",
        standardUnitCost: "0.04",
        lineNo: "7",
      });

      expect(result.orderQty).toBe(4);
      expect(result.receivedQty).toBe(0);
      expect(result.unitPrice).toBe(0.04);
      expect(result.nativeUnitPrice).toBe(0.04);
      expect(result.discPercent).toBe(5);
      expect(result.fixedCost).toBe(1.5);
      expect(result.standardUnitCost).toBe(0.04);
      expect(result.lineNo).toBe(7);
    });

    it("defaults numeric fields to 0 when null/undefined", () => {
      const result = formatPurchaseHistory({
        ...baseRow,
        orderQty: null,
        receivedQty: undefined,
        unitPrice: null,
        nativeUnitPrice: null,
        discPercent: null,
        fixedCost: null,
        standardUnitCost: null,
      });

      expect(result.orderQty).toBe(0);
      expect(result.receivedQty).toBe(0);
      expect(result.unitPrice).toBe(0);
      expect(result.nativeUnitPrice).toBe(0);
      expect(result.discPercent).toBe(0);
      expect(result.fixedCost).toBe(0);
      expect(result.standardUnitCost).toBe(0);
    });

    it("coerces delSched to a boolean", () => {
      expect(formatPurchaseHistory({ ...baseRow, delSched: 1 }).delSched).toBe(
        true,
      );
      expect(formatPurchaseHistory({ ...baseRow, delSched: 0 }).delSched).toBe(
        false,
      );
      expect(
        formatPurchaseHistory({ ...baseRow, delSched: null }).delSched,
      ).toBe(false);
    });

    it("handles foreign currency rows", () => {
      const result = formatPurchaseHistory({
        ...baseRow,
        currencyId: "USD",
        currencyName: "US DOLLAR",
        unitPrice: 6.015,
        nativeCurrencyId: "CDN",
        nativeCurrencyName: "CANADIAN DOLLAR",
        nativeUnitPrice: 5.974,
      });

      expect(result.currencyName).toBe("US DOLLAR");
      expect(result.unitPrice).toBe(6.015);
      expect(result.nativeCurrencyName).toBe("CANADIAN DOLLAR");
      expect(result.nativeUnitPrice).toBe(5.974);
    });
  });
});
