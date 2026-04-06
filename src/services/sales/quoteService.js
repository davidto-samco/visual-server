const quoteRepository = require("../../repositories/sales/quoteRepository");
const { NotFoundError } = require("../../utils/errors");
const { validateRequired } = require("../../utils/validation");
const { formatQuoteDocument } = require("../../models/sales/Quote");
const logger = require("../../utils/logger");

/**
 * Get full quote document data by quote ID.
 * Returns all data needed to render a quote document (like the PDF quotation).
 */
async function getQuoteByQuoteId(quoteId) {
  const validatedId = validateRequired(quoteId, "Quote ID");
  const normalizedId = validatedId.toUpperCase();

  logger.info("Getting quote document", { quoteId: normalizedId });

  // Get quote header
  const header = await quoteRepository.findByQuoteId(normalizedId);
  if (!header) {
    throw new NotFoundError(`Quote ${normalizedId}`);
  }

  // Get quote-level extended description (spec block)
  const description = await quoteRepository.getQuoteDescription(normalizedId);

  // Get line items with pricing
  const rawLineItems = await quoteRepository.getLineItems(normalizedId);

  // Get extended descriptions for all line items
  const lineDescMap = await quoteRepository.getLineDescriptions(normalizedId);

  // Merge extended descriptions into line items
  const lineItems = rawLineItems.map((item) => ({
    ...item,
    extendedDescription: lineDescMap.get(item.lineNumber) || null,
  }));

  // Get linked customer orders
  const linkedOrders = await quoteRepository.getLinkedOrders(normalizedId);

  return formatQuoteDocument(header, description, lineItems, linkedOrders);
}

module.exports = {
  getQuoteByQuoteId,
};
