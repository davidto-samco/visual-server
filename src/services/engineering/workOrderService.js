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
    offset
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

async function getSubWorkOrders(baseId, lotId) {
  validateRequired(baseId, "BASE_ID");
  validateRequired(lotId, "LOT_ID");
  const subWorkOrders = await workOrderRepository.getSubWorkOrders(
    baseId,
    lotId,
  );
  return subWorkOrders.map(formatWorkOrder);
}

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
