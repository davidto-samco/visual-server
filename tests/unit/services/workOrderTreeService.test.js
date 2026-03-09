const workOrderTreeService = require("../../../src/services/engineering/workOrderTreeService");
const workOrderTreeRepository = require("../../../src/repositories/engineering/workOrderTreeRepository");
const { ValidationError } = require("../../../src/utils/errors");

jest.mock("../../../src/repositories/engineering/workOrderTreeRepository");

describe("WorkOrderTreeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSimplifiedTree", () => {
    it("should return null root when no data found", async () => {
      workOrderTreeRepository.getSimplifiedTree.mockResolvedValue([]);

      const result = await workOrderTreeService.getSimplifiedTree("WO-001", "1");

      // Service returns { root: null } when empty
      expect(result.root).toBeNull();
      expect(result.totalWorkOrders).toBe(0);
    });

    it("should throw ValidationError for missing baseId", async () => {
      await expect(
        workOrderTreeService.getSimplifiedTree("", "1")
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for missing lotId", async () => {
      await expect(
        workOrderTreeService.getSimplifiedTree("WO-001", "")
      ).rejects.toThrow(ValidationError);
    });

    it("should return single root node when no children", async () => {
      workOrderTreeRepository.getSimplifiedTree.mockResolvedValue([
        {
          subId: "0",
          partId: "MAIN-ASSY",
          partDescription: "Main Assembly",
          orderQty: 1,
          status: "R",
          type: "M",
          startDate: new Date("2024-01-01"),
          finishDate: new Date("2024-01-15"),
          closeDate: null,
          parentSubId: null,
          depth: 0,
          sortPath: "000",
        },
      ]);

      const result = await workOrderTreeService.getSimplifiedTree("WO-001", "1");

      expect(result.tree).not.toBeNull();
      expect(result.tree.subId).toBe("0");
      expect(result.tree.formattedId).toBe("WO-001/1");
      expect(result.tree.children).toEqual([]);
      expect(result.totalWorkOrders).toBe(1);
    });

    it("should build nested tree with children", async () => {
      workOrderTreeRepository.getSimplifiedTree.mockResolvedValue([
        {
          subId: "0",
          partId: "MAIN-ASSY",
          partDescription: "Main Assembly",
          orderQty: 1,
          status: "R",
          type: "M",
          startDate: null,
          finishDate: null,
          closeDate: null,
          parentSubId: null,
          depth: 0,
          sortPath: "000",
        },
        {
          subId: "1",
          partId: "SUB-ASSY-001",
          partDescription: "Sub Assembly 1",
          orderQty: 2,
          status: "R",
          type: "M",
          startDate: null,
          finishDate: null,
          closeDate: null,
          parentSubId: "0",
          depth: 1,
          sortPath: "000.001",
        },
        {
          subId: "2",
          partId: "SUB-ASSY-002",
          partDescription: "Sub Assembly 2",
          orderQty: 1,
          status: "C",
          type: "M",
          startDate: null,
          finishDate: null,
          closeDate: new Date("2024-01-10"),
          parentSubId: "1",
          depth: 2,
          sortPath: "000.001.002",
        },
      ]);

      const result = await workOrderTreeService.getSimplifiedTree("WO-001", "1");

      expect(result.tree).not.toBeNull();
      expect(result.tree.subId).toBe("0");
      expect(result.tree.children).toHaveLength(1);
      expect(result.tree.children[0].subId).toBe("1");
      expect(result.tree.children[0].formattedId).toBe("WO-001-1/1");
      expect(result.tree.children[0].children).toHaveLength(1);
      expect(result.tree.children[0].children[0].subId).toBe("2");
      expect(result.totalWorkOrders).toBe(3);
    });

    it("should format status correctly", async () => {
      workOrderTreeRepository.getSimplifiedTree.mockResolvedValue([
        {
          subId: "0",
          partId: "PART-001",
          partDescription: "Part",
          orderQty: 1,
          status: "R",
          type: "M",
          startDate: null,
          finishDate: null,
          closeDate: null,
          parentSubId: null,
          depth: 0,
          sortPath: "000",
        },
      ]);

      const result = await workOrderTreeService.getSimplifiedTree("WO-001", "1");

      expect(result.tree.status).toBe("R");
      expect(result.tree.formattedStatus).toBe("[R]");
    });
  });

  describe("getDetailedTree", () => {
    it("should return null root when no data found", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue([]);

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      // Service returns { root: null } when empty
      expect(result.root).toBeNull();
      expect(result.summary).toBeNull();
    });

    it("should throw ValidationError for missing baseId", async () => {
      await expect(
        workOrderTreeService.getDetailedTree("", "1")
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for missing lotId", async () => {
      await expect(
        workOrderTreeService.getDetailedTree("WO-001", "")
      ).rejects.toThrow(ValidationError);
    });

    it("should return tree with WO, OP, and MAT nodes", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue([
        {
          nodeType: "WO",
          depth: 0,
          subId: "0",
          partId: "MAIN-ASSY",
          partDescription: "Main Assembly",
          qty: 1,
          status: "R",
          type: "M",
          startDate: new Date("2024-01-01"),
          finishDate: new Date("2024-01-15"),
          opSeq: null,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0000-0000",
        },
        {
          nodeType: "OP",
          depth: 1,
          subId: "0",
          partId: null,
          partDescription: null,
          qty: null,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: "WELD-01",
          resourceDescription: "Welding Station 1",
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0000",
        },
        {
          nodeType: "MAT",
          depth: 2,
          subId: "0",
          partId: "STEEL-PLATE",
          partDescription: "Steel Plate",
          qty: 5,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: null,
          resourceDescription: null,
          dimensions: "24x48",
          pieceNo: 1,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0001",
        },
      ]);

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      expect(result.tree).not.toBeNull();
      expect(result.tree.nodeType).toBe("WO");
      expect(result.tree.children).toHaveLength(1);
      expect(result.tree.children[0].nodeType).toBe("OP");
      expect(result.tree.children[0].children).toHaveLength(1);
      expect(result.tree.children[0].children[0].nodeType).toBe("MAT");
    });

    it("should return summary with correct counts", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue([
        {
          nodeType: "WO",
          depth: 0,
          subId: "0",
          partId: "MAIN",
          partDescription: "Main",
          qty: 1,
          status: "R",
          type: "M",
          startDate: null,
          finishDate: null,
          opSeq: null,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0000-0000",
        },
        {
          nodeType: "OP",
          depth: 1,
          subId: "0",
          partId: null,
          partDescription: null,
          qty: null,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: "RES-01",
          resourceDescription: "Resource 1",
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0000",
        },
        {
          nodeType: "OP",
          depth: 1,
          subId: "0",
          partId: null,
          partDescription: null,
          qty: null,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 20,
          resourceId: "RES-02",
          resourceDescription: "Resource 2",
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0020-0000",
        },
        {
          nodeType: "MAT",
          depth: 2,
          subId: "0",
          partId: "MAT-001",
          partDescription: "Material 1",
          qty: 10,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: 1,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0001",
        },
        {
          nodeType: "MAT",
          depth: 2,
          subId: "0",
          partId: "MAT-002",
          partDescription: "Material 2",
          qty: 5,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: 2,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0002",
        },
      ]);

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      expect(result.summary.workOrders).toBe(1);
      expect(result.summary.operations).toBe(2);
      expect(result.summary.materials).toBe(2);
      expect(result.summary.totalNodes).toBe(5);
    });

    it("should format WO node with correct formattedId", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue([
        {
          nodeType: "WO",
          depth: 0,
          subId: "0",
          partId: "PART-001",
          partDescription: "Part Description",
          qty: 10,
          status: "R",
          type: "M",
          startDate: null,
          finishDate: null,
          opSeq: null,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0000-0000",
        },
      ]);

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      expect(result.tree.formattedId).toBe("WO-001/1");
    });

    it("should format child WO node with sub ID in formattedId", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue([
        {
          nodeType: "WO",
          depth: 0,
          subId: "0",
          partId: "MAIN",
          partDescription: "Main",
          qty: 1,
          status: "R",
          type: "M",
          startDate: null,
          finishDate: null,
          opSeq: null,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0000-0000",
        },
        {
          nodeType: "OP",
          depth: 1,
          subId: "0",
          partId: null,
          partDescription: null,
          qty: null,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: "RES",
          resourceDescription: "Resource",
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0000",
        },
        {
          nodeType: "WO",
          depth: 2,
          subId: "1",
          partId: "SUB",
          partDescription: "Sub Assembly",
          qty: 2,
          status: "R",
          type: "M",
          startDate: null,
          finishDate: null,
          opSeq: null,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: null,
          parentSubId: "0",
          parentOpSeq: 10,
          sortKey: "000.001-0000-0000",
        },
      ]);

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      // Find the child WO node
      const childWO = result.tree.children[0].children.find(
        (n) => n.nodeType === "WO"
      );
      expect(childWO.formattedId).toBe("WO-001-1/1");
    });

    it("should format OP node with formattedDescription", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue([
        {
          nodeType: "WO",
          depth: 0,
          subId: "0",
          partId: "PART",
          partDescription: "Part",
          qty: 1,
          status: "R",
          type: "M",
          startDate: null,
          finishDate: null,
          opSeq: null,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0000-0000",
        },
        {
          nodeType: "OP",
          depth: 1,
          subId: "0",
          partId: null,
          partDescription: null,
          qty: null,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: "LASER",
          resourceDescription: "Laser Cutter",
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0000",
        },
      ]);

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      expect(result.tree.children[0].formattedDescription).toBe(
        "10 LASER [Laser Cutter]"
      );
    });

    it("should format MAT node with formattedPart", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue([
        {
          nodeType: "WO",
          depth: 0,
          subId: "0",
          partId: "MAIN",
          partDescription: "Main",
          qty: 1,
          status: "R",
          type: "M",
          startDate: null,
          finishDate: null,
          opSeq: null,
          resourceId: null,
          resourceDescription: null,
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0000-0000",
        },
        {
          nodeType: "OP",
          depth: 1,
          subId: "0",
          partId: null,
          partDescription: null,
          qty: null,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: "RES",
          resourceDescription: "Resource",
          dimensions: null,
          pieceNo: null,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0000",
        },
        {
          nodeType: "MAT",
          depth: 2,
          subId: "0",
          partId: "STEEL-001",
          partDescription: "Steel Plate 1/4",
          qty: 5,
          status: "R",
          type: null,
          startDate: null,
          finishDate: null,
          opSeq: 10,
          resourceId: null,
          resourceDescription: null,
          dimensions: "24x48",
          pieceNo: 1,
          parentSubId: null,
          parentOpSeq: null,
          sortKey: "000-0010-0001",
        },
      ]);

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      const matNode = result.tree.children[0].children[0];
      expect(matNode.formattedPart).toBe("STEEL-001 - Steel Plate 1/4");
      expect(matNode.dimensions).toBe("24x48");
    });
  });
});
