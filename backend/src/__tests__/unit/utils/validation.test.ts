import { validateYtDlpResponse } from '../../../utils/validation';

describe('validation', () => {
  describe('validateYtDlpResponse', () => {
    it('should validate correct yt-dlp response', () => {
      const validResponse = {
        id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        duration: 120,
        view_count: 1000,
        thumbnail: 'https://example.com/thumb.jpg'
      };
      
      const result = validateYtDlpResponse(validResponse);
      expect(result.id).toBe('dQw4w9WgXcQ');
      expect(result.title).toBe('Test Video');
    });

    it('should throw on invalid data types', () => {
      const invalidResponse = {
        duration: 'not-a-number', // Wrong type - should be number
        view_count: 'also-not-a-number' // Wrong type - should be number
      };
      
      expect(() => validateYtDlpResponse(invalidResponse)).toThrow();
    });

    it('should handle partial responses', () => {
      const partialResponse = {
        id: 'test123'
      };
      
      const result = validateYtDlpResponse(partialResponse);
      expect(result.id).toBe('test123');
    });

    it('should handle empty object', () => {
      const emptyResponse = {};
      
      const result = validateYtDlpResponse(emptyResponse);
      expect(result).toEqual({});
    });

    it('should handle all fields present', () => {
      const fullResponse = {
        id: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        description: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
        duration: 213,
        uploader: 'RickAstleyVEVO',
        channel: 'RickAstleyVEVO',
        upload_date: '20091025',
        view_count: 1392485951,
        width: 1920,
        height: 1080,
        resolution: '1920x1080',
        fps: 30,
        vcodec: 'h264',
        acodec: 'aac',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        webpage_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        like_count: 15000000,
        categories: ['Music'],
        tags: ['rick astley']
      };
      
      const result = validateYtDlpResponse(fullResponse);
      expect(result).toEqual(fullResponse);
    });
  });
});