const workOrderRepository = require("../../repositories/engineering/workOrderRepository");
const { ValidationError, NotFoundError } = require("../../utils/errors");
const {
  validateRequired,
  validatePagination,
  calculateOffset,
  calculateTotalPages,
} = require("../../utils/validation");
const { formatWorkOrder } = require("../../models/engineering/WorkOrder");
const { formatOperation } = require("../../models/engineering/Operation");
const { formatRequirement } = require("../../models/engineering/Requirement");

function normalizeSubId(subId) {
  return subId === "-" ? "" : subId || "";
}

async function searchWorkOrders(baseIdPattern, page, limit) {
  const pattern = validateRequired(
    baseIdPattern,
    "BASE_ID pattern",
  ).toUpperCase();
  const pagination = validatePagination(page, limit);

  const total = await workOrderRepository.countByBaseId(pattern);
  const offset = calculateOffset(pagination.page, pagination.limit);
  const workOrders = await workOrderRepository.search(
    pattern,
    pagination.limit,
    offset,
  );

  return {
    results: workOrders.map(formatWorkOrder),
    meta: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: calculateTotalPages(total, pagination.limit),
    },
  };
}

async function getWorkOrderHeader(baseId, lotId, subId) {
  const b = validateRequired(baseId, "BASE_ID");
  const l = validateRequired(lotId, "LOT_ID");
  const s = normalizeSubId(subId);

  const workOrder = await workOrderRepository.findByCompositeKey(b, l, s);
  if (!workOrder) throw new NotFoundError(`Work Order ${b}/${l}`);

  const counts = await workOrderRepository.getAggregateCounts(b, l, s);
  return { ...formatWorkOrder(workOrder), counts };
}

async function getOperations(baseId, lotId, subId) {
  validateRequired(baseId, "BASE_ID");
  validateRequired(lotId, "LOT_ID");
  const operations = await workOrderRepository.getOperations(
    baseId,
    lotId,
    normalizeSubId(subId),
  );
  return operations.map(formatOperation);
}

async function getRequirements(baseId, lotId, subId, operationSeq) {
  validateRequired(baseId, "BASE_ID");
  validateRequired(lotId, "LOT_ID");
  if (!operationSeq || operationSeq < 1)
    throw new ValidationError("Operation sequence required");
  const requirements = await workOrderRepository.getRequirements(
    baseId,
    lotId,
    normalizeSubId(subId),
    operationSeq,
  );
  return requirements.map(formatRequirement);
}

async function getSubWorkOrders(baseId, lotId, maxDepth = 10) {
  validateRequired(baseId, "BASE_ID");
  validateRequired(lotId, "LOT_ID");

  const startTime = Date.now();

  // Fetch all data with two simple queries
  const { workOrders, relationships } =
    await workOrderRepository.getSubWorkOrders(baseId, lotId);

  const fetchTime = Date.now() - startTime;

  // Build parent-child relationship map
  const parentMap = new Map();
  relationships.forEach((rel) => {
    parentMap.set(rel.childSubId, rel.parentSubId);
  });

  // Build work order lookup map
  const woMap = new Map();
  workOrders.forEach((wo) => {
    woMap.set(wo.subId, wo);
  });

  // Calculate depth and path for each work order
  const levelCache = new Map();
  const pathCache = new Map();

  levelCache.set("0", 0);
  pathCache.set("0", `${baseId}/${lotId}/0`);

  function calculateHierarchy(subId, visited = new Set()) {
    if (levelCache.has(subId)) {
      return {
        depth: levelCache.get(subId),
        path: pathCache.get(subId),
      };
    }

    if (visited.has(subId)) {
      console.warn(`Circular reference detected: ${subId}`);
      return { depth: 999, path: "CIRCULAR" };
    }

    visited.add(subId);

    const parentSubId = parentMap.get(subId);

    if (!parentSubId) {
      const depth = 1;
      const path = `${baseId}/${lotId}/0 -> ${baseId}/${lotId}/${subId}`;
      levelCache.set(subId, depth);
      pathCache.set(subId, path);
      return { depth, path };
    }

    const parentHierarchy = calculateHierarchy(parentSubId, new Set(visited));

    const depth = parentHierarchy.depth + 1;
    const path = `${parentHierarchy.path} -> ${baseId}/${lotId}/${subId}`;

    if (depth > maxDepth) {
      console.warn(`Max depth ${maxDepth} exceeded for ${subId}`);
      return { depth: maxDepth, path };
    }

    levelCache.set(subId, depth);
    pathCache.set(subId, path);

    return { depth, path };
  }

  // Calculate hierarchy for all work orders
  const enrichedWorkOrders = workOrders.map((wo) => {
    const hierarchy = calculateHierarchy(wo.subId);

    return {
      ...formatWorkOrder(wo),
      depth: hierarchy.depth,
      level: hierarchy.depth,
      path: hierarchy.path,
      parentSubId: parentMap.get(wo.subId) || null,
    };
  });

  // Sort by path
  const sorted = enrichedWorkOrders.sort((a, b) => {
    return a.path.localeCompare(b.path);
  });

  const totalTime = Date.now() - startTime;
  const calcTime = totalTime - fetchTime;

  console.log(
    `getSubWorkOrders completed: fetch=${fetchTime}ms, calc=${calcTime}ms, total=${totalTime}ms, count=${sorted.length}`,
  );

  return sorted;
}

// async function getSubWorkOrders(baseId, lotId) {
//   validateRequired(baseId, "BASE_ID");
//   validateRequired(lotId, "LOT_ID");
//   const subWorkOrders = await workOrderRepository.getSubWorkOrders(
//     baseId,
//     lotId,
//   );
//   return subWorkOrders.map(formatWorkOrder);
// }

async function getWipBalance(baseId, lotId, subId) {
  validateRequired(baseId, "BASE_ID");
  validateRequired(lotId, "LOT_ID");
  return workOrderRepository.getWipBalance(
    baseId,
    lotId,
    normalizeSubId(subId),
  );
}

module.exports = {
  searchWorkOrders,
  getWorkOrderHeader,
  getOperations,
  getRequirements,
  getSubWorkOrders,
  getWipBalance,
};
