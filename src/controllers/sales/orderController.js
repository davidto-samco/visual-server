const orderService = require("../../services/sales/orderService");

async function getOrders(req, res, next) {
  try {
    const { customerName, startDate, endDate, page, limit } = req.query;

    let result;

    // Check if any filters are provided
    const hasFilters = customerName || startDate || endDate;

    if (hasFilters) {
      // Use combined filter search
      result = await orderService.searchOrders(
        { customerName, startDate, endDate },
        page,
        limit,
      );
    } else {
      // Get recent orders (no filters)
      const orders = await orderService.getRecentOrders(limit);
      result = { records: orders };
    }

    res.json({
      success: true,
      data: result.records,
      meta: result.meta || undefined,
    });
  } catch (error) {
    next(error);
  }
}

async function getOrderByJobNumber(req, res, next) {
  try {
    const { jobNumber } = req.params;
    const order = await orderService.getOrderByJobNumber(jobNumber);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

async function getOrderLineItems(req, res, next) {
  try {
    const { jobNumber } = req.params;
    const { page, limit } = req.query;
    const result = await orderService.getOrderLineItems(jobNumber, page, limit);
    res.json({
      success: true,
      data: result.records,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

async function getLineExtendedDescription(req, res, next) {
  try {
    const { jobNumber, lineNumber } = req.params;
    const description = await orderService.getLineExtendedDescription(
      jobNumber,
      parseInt(lineNumber),
    );
    res.json({
      success: true,
      data: { extendedDescription: description },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOrders,
  getOrderByJobNumber,
  getOrderLineItems,
  getLineExtendedDescription,
};
