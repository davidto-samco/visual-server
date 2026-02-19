const partRepository = require("../../repositories/inventory/partRepository");
const { NotFoundError } = require("../../utils/errors");
const {
  validateRequired,
  validatePagination,
  calculateOffset,
  calculateTotalPages,
} = require("../../utils/validation");
const { formatWhereUsed } = require("../../models/inventory/WhereUsed");

async function searchPart(partNumber, page, limit) {
  const normalized = validateRequired(partNumber, "Part number").toUpperCase();
  const pagination = validatePagination(page, limit);

  const total = await partRepository.countByPartNumber(normalized);
  const offset = calculateOffset(pagination.page, pagination.limit);
  const results = await partRepository.searchByPartNumber(
    normalized,
    pagination.limit,
    offset
  );
  return {
    results,
    meta: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: calculateTotalPages(total, pagination.limit),
    },
  };
}

async function getPartById(partId) {
  const normalized = validateRequired(partId, "Part ID").toUpperCase();
  const part = await partRepository.findById(normalized);
  if (!part) throw new NotFoundError(`Part ${partId}`);
  return part;
}

async function getWhereUsed(partId, page, limit) {
  const normalized = validateRequired(partId, "Part ID").toUpperCase();
  const pagination = validatePagination(page, limit);

  const exists = await partRepository.exists(normalized);
  if (!exists) throw new NotFoundError(`Part ${partId}`);

  const total = await partRepository.countWhereUsed(normalized);
  const offset = calculateOffset(pagination.page, pagination.limit);
  const records = await partRepository.getWhereUsed(
    normalized,
    pagination.limit,
    offset
  );

  return {
    records: records.map(formatWhereUsed),
    meta: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: calculateTotalPages(total, pagination.limit),
    },
  };
}

async function getExtendedDescription(partId) {
  const normalized = validateRequired(partId, "Part ID").toUpperCase();

  const exists = await partRepository.exists(normalized);
  if (!exists) throw new NotFoundError(`Part ${partId}`);

  return partRepository.getExtendedDescription(normalized);
}

module.exports = {
  searchPart,
  getPartById,
  getWhereUsed,
  getExtendedDescription,
};
