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

module.exports = { createDbMock };
