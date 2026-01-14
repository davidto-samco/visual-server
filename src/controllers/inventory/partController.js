const partService = require("../../services/inventory/partService");

async function search(req, res, next) {
  try {
    const result = await partService.searchPart(
      req.query.partNumber,
      req.query.page,
      req.query.limit
    );
    res.json({ success: true, data: result.results, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const result = await partService.getPartById(req.params.partId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getWhereUsed(req, res, next) {
  try {
    const result = await partService.getWhereUsed(
      req.params.partId,
      req.query.page,
      req.query.limit
    );
    res.json({ success: true, data: result.records, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

async function getExtendedDescription(req, res, next) {
  try {
    const result = await partService.getExtendedDescription(req.params.partId);
    res.json({ success: true, data: { extendedDescription: result } });
  } catch (error) {
    next(error);
  }
}

module.exports = { search, getById, getWhereUsed, getExtendedDescription };
