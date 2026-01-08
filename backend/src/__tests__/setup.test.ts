/**
 * Basic test to verify Jest setup works correctly
 * Tests Winston logger initialization
 */

describe('Jest Setup Verification', () => {
  it('should run basic tests correctly', () => {
    expect(true).toBe(true);
    expect(1 + 1).toBe(2);
  });

  it('should have access to test utilities', () => {
    expect(global.testUtils).toBeDefined();
    expect(global.testUtils.mockRequest).toBeDefined();
    expect(global.testUtils.mockResponse).toBeDefined();
  });

  it('should mock console methods', () => {
    console.log('This should be mocked');
    expect(console.log).toHaveBeenCalled();
  });
});
