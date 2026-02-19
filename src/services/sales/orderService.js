const orderRepository = require("../../repositories/sales/orderRepository");
const { ValidationError, NotFoundError } = require("../../utils/errors");
const {
  validateRequired,
  validatePagination,
  validateDate,
  calculateOffset,
  calculateTotalPages,
} = require("../../utils/validation");
const {
  formatOrderSummary,
  formatOrderAcknowledgement,
  formatLineItem,
} = require("../../models/sales/Order");
const logger = require("../../utils/logger");

async function getRecentOrders(limit = 100) {
  const validLimit = Math.min(1000, Math.max(1, parseInt(limit) || 100));

  logger.info("Getting recent orders", { limit: validLimit });

  const orders = await orderRepository.getRecentOrders(validLimit);
  return orders.map(formatOrderSummary);
}

async function searchOrders(filters, page, limit) {
  const pagination = validatePagination(page, limit);

  // Validate dates if provided
  const parsedStartDate = filters.startDate
    ? validateDate(filters.startDate, "Start date")
    : null;
  const parsedEndDate = filters.endDate
    ? validateDate(filters.endDate, "End date")
    : null;

  // End date must be after start date
  if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
    throw new ValidationError("Start date must be before end date");
  }

  const customerName = filters.customerName?.trim() || null;

  logger.info("Searching orders with filters", {
    customerName,
    startDate: filters.startDate,
    endDate: filters.endDate,
    page: pagination.page,
    limit: pagination.limit,
  });

  // Get total count
  const total = await orderRepository.countWithFilters(
    customerName,
    parsedStartDate,
    parsedEndDate,
  );

  // Get paginated records
  const offset = calculateOffset(pagination.page, pagination.limit);
  const orders = await orderRepository.searchWithFilters(
    customerName,
    parsedStartDate,
    parsedEndDate,
    pagination.limit,
    offset,
  );

  return {
    records: orders.map(formatOrderSummary),
    meta: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: calculateTotalPages(total, pagination.limit),
    },
  };
}

async function getOrderByJobNumber(jobNumber) {
  const validatedJobNumber = validateRequired(jobNumber, "Job number");
  const normalizedJobNumber = validatedJobNumber.toUpperCase();

  logger.info("Getting order by job number", {
    jobNumber: normalizedJobNumber,
  });

  // Get order header
  const order = await orderRepository.findByJobNumber(normalizedJobNumber);

  if (!order) {
    throw new NotFoundError(`Order ${normalizedJobNumber}`);
  }

  // Get line items
  const lineItems = await orderRepository.getOrderLineItems(order.orderId);

  return formatOrderAcknowledgement(order, lineItems);
}

async function getOrderLineItems(jobNumber, page, limit) {
  const validatedJobNumber = validateRequired(jobNumber, "Job number");
  const normalizedJobNumber = validatedJobNumber.toUpperCase();
  const pagination = validatePagination(page, Math.min(limit || 50, 200));

  logger.info("Getting order line items", {
    jobNumber: normalizedJobNumber,
    page: pagination.page,
    limit: pagination.limit,
  });

  // Verify order exists
  const orderExists = await orderRepository.exists(normalizedJobNumber);
  if (!orderExists) {
    throw new NotFoundError(`Order ${normalizedJobNumber}`);
  }

  // Get total count
  const total = await orderRepository.countLineItems(normalizedJobNumber);

  // Get paginated records
  const offset = calculateOffset(pagination.page, pagination.limit);
  const lineItems = await orderRepository.getOrderLineItemsPaginated(
    normalizedJobNumber,
    pagination.limit,
    offset,
  );

  return {
    records: lineItems.map(formatLineItem),
    meta: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: calculateTotalPages(total, pagination.limit),
    },
  };
}

async function getLineExtendedDescription(jobNumber, lineNumber) {
  const validatedJobNumber = validateRequired(jobNumber, "Job number");
  const normalizedJobNumber = validatedJobNumber.toUpperCase();

  if (!lineNumber || lineNumber < 1) {
    throw new ValidationError("Line number must be a positive integer");
  }

  logger.info("Getting line extended description", {
    jobNumber: normalizedJobNumber,
    lineNumber,
  });

  return orderRepository.getLineExtendedDescription(
    normalizedJobNumber,
    lineNumber,
  );
}

module.exports = {
  getRecentOrders,
  searchOrders,
  getOrderByJobNumber,
  getOrderLineItems,
  getLineExtendedDescription,
};
