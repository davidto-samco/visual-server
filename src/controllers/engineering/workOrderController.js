const workOrderService = require("../../services/engineering/workOrderService");

async function search(req, res, next) {
  try {
    const result = await workOrderService.searchWorkOrders(
      req.query.baseId,
      req.query.page,
      req.query.limit
    );
    res.json({ success: true, data: result.results, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

async function getHeader(req, res, next) {
  try {
    const { baseId, lotId, subId } = req.params;
    const result = await workOrderService.getWorkOrderHeader(
      baseId,
      lotId,
      subId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getOperations(req, res, next) {
  try {
    const { baseId, lotId, subId } = req.params;
    const result = await workOrderService.getOperations(baseId, lotId, subId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getRequirements(req, res, next) {
  try {
    const { baseId, lotId, subId, sequence } = req.params;
    const result = await workOrderService.getRequirements(
      baseId,
      lotId,
      subId,
      Number(sequence)
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getSubWorkOrders(req, res, next) {
  try {
    const { baseId, lotId } = req.params;
    const result = await workOrderService.getSubWorkOrders(baseId, lotId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getWipBalance(req, res, next) {
  try {
    const { baseId, lotId, subId } = req.params;
    const result = await workOrderService.getWipBalance(baseId, lotId, subId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  search,
  getHeader,
  getOperations,
  getRequirements,
  getSubWorkOrders,
  getWipBalance,
};
