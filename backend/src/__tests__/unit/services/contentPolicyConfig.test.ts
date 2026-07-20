describe('contentPolicyConfig', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('treats a missing settings file as an empty/default policy', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({ ...jest.requireActual('fs'), existsSync: () => false }));
      const { contentPolicy } = require('../../../services/contentPolicyConfig');
      expect(contentPolicy.blockedTags).toEqual([]);
      expect(contentPolicy.blockedCategories).toEqual([]);
      expect(contentPolicy.blockedTerms).toEqual([]);
    });
  });

  it('loads a valid content policy from settings.json', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        existsSync: () => true,
        readFileSync: () => JSON.stringify({
          contentPolicy: {
            blockedTags: ['gaming'],
            blockedCategories: ['Gaming'],
            blockedTerms: ['fortnite'],
            message: 'Blocked!'
          }
        })
      }));
      const { contentPolicy } = require('../../../services/contentPolicyConfig');
      expect(contentPolicy.blockedTags).toEqual(['gaming']);
      expect(contentPolicy.message).toBe('Blocked!');
    });
  });

  it('throws a clear error on invalid JSON', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        existsSync: () => true,
        readFileSync: () => '{ invalid json',
      }));
      expect(() => require('../../../services/contentPolicyConfig')).toThrow(/Invalid JSON/);
    });
  });

  it('throws a clear error when contentPolicy has invalid types', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        existsSync: () => true,
        readFileSync: () => JSON.stringify({ contentPolicy: { blockedTags: 'not-an-array' } }),
      }));
      expect(() => require('../../../services/contentPolicyConfig')).toThrow(/Invalid content policy settings/);
    });
  });

  it('treats an empty settings.json as an empty/default policy', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        existsSync: () => true,
        readFileSync: () => JSON.stringify({}),
      }));
      const { contentPolicy } = require('../../../services/contentPolicyConfig');
      expect(contentPolicy.blockedTags).toEqual([]);
    });
  });
});
