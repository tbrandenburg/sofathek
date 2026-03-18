import { YouTubeMetadataExtractor } from '../../../services/youTubeMetadataExtractor';

// Mock youtube-dl-exec
const mockExec = jest.fn();
jest.mock('youtube-dl-exec', () => ({
  exec: (...args: any[]) => mockExec(...args)
}));

// Mock validation utility
jest.mock('../../../utils/validation', () => ({
  validateYtDlpResponse: jest.fn((data) => data)
}));

describe('YouTubeMetadataExtractor', () => {
  let extractor: YouTubeMetadataExtractor;

  beforeEach(() => {
    extractor = new YouTubeMetadataExtractor();
    jest.clearAllMocks();
  });

  describe('extract', () => {
    it('should extract metadata successfully', async () => {
      const mockMetadata = {
        id: 'test123',
        title: 'Test Video',
        description: 'Test description',
        duration: 120,
        uploader: 'Test Channel'
      };

      const mockSubprocess = Promise.resolve(mockMetadata);
      (mockSubprocess as any).stderr = { on: jest.fn() };
      mockExec.mockReturnValue(mockSubprocess);

      const result = await extractor.extract('https://www.youtube.com/watch?v=test123');

      expect(mockExec).toHaveBeenCalledWith(
        'https://www.youtube.com/watch?v=test123',
        expect.objectContaining({
          dumpSingleJson: true,
          skipDownload: true,
          noCheckCertificates: true,
          jsRuntimes: 'node'
        })
      );
      expect(result.id).toBe('test123');
      expect(result.title).toBe('Test Video');
      expect(result.description).toBe('Test description');
      expect(result.duration).toBe(120);
      expect(result.uploader).toBe('Test Channel');
    });

    it('should handle missing optional fields', async () => {
      const mockMetadata = {
        id: 'test123',
        title: 'Test Video'
      };

      const mockSubprocess = Promise.resolve(mockMetadata);
      (mockSubprocess as any).stderr = { on: jest.fn() };
      mockExec.mockReturnValue(mockSubprocess);

      const result = await extractor.extract('https://www.youtube.com/watch?v=test123');

      expect(result.id).toBe('test123');
      expect(result.title).toBe('Test Video');
      expect(result.description).toBeUndefined();
      expect(result.duration).toBeUndefined();
    });

    it('should handle extraction errors', async () => {
      const mockSubprocess = Promise.reject(new Error('Download failed'));
      (mockSubprocess as any).stderr = { on: jest.fn() };
      mockExec.mockReturnValue(mockSubprocess);

      await expect(extractor.extract('https://www.youtube.com/watch?v=invalid'))
        .rejects.toThrow('Failed to get video metadata');
    });

    it('should use channel as uploader fallback', async () => {
      const mockMetadata = {
        id: 'test123',
        title: 'Test Video',
        channel: 'Test Channel'
      };

      const mockSubprocess = Promise.resolve(mockMetadata);
      (mockSubprocess as any).stderr = { on: jest.fn() };
      mockExec.mockReturnValue(mockSubprocess);

      const result = await extractor.extract('https://www.youtube.com/watch?v=test123');

      expect(result.uploader).toBe('Test Channel');
    });
  });
});