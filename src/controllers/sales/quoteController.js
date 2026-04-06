const quoteService = require("../../services/sales/quoteService");

async function getQuoteByQuoteId(req, res, next) {
  try {
    const { quoteId } = req.params;
    const quote = await quoteService.getQuoteByQuoteId(quoteId);
    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getQuoteByQuoteId,
};
