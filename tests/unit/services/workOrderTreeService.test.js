const workOrderTreeService = require("../../../src/services/engineering/workOrderTreeService");
const workOrderTreeRepository = require("../../../src/repositories/engineering/workOrderTreeRepository");
const { ValidationError } = require("../../../src/utils/errors");

jest.mock("../../../src/repositories/engineering/workOrderTreeRepository");

describe("WorkOrderTreeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSimplifiedTree", () => {
    it("should return null tree when no data found", async () => {
      workOrderTreeRepository.getSimplifiedTree.mockResolvedValue({
        workOrders: [],
        relationships: [],
      });

      const result = await workOrderTreeService.getSimplifiedTree("WO-001", "1");

      expect(result.tree).toBeNull();
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
      workOrderTreeRepository.getSimplifiedTree.mockResolvedValue({
        workOrders: [
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
          },
        ],
        relationships: [],
      });

      const result = await workOrderTreeService.getSimplifiedTree("WO-001", "1");

      expect(result.tree).not.toBeNull();
      expect(result.tree.subId).toBe("0");
      expect(result.tree.formattedId).toBe("WO-001/1");
      expect(result.tree.children).toEqual([]);
      expect(result.totalWorkOrders).toBe(1);
    });

    it("should build nested tree with children", async () => {
      workOrderTreeRepository.getSimplifiedTree.mockResolvedValue({
        workOrders: [
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
          },
        ],
        relationships: [
          { parentSubId: "0", childSubId: "1", opSeq: 10, pieceNo: 1 },
          { parentSubId: "1", childSubId: "2", opSeq: 10, pieceNo: 1 },
        ],
      });

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
      workOrderTreeRepository.getSimplifiedTree.mockResolvedValue({
        workOrders: [
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
          },
        ],
        relationships: [],
      });

      const result = await workOrderTreeService.getSimplifiedTree("WO-001", "1");

      expect(result.tree.status).toBe("R");
      expect(result.tree.formattedStatus).toBe("[R]");
    });
  });

  describe("getDetailedTree", () => {
    it("should return null tree when no data found", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue({
        workOrders: [],
        relationships: [],
        operations: [],
        materials: [],
      });

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      expect(result.tree).toBeNull();
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
      workOrderTreeRepository.getDetailedTree.mockResolvedValue({
        workOrders: [
          {
            subId: "0",
            partId: "MAIN-ASSY",
            partDescription: "Main Assembly",
            orderQty: 1,
            status: "R",
            type: "M",
            startDate: new Date("2024-01-01"),
            finishDate: new Date("2024-01-15"),
          },
        ],
        relationships: [],
        operations: [
          {
            subId: "0",
            opSeq: 10,
            resourceId: "WELD-01",
            resourceDescription: "Welding Station 1",
            status: "R",
          },
        ],
        materials: [
          {
            subId: "0",
            opSeq: 10,
            pieceNo: 1,
            partId: "STEEL-PLATE",
            partDescription: "Steel Plate",
            qty: 5,
            status: "R",
            dimensions: "24x48",
          },
        ],
      });

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      expect(result.tree).not.toBeNull();
      expect(result.tree.nodeType).toBe("WO");
      expect(result.tree.children).toHaveLength(1);
      expect(result.tree.children[0].nodeType).toBe("OP");
      expect(result.tree.children[0].children).toHaveLength(1);
      expect(result.tree.children[0].children[0].nodeType).toBe("MAT");
    });

    it("should return summary with correct counts", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue({
        workOrders: [
          {
            subId: "0",
            partId: "MAIN",
            partDescription: "Main",
            orderQty: 1,
            status: "R",
            type: "M",
            startDate: null,
            finishDate: null,
          },
        ],
        relationships: [],
        operations: [
          {
            subId: "0",
            opSeq: 10,
            resourceId: "RES-01",
            resourceDescription: "Resource 1",
            status: "R",
          },
          {
            subId: "0",
            opSeq: 20,
            resourceId: "RES-02",
            resourceDescription: "Resource 2",
            status: "R",
          },
        ],
        materials: [
          {
            subId: "0",
            opSeq: 10,
            pieceNo: 1,
            partId: "MAT-001",
            partDescription: "Material 1",
            qty: 10,
            status: "R",
            dimensions: null,
          },
          {
            subId: "0",
            opSeq: 10,
            pieceNo: 2,
            partId: "MAT-002",
            partDescription: "Material 2",
            qty: 5,
            status: "R",
            dimensions: null,
          },
        ],
      });

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      expect(result.summary.workOrders).toBe(1);
      expect(result.summary.operations).toBe(2);
      expect(result.summary.materials).toBe(2);
      expect(result.summary.totalNodes).toBe(5);
    });

    it("should format WO node with correct formattedId", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue({
        workOrders: [
          {
            subId: "0",
            partId: "PART-001",
            partDescription: "Part Description",
            orderQty: 10,
            status: "R",
            type: "M",
            startDate: null,
            finishDate: null,
          },
        ],
        relationships: [],
        operations: [],
        materials: [],
      });

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      expect(result.tree.formattedId).toBe("WO-001/1");
    });

    it("should format child WO node with sub ID in formattedId", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue({
        workOrders: [
          {
            subId: "0",
            partId: "MAIN",
            partDescription: "Main",
            orderQty: 1,
            status: "R",
            type: "M",
            startDate: null,
            finishDate: null,
          },
          {
            subId: "1",
            partId: "SUB",
            partDescription: "Sub Assembly",
            orderQty: 2,
            status: "R",
            type: "M",
            startDate: null,
            finishDate: null,
          },
        ],
        relationships: [
          { parentSubId: "0", childSubId: "1", opSeq: 10, pieceNo: 1 },
        ],
        operations: [
          {
            subId: "0",
            opSeq: 10,
            resourceId: "RES",
            resourceDescription: "Resource",
            status: "R",
          },
        ],
        materials: [],
      });

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      // Find the child WO node (it's a sibling of its OPs under the parent OP)
      const childWO = result.tree.children[0].children.find(
        (n) => n.nodeType === "WO"
      );
      expect(childWO.formattedId).toBe("WO-001-1/1");
    });

    it("should format OP node with formattedDescription", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue({
        workOrders: [
          {
            subId: "0",
            partId: "PART",
            partDescription: "Part",
            orderQty: 1,
            status: "R",
            type: "M",
            startDate: null,
            finishDate: null,
          },
        ],
        relationships: [],
        operations: [
          {
            subId: "0",
            opSeq: 10,
            resourceId: "LASER",
            resourceDescription: "Laser Cutter",
            status: "R",
          },
        ],
        materials: [],
      });

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      expect(result.tree.children[0].formattedDescription).toBe(
        "10 LASER [Laser Cutter]"
      );
    });

    it("should format MAT node with formattedPart", async () => {
      workOrderTreeRepository.getDetailedTree.mockResolvedValue({
        workOrders: [
          {
            subId: "0",
            partId: "MAIN",
            partDescription: "Main",
            orderQty: 1,
            status: "R",
            type: "M",
            startDate: null,
            finishDate: null,
          },
        ],
        relationships: [],
        operations: [
          {
            subId: "0",
            opSeq: 10,
            resourceId: "RES",
            resourceDescription: "Resource",
            status: "R",
          },
        ],
        materials: [
          {
            subId: "0",
            opSeq: 10,
            pieceNo: 1,
            partId: "STEEL-001",
            partDescription: "Steel Plate 1/4",
            qty: 5,
            status: "R",
            dimensions: "24x48",
          },
        ],
      });

      const result = await workOrderTreeService.getDetailedTree("WO-001", "1");

      const matNode = result.tree.children[0].children[0];
      expect(matNode.formattedPart).toBe("STEEL-001 - Steel Plate 1/4");
      expect(matNode.dimensions).toBe("24x48");
    });
  });
});
