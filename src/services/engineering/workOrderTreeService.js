const workOrderTreeRepository = require("../../repositories/engineering/workOrderTreeRepository");
const { validateRequired } = require("../../utils/validation");
const { formatWorkOrderStatus } = require("../../models/engineering/WorkOrder");

function formatSimplifiedNode(node, baseId, lotId) {
  const hasSub = node.subId && node.subId !== "0";
  const formattedId = hasSub
    ? `${baseId}-${node.subId}/${lotId}`
    : `${baseId}/${lotId}`;

  return {
    subId: String(node.subId),
    partId: node.partId || null,
    partDescription: node.partDescription || null,
    orderQty: node.orderQty,
    status: node.status,
    formattedStatus: formatWorkOrderStatus(node.status),
    formattedId,
    startDate: node.startDate,
    finishDate: node.finishDate,
    closeDate: node.closeDate,
    children: [],
  };
}

function formatDetailedNode(node, baseId, lotId) {
  const base = {
    nodeType: node.nodeType,
    depth: node.depth,
    subId: String(node.subId),
    status: node.status,
    formattedStatus: formatWorkOrderStatus(node.status),
  };

  switch (node.nodeType) {
    case "WO": {
      const hasSub = node.subId && String(node.subId) !== "0";
      return {
        ...base,
        partId: node.partId || null,
        partDescription: node.partDescription || null,
        orderQty: node.qty,
        formattedId: hasSub
          ? `${baseId}-${node.subId}/${lotId}`
          : `${baseId}/${lotId}`,
        startDate: node.startDate,
        finishDate: node.finishDate,
        // internal: used for nesting, stripped before response
        _parentSubId: null,
        _parentOpSeq: null,
        children: [],
      };
    }

    case "OP":
      return {
        ...base,
        opSeq: node.opSeq,
        resourceId: node.resourceId,
        resourceDescription: node.resourceDescription || null,
        formattedDescription:
          `${node.opSeq} ${node.resourceId || ""} [${node.resourceDescription || ""}]`.trim(),
        children: [],
      };

    case "MAT":
      return {
        ...base,
        opSeq: node.opSeq,
        pieceNo: node.pieceNo,
        partId: node.partId || null,
        partDescription: node.partDescription || null,
        qty: node.qty,
        dimensions: node.dimensions || null,
        formattedPart: `${node.partId || ""} - ${node.partDescription || "Unknown"}`,
        children: [],
      };

    default:
      return { ...base, children: [] };
  }
}

/**
 * Build nested tree from flat work orders + relationship data.
 * Relationships are pre-sorted by OPERATION_SEQ_NO, PIECE_NO from SQL,
 * so iterating in order and pushing preserves the correct BOM sequence.
 */
function buildSimplifiedTree(woNodes, relationships) {
  if (woNodes.length === 0) return null;

  const woMap = new Map();
  woNodes.forEach((node) => woMap.set(String(node.subId), node));

  const root = woMap.get("0");
  if (!root) return null;

  relationships.forEach((rel) => {
    const parent = woMap.get(String(rel.parentSubId));
    const child = woMap.get(String(rel.childSubId));
    if (parent && child) {
      child._parentSubId = String(rel.parentSubId);
      parent.children.push(child);
    }
  });

  return root;
}

/**
 * Build nested detailed tree from flat data.
 *
 * Nesting rules (matches original application):
 *   Root WO      → children: [its OPs]
 *   OP           → children: [child WO label, child WO's OPs, MATs]
 *   child WO     → NO children (just a label/header node)
 *   MAT          → leaf (no children)
 *
 * Key insight: a child WO and its OPs are SIBLINGS under the parent OP.
 * The WO node is a label; its operations are "promoted" to the parent OP level.
 *
 * Ordering within each OP's children (matches original app):
 *   1. child WO labels + their OPs (interleaved per child, in BOM sequence)
 *   2. MATs (material requirements)
 */
