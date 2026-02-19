const workOrderTreeRepository = require("../../repositories/engineering/workOrderTreeRepository");
const { validateRequired } = require("../../utils/validation");
const { formatWorkOrderStatus } = require("../../models/engineering/WorkOrder");

function formatSimplifiedNode(node, baseId, lotId) {
  const hasSub = node.subId && node.subId !== "0";
  const formattedId = hasSub
    ? `${baseId}-${node.subId}/${lotId}`
    : `${baseId}/${lotId}`;

  return {
    subId: node.subId,
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
    subId: node.subId,
    status: node.status,
    formattedStatus: formatWorkOrderStatus(node.status),
  };

  switch (node.nodeType) {
    case "WO": {
      const hasSub = node.subId && node.subId !== "0";
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
        _parentSubId: node.parentSubId || null,
        _parentOpSeq: node.parentOpSeq || null,
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
 * Build nested tree from flat simplified rows.
 * Simplified = WO nodes only, nested by parentSubId.
 */
function buildSimplifiedTree(flatNodes) {
  if (flatNodes.length === 0) return null;

  // Map WO nodes by subId
  const woMap = new Map();
  flatNodes.forEach((node) => woMap.set(node.subId, node));

  // Root is always subId '0'
  const root = woMap.get("0");

  // Attach children to parents
  flatNodes.forEach((node) => {
    if (node.subId === "0") return; // skip root
    const parent = woMap.get(node._parentSubId);
    if (parent) {
      parent.children.push(node);
    }
  });

  return root;
}

/**
 * Build nested tree from flat detailed rows.
 *
 * Nesting rules (matches original application):
 *   Root WO      → children: [its OPs]
 *   OP           → children: [child WOs (as labels), child WO's OPs, MATs]
 *   child WO     → NO children (just a label/header node)
 *   MAT          → leaf (no children)
 *
 * Key insight: a child WO and its OPs are SIBLINGS under the parent OP.
 * The WO node is a label; its operations are "promoted" to the parent OP level.
 *
 * Ordering: child WOs + their OPs first, then MATs (matches original app)
 */
function buildDetailedTree(flatNodes) {
  if (flatNodes.length === 0) return null;

  // Index WO nodes by subId
  const woMap = new Map();
  // Index OP nodes by "subId-opSeq"
  const opMap = new Map();

  // First pass: index all nodes
  flatNodes.forEach((node) => {
    if (node.nodeType === "WO") {
      woMap.set(node.subId, node);
    } else if (node.nodeType === "OP") {
      opMap.set(`${node.subId}-${node.opSeq}`, node);
    }
  });

  const root = woMap.get("0");
  if (!root) return null;

  // Second pass: attach children
  // flatNodes is sorted by sortKey, so push order preserves correct ordering
  flatNodes.forEach((node) => {
    if (node.nodeType === "OP") {
      const wo = woMap.get(node.subId);
      if (wo && wo._parentSubId == null) {
        // OP of root WO → child of root WO
        root.children.push(node);
      } else if (wo && wo._parentSubId != null) {
        // OP of a child WO → sibling of the child WO under parent OP
        const parentOp = opMap.get(`${wo._parentSubId}-${wo._parentOpSeq}`);
        if (parentOp) {
          parentOp.children.push(node);
        }
      }
    } else if (node.nodeType === "MAT") {
      // MAT → child of OP with same subId + opSeq
      const parentOp = opMap.get(`${node.subId}-${node.opSeq}`);
      if (parentOp) {
        parentOp.children.push(node);
      }
    } else if (node.nodeType === "WO" && node._parentSubId != null) {
      // child WO → child of parent OP (as label, no children of its own)
      const parentOp = opMap.get(`${node._parentSubId}-${node._parentOpSeq}`);
      if (parentOp) {
        parentOp.children.push(node);
      }
    }
  });
  // Reorder: within each OP's children, put WO/OP nodes before MATs
  // (child WOs and their OPs come first, then materials)
  function reorderChildren(node) {
    if (node.children.length > 0) {
      const nonMats = node.children.filter((c) => c.nodeType !== "MAT");
      const mats = node.children.filter((c) => c.nodeType === "MAT");
      node.children = [...nonMats, ...mats];
      node.children.forEach(reorderChildren);
    }
  }
  reorderChildren(root);

  // Recalculate depth based on actual nesting position
  function setDepth(node, depth) {
    node.depth = depth;
    node.children.forEach((child) => setDepth(child, depth + 1));
  }
  setDepth(root, 0);

  // Strip internal fields
  flatNodes.forEach((node) => {
    delete node._parentSubId;
    delete node._parentOpSeq;
  });

  return woMap.get("0") || null;
}

async function getSimplifiedTree(baseId, lotId) {
  const b = validateRequired(baseId, "BASE_ID");
  const l = validateRequired(lotId, "LOT_ID");

  const rows = await workOrderTreeRepository.getSimplifiedTree(b, l);

  if (rows.length === 0) {
    return { root: null, totalWorkOrders: 0 };
  }

  const nodes = rows.map((row) => {
    const formatted = formatSimplifiedNode(row, b, l);
    formatted._parentSubId = row.parentSubId || null;
    return formatted;
  });

  const tree = buildSimplifiedTree(nodes);

  return {
    tree,
    totalWorkOrders: nodes.length,
  };
}

async function getDetailedTree(baseId, lotId) {
  const b = validateRequired(baseId, "BASE_ID");
  const l = validateRequired(lotId, "LOT_ID");

  const rows = await workOrderTreeRepository.getDetailedTree(b, l);

  if (rows.length === 0) {
    return { root: null, summary: null };
  }

  const nodes = rows.map((row) => formatDetailedNode(row, b, l));

  // Summary counts before nesting
  const woCount = nodes.filter((n) => n.nodeType === "WO").length;
  const opCount = nodes.filter((n) => n.nodeType === "OP").length;
  const matCount = nodes.filter((n) => n.nodeType === "MAT").length;

  const tree = buildDetailedTree(nodes);

  return {
    tree,
    summary: {
      workOrders: woCount,
      operations: opCount,
      materials: matCount,
      totalNodes: nodes.length,
    },
  };
}

module.exports = {
  getSimplifiedTree,
  getDetailedTree,
};
