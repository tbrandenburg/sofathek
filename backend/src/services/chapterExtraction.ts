import ytDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs-extra';
import { Chapter, VideoMetadata, SubtitleTrack } from '../types';

export interface ChapterInfo {
  title: string;
  start_time: number;
  end_time: number;
}

export class ChapterExtractionService {
  private ytDlp: ytDlpWrap;
  private ytDlpAvailable = false;

  constructor() {
    this.ytDlp = new ytDlpWrap();
    this.initializeYtDlp();
  }

  /**
   * Initialize yt-dlp binary
   */
  private async initializeYtDlp(): Promise<void> {
    try {
      const version = await this.ytDlp.getVersion();
      console.log(`yt-dlp version for chapter extraction: ${version}`);
      this.ytDlpAvailable = true;
    } catch (error) {
      console.log('yt-dlp not available for chapter extraction');
      this.ytDlpAvailable = false;
    }
  }

  /**
   * Extract chapters from YouTube video URL or info.json file
   */
  async extractChapters(
    urlOrPath: string,
    isFilePath = false
  ): Promise<Chapter[]> {
    try {
      let videoInfo: any;

      if (isFilePath && urlOrPath.endsWith('.info.json')) {
        // Read from existing info.json file
        videoInfo = await this.readInfoJson(urlOrPath);
      } else if (!isFilePath && this.ytDlpAvailable) {
        // Fetch from YouTube URL
        videoInfo = await this.ytDlp.getVideoInfo(urlOrPath);
      } else {
        // Return mock chapters for development
        return this.generateMockChapters();
      }

      return this.parseChaptersFromInfo(videoInfo);
    } catch (error) {
      console.error('Chapter extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract video metadata including chapters and subtitles
   */
  async extractMetadata(
    urlOrPath: string,
    isFilePath = false
  ): Promise<VideoMetadata> {
    try {
      let videoInfo: any;

      if (isFilePath && urlOrPath.endsWith('.info.json')) {
        videoInfo = await this.readInfoJson(urlOrPath);
      } else if (!isFilePath && this.ytDlpAvailable) {
        videoInfo = await this.ytDlp.getVideoInfo(urlOrPath);
      } else {
        return this.generateMockMetadata();
      }

      return this.parseMetadataFromInfo(videoInfo);
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      return this.generateMockMetadata();
    }
  }

  /**
   * Read and parse info.json file
   */
  private async readInfoJson(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read info.json:', error);
      throw error;
    }
  }

  /**
   * Parse chapters from yt-dlp video info
   */
  private parseChaptersFromInfo(videoInfo: any): Chapter[] {
    if (
      !videoInfo ||
      !videoInfo.chapters ||
      !Array.isArray(videoInfo.chapters)
    ) {
      return [];
    }

    return videoInfo.chapters.map(
      (chapter: ChapterInfo, index: number): Chapter => ({
        id: `chapter_${index}`,
        title: chapter.title || `Chapter ${index + 1}`,
        startTime: chapter.start_time || 0,
        endTime: chapter.end_time || chapter.start_time + 60,
        thumbnail: this.generateChapterThumbnail(videoInfo, chapter.start_time),
      })
    );
  }

  /**
   * Parse complete metadata from yt-dlp video info
   */
  private parseMetadataFromInfo(videoInfo: any): VideoMetadata {
    const chapters = this.parseChaptersFromInfo(videoInfo);
    const subtitles = this.parseSubtitlesFromInfo(videoInfo);

    return {
      title: videoInfo.title || 'Unknown Title',
      duration: videoInfo.duration || 0,
      chapters,
      subtitles,
      thumbnail: videoInfo.thumbnail || undefined,
      description: videoInfo.description || undefined,
    };
  }

  /**
   * Parse subtitles from yt-dlp video info
   */
  private parseSubtitlesFromInfo(videoInfo: any): SubtitleTrack[] {
    if (!videoInfo || !videoInfo.subtitles) {
      return [];
    }

    const subtitleTracks: SubtitleTrack[] = [];

    // yt-dlp stores subtitles as an object with language codes as keys
    Object.entries(videoInfo.subtitles).forEach(
      ([langCode, tracks]: [string, any]) => {
        if (Array.isArray(tracks)) {
          tracks.forEach((track, index) => {
            subtitleTracks.push({
              id: `subtitle_${langCode}_${index}`,
              language: langCode,
              path: track.filepath || track.url || '',
              default: langCode === 'en' && index === 0, // Default to first English track
            });
          });
        }
      }
    );

    return subtitleTracks;
  }

  /**
   * Generate chapter thumbnail URL/path
   */
  private generateChapterThumbnail(
    videoInfo: any,
    startTime: number
  ): string | undefined {
    // For YouTube videos, we can generate thumbnail URLs with timestamps
    if (videoInfo.id && videoInfo.webpage_url?.includes('youtube.com')) {
      // YouTube thumbnail format with timestamp (approximate)
      return `https://img.youtube.com/vi/${videoInfo.id}/maxresdefault.jpg`;
    }

    // Use main thumbnail as fallback
    return videoInfo.thumbnail;
  }

  /**
   * Generate mock chapters for development/testing
   */
  private generateMockChapters(): Chapter[] {
    return [
      {
        id: 'chapter_0',
        title: 'Introduction',
        startTime: 0,
        endTime: 30,
        thumbnail:
          'https://via.placeholder.com/320x180/1a1a1a/ffffff?text=Intro',
      },
      {
        id: 'chapter_1',
        title: 'Main Content',
        startTime: 30,
        endTime: 90,
        thumbnail:
          'https://via.placeholder.com/320x180/1a1a1a/ffffff?text=Main',
      },
      {
        id: 'chapter_2',
        title: 'Conclusion',
        startTime: 90,
        endTime: 120,
        thumbnail: 'https://via.placeholder.com/320x180/1a1a1a/ffffff?text=End',
      },
    ];
  }

  /**
   * Generate mock metadata for development/testing
   */
  private generateMockMetadata(): VideoMetadata {
    return {
      title: 'Sample Video with Chapters',
      duration: 120,
      chapters: this.generateMockChapters(),
      subtitles: [
        {
          id: 'subtitle_en_0',
          language: 'en',
          path: '/mock/subtitles/english.vtt',
          default: true,
        },
        {
          id: 'subtitle_es_0',
          language: 'es',
          path: '/mock/subtitles/spanish.vtt',
          default: false,
        },
      ],
      thumbnail:
        'https://via.placeholder.com/1280x720/1a1a1a/ffffff?text=Mock+Video',
      description:
        'This is a mock video with sample chapters and subtitles for development.',
    };
  }

  /**
   * Scan existing video directory for info.json files and extract chapters
   */
  async scanForExistingChapters(
    videoDirectory: string
  ): Promise<Map<string, Chapter[]>> {
    const chaptersMap = new Map<string, Chapter[]>();

    try {
      const files = await fs.readdir(videoDirectory);
      const infoFiles = files.filter(file => file.endsWith('.info.json'));

      for (const infoFile of infoFiles) {
        const filePath = path.join(videoDirectory, infoFile);
        const videoId = path.basename(infoFile, '.info.json');

        try {
          const chapters = await this.extractChapters(filePath, true);
          if (chapters.length > 0) {
            chaptersMap.set(videoId, chapters);
            console.log(
              `Found ${chapters.length} chapters for video: ${videoId}`
            );
          }
        } catch (error) {
          console.error(`Failed to extract chapters from ${infoFile}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to scan for existing chapters:', error);
    }

    return chaptersMap;
  }

  /**
   * Check if yt-dlp is available
   */
  isYtDlpAvailable(): boolean {
    return this.ytDlpAvailable;
  }
}

// Export singleton instance
export const chapterService = new ChapterExtractionService();