function buildDetailedTree(woNodes, relationships, opNodes, matNodes) {
  if (woNodes.length === 0) return null;

  // Index WO nodes by subId (all keys as strings for consistency)
  const woMap = new Map();
  woNodes.forEach((node) => woMap.set(String(node.subId), node));

  const root = woMap.get("0");
  if (!root) return null;

  // Step 1: Set parentSubId and parentOpSeq on child WOs from relationships
  relationships.forEach((rel) => {
    const child = woMap.get(String(rel.childSubId));
    if (child) {
      child._parentSubId = String(rel.parentSubId);
      child._parentOpSeq = rel.opSeq;
    }
  });

  // Index OP nodes by "subId-opSeq" (string keys)
  const opMap = new Map();
  opNodes.forEach((node) => {
    opMap.set(`${String(node.subId)}-${node.opSeq}`, node);
  });

  // Step 2: Attach root WO's OPs directly to root
  // (root WO has _parentSubId == null, child WOs have it set from step 1)
  opNodes.forEach((node) => {
    const wo = woMap.get(String(node.subId));
    if (wo && String(node.subId) === "0") {
      root.children.push(node);
    }
  });

  // Step 3: Group child WO OPs by their WO subId for quick lookup
  const opsByWoSubId = new Map();
  opNodes.forEach((node) => {
    const wo = woMap.get(String(node.subId));
    if (wo && wo._parentSubId != null) {
      const key = String(node.subId);
      if (!opsByWoSubId.has(key)) opsByWoSubId.set(key, []);
      opsByWoSubId.get(key).push(node);
    }
  });

  // Step 4: Process relationships in BOM order (pre-sorted by opSeq, pieceNo)
  // For each child WO: push the WO label first, then its OPs as siblings
  // under the parent OP. This matches the original app's ordering.
  relationships.forEach((rel) => {
    const childWo = woMap.get(String(rel.childSubId));
    if (!childWo || childWo._parentSubId == null) return;

    const parentOp = opMap.get(
      `${String(childWo._parentSubId)}-${childWo._parentOpSeq}`,
    );
    if (!parentOp) return;

    // Push child WO as label/header node
    parentOp.children.push(childWo);

    // Push child WO's own OPs as siblings (under the same parent OP)
    const childOps = opsByWoSubId.get(String(rel.childSubId)) || [];
    childOps.forEach((op) => parentOp.children.push(op));
  });

  // Step 5: Attach MATs to their parent OP
  matNodes.forEach((node) => {
    const parentOp = opMap.get(`${String(node.subId)}-${node.opSeq}`);
    if (parentOp) {
      parentOp.children.push(node);
    }
  });

  // Step 6: Reorder — within each OP's children, put WO/OP nodes before MATs
  function reorderChildren(node) {
    if (node.children && node.children.length > 0) {
      const nonMats = node.children.filter((c) => c.nodeType !== "MAT");
      const mats = node.children.filter((c) => c.nodeType === "MAT");
      node.children = [...nonMats, ...mats];
      node.children.forEach(reorderChildren);
    }
  }
  reorderChildren(root);

  // Step 7: Recalculate depth based on actual nesting position
  function setDepth(node, depth) {
    node.depth = depth;
    if (node.children) {
      node.children.forEach((child) => setDepth(child, depth + 1));
    }
  }
  setDepth(root, 0);

  // Step 8: Strip internal fields
  woNodes.forEach((node) => {
    delete node._parentSubId;
    delete node._parentOpSeq;
  });

  return root;
}

/**
 * Walk the tree and count nodes by type.
 * Only counts nodes actually attached to the tree (ignores orphans).
 * For simplified trees (no nodeType), all nodes are counted as WO.
 */
function countTreeNodes(node) {
  const counts = { WO: 0, OP: 0, MAT: 0 };
  function walk(n) {
    // nodeType exists for detailed tree; simplified tree nodes are all WOs
    const type = n.nodeType || "WO";
    counts[type] = (counts[type] || 0) + 1;
    if (n.children) n.children.forEach(walk);
  }
  walk(node);
  return counts;
}

async function getSimplifiedTree(baseId, lotId) {
  const b = validateRequired(baseId, "BASE_ID");
  const l = validateRequired(lotId, "LOT_ID");

  const { workOrders, relationships } =
    await workOrderTreeRepository.getSimplifiedTree(b, l);

  if (workOrders.length === 0) {
    return { tree: null, totalWorkOrders: 0 };
  }

  const nodes = workOrders.map((row) => formatSimplifiedNode(row, b, l));
  const tree = buildSimplifiedTree(nodes, relationships);
  const counts = countTreeNodes(tree);

  return {
    tree,
    totalWorkOrders: counts.WO,
  };
}

async function getDetailedTree(baseId, lotId) {
  const b = validateRequired(baseId, "BASE_ID");
  const l = validateRequired(lotId, "LOT_ID");

  const { workOrders, relationships, operations, materials } =
    await workOrderTreeRepository.getDetailedTree(b, l);

  if (workOrders.length === 0) {
    return { tree: null, summary: null };
  }

  // Format all node types
  const woNodes = workOrders.map((row) =>
    formatDetailedNode(
      {
        nodeType: "WO",
        depth: 0,
        subId: row.subId,
        partId: row.partId,
        partDescription: row.partDescription,
        qty: row.orderQty,
        status: row.status,
        type: row.type,
        startDate: row.startDate,
        finishDate: row.finishDate,
      },
      b,
      l,
    ),
  );

  const opNodes = operations.map((row) =>
    formatDetailedNode(
      {
        nodeType: "OP",
        depth: 0,
        subId: row.subId,
        opSeq: row.opSeq,
        resourceId: row.resourceId,
        resourceDescription: row.resourceDescription,
        status: row.status,
      },
      b,
      l,
    ),
  );

  const matNodes = materials.map((row) =>
    formatDetailedNode(
      {
        nodeType: "MAT",
        depth: 0,
        subId: row.subId,
        opSeq: row.opSeq,
        pieceNo: row.pieceNo,
        partId: row.partId,
        partDescription: row.partDescription,
        qty: row.qty,
        status: row.status,
        dimensions: row.dimensions,
      },
      b,
      l,
    ),
  );

  const tree = buildDetailedTree(woNodes, relationships, opNodes, matNodes);
  const counts = countTreeNodes(tree);

  return {
    tree,
    summary: {
      workOrders: counts.WO,
      operations: counts.OP,
      materials: counts.MAT,
      totalNodes: counts.WO + counts.OP + counts.MAT,
    },
  };
}

module.exports = {
  getSimplifiedTree,
  getDetailedTree,
};
