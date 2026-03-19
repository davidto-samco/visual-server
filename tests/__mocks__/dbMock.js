// tests/__mocks__/dbMock.js
// Reusable factory — call createDbMock(rows) in each test
function createDbMock(recordset = []) {
  const mockQuery = jest.fn().mockResolvedValue({ recordset });
  const mockInput = jest.fn().mockReturnThis(); // enables chaining
  const mockRequest = jest.fn().mockReturnValue({
    input: mockInput,
    query: mockQuery,
  });
  const mockPool = { request: mockRequest };

  return { mockPool, mockQuery, mockInput, mockRequest };
}

/**
 * Create a mock that returns different results for sequential queries
 * @param {Array<Array>} recordsets - Array of recordsets, one for each query call
 */
function createMultiQueryDbMock(recordsets = []) {
  let callIndex = 0;
  const mockQuery = jest.fn().mockImplementation(() => {
    const recordset = recordsets[callIndex] || [];
    callIndex++;
    return Promise.resolve({ recordset });
  });
  const mockInput = jest.fn().mockReturnThis();
  const mockRequest = jest.fn().mockReturnValue({
    input: mockInput,
    query: mockQuery,
  });
  const mockPool = { request: mockRequest };

  return { mockPool, mockQuery, mockInput, mockRequest };
}

module.exports = { createDbMock, createMultiQueryDbMock };
