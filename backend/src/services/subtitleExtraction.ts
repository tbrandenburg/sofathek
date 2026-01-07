import path from 'path';
import fs from 'fs-extra';
import { SubtitleTrack } from '../types';

export interface SubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  position?: {
    x?: number;
    y?: number;
    align?: 'left' | 'center' | 'right';
  };
  style?: {
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    backgroundColor?: string;
  };
}

export interface ParsedSubtitle {
  language: string;
  cues: SubtitleCue[];
  format: 'srt' | 'vtt' | 'ass';
}

export class SubtitleExtractionService {
  /**
   * Parse subtitle file based on its format
   */
  async parseSubtitleFile(
    filePath: string,
    language: string = 'en'
  ): Promise<ParsedSubtitle> {
    const ext = path.extname(filePath).toLowerCase();

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      switch (ext) {
        case '.srt':
          return this.parseSRT(content, language);
        case '.vtt':
          return this.parseVTT(content, language);
        case '.ass':
        case '.ssa':
          return this.parseASS(content, language);
        default:
          throw new Error(`Unsupported subtitle format: ${ext}`);
      }
    } catch (error) {
      console.error(`Failed to parse subtitle file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Parse SRT (SubRip) format
   */
  private parseSRT(content: string, language: string): ParsedSubtitle {
    const cues: SubtitleCue[] = [];
    const blocks = content.trim().split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 3) continue;

      const index = lines[0].trim();
      const timeLine = lines[1].trim();
      const text = lines.slice(2).join('\n').trim();

      // Parse timestamp: "00:00:00,000 --> 00:00:05,000"
      const timeMatch = timeLine.match(
        /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
      );
      if (!timeMatch) continue;

      const startTime = this.parseTimestamp(
        timeMatch[1],
        timeMatch[2],
        timeMatch[3],
        timeMatch[4]
      );
      const endTime = this.parseTimestamp(
        timeMatch[5],
        timeMatch[6],
        timeMatch[7],
        timeMatch[8]
      );

      cues.push({
        id: `srt_${index}`,
        startTime,
        endTime,
        text: this.cleanSubtitleText(text),
      });
    }

    return {
      language,
      cues,
      format: 'srt',
    };
  }

  /**
   * Parse WebVTT format
   */
  private parseVTT(content: string, language: string): ParsedSubtitle {
    const cues: SubtitleCue[] = [];
    const lines = content.split('\n');
    let currentCue: Partial<SubtitleCue> | null = null;
    let cueIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip header and empty lines
      if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) {
        continue;
      }

      // Check for timestamp line: "00:00:00.000 --> 00:00:05.000"
      const timeMatch = line.match(
        /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
      );
      if (timeMatch) {
        // Save previous cue if exists
        if (currentCue && currentCue.text) {
          cues.push(currentCue as SubtitleCue);
        }

        const startTime = this.parseTimestamp(
          timeMatch[1],
          timeMatch[2],
          timeMatch[3],
          timeMatch[4]
        );
        const endTime = this.parseTimestamp(
          timeMatch[5],
          timeMatch[6],
          timeMatch[7],
          timeMatch[8]
        );

        currentCue = {
          id: `vtt_${++cueIndex}`,
          startTime,
          endTime,
          text: '',
        };
        continue;
      }

      // Add text to current cue
      if (currentCue && line) {
        currentCue.text = currentCue.text
          ? `${currentCue.text}\n${line}`
          : line;
      }
    }

    // Add last cue
    if (currentCue && currentCue.text) {
      cues.push(currentCue as SubtitleCue);
    }

    return {
      language,
      cues: cues.map(cue => ({
        ...cue,
        text: this.cleanSubtitleText(cue.text),
      })),
      format: 'vtt',
    };
  }

  /**
   * Parse ASS/SSA (Advanced SubStation Alpha) format
   */
  private parseASS(content: string, language: string): ParsedSubtitle {
    const cues: SubtitleCue[] = [];
    const lines = content.split('\n');
    let eventsSection = false;
    let formatLine = '';
    let cueIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Find Events section
      if (trimmedLine === '[Events]') {
        eventsSection = true;
        continue;
      }

      // Stop processing when we leave Events section
      if (eventsSection && trimmedLine.startsWith('[')) {
        break;
      }

      if (!eventsSection) continue;

      // Get format definition
      if (trimmedLine.startsWith('Format:')) {
        formatLine = trimmedLine;
        continue;
      }

      // Parse dialogue lines
      if (trimmedLine.startsWith('Dialogue:')) {
        const cue = this.parseASSDialogue(trimmedLine, formatLine, ++cueIndex);
        if (cue) {
          cues.push(cue);
        }
      }
    }

    return {
      language,
      cues,
      format: 'ass',
    };
  }

  /**
   * Parse ASS dialogue line
   */
  private parseASSDialogue(
    line: string,
    formatLine: string,
    index: number
  ): SubtitleCue | null {
    // Extract format fields
    const format = formatLine
      .replace('Format:', '')
      .split(',')
      .map(f => f.trim());
    const values = line.replace('Dialogue:', '').split(',');

    if (values.length < format.length) return null;

    const startIdx = format.indexOf('Start');
    const endIdx = format.indexOf('End');
    const textIdx = format.indexOf('Text');

    if (startIdx === -1 || endIdx === -1 || textIdx === -1) return null;

    const startTime = this.parseASSTimestamp(values[startIdx]);
    const endTime = this.parseASSTimestamp(values[endIdx]);
    const text = values.slice(textIdx).join(','); // Text might contain commas

    return {
      id: `ass_${index}`,
      startTime,
      endTime,
      text: this.cleanASSText(text),
    };
  }

  /**
   * Parse ASS timestamp format: "0:00:00.00"
   */
  private parseASSTimestamp(timestamp: string): number {
    const match = timestamp.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
    if (!match) return 0;

    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const seconds = parseInt(match[3]);
    const centiseconds = parseInt(match[4]);

    return hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
  }

  /**
   * Parse timestamp from components
   */
  private parseTimestamp(
    hours: string,
    minutes: string,
    seconds: string,
    milliseconds: string
  ): number {
    return (
      parseInt(hours) * 3600 +
      parseInt(minutes) * 60 +
      parseInt(seconds) +
      parseInt(milliseconds) / 1000
    );
  }

  /**
   * Clean subtitle text from HTML tags and formatting
   */
  private cleanSubtitleText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\{[^}]*\}/g, '') // Remove SRT formatting
      .replace(/\\[nN]/g, '\n') // Convert \n to actual newlines
      .trim();
  }

  /**
   * Clean ASS text from formatting codes
   */
  private cleanASSText(text: string): string {
    return text
      .replace(/\{[^}]*\}/g, '') // Remove ASS formatting codes
      .replace(/\\[nN]/g, '\n') // Convert \n to actual newlines
      .trim();
  }

  /**
   * Extract subtitles from video directory
   */
  async extractSubtitlesFromDirectory(
    videoDirectory: string
  ): Promise<Map<string, SubtitleTrack[]>> {
    const subtitlesMap = new Map<string, SubtitleTrack[]>();

    try {
      const files = await fs.readdir(videoDirectory);
      const subtitleFiles = files.filter(file =>
        /\.(srt|vtt|ass|ssa)$/i.test(file)
      );

      for (const subtitleFile of subtitleFiles) {
        const filePath = path.join(videoDirectory, subtitleFile);
        const baseName = path.basename(
          subtitleFile,
          path.extname(subtitleFile)
        );

        // Try to extract language from filename (e.g., "video.en.srt", "video.es.vtt")
        const languageMatch = baseName.match(/\.([a-z]{2})$/);
        const language = languageMatch ? languageMatch[1] : 'en';

        // Find associated video file (without language code)
        const videoBaseName = languageMatch
          ? baseName.replace(/\.[a-z]{2}$/, '')
          : baseName;

        try {
          const parsedSubtitle = await this.parseSubtitleFile(
            filePath,
            language
          );

          const subtitleTrack: SubtitleTrack = {
            id: `subtitle_${language}_${Date.now()}`,
            language,
            path: filePath,
            default: language === 'en', // Default to English
          };

          if (!subtitlesMap.has(videoBaseName)) {
            subtitlesMap.set(videoBaseName, []);
          }

          subtitlesMap.get(videoBaseName)!.push(subtitleTrack);
          console.log(
            `Found subtitle: ${subtitleFile} (${language}) for video: ${videoBaseName}`
          );
        } catch (error) {
          console.error(
            `Failed to parse subtitle file ${subtitleFile}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('Failed to scan for subtitles:', error);
    }

    return subtitlesMap;
  }

  /**
   * Generate mock subtitles for development/testing
   */
  generateMockSubtitles(): ParsedSubtitle {
    return {
      language: 'en',
      format: 'srt',
      cues: [
        {
          id: 'mock_1',
          startTime: 0,
          endTime: 5,
          text: 'Welcome to this video!',
        },
        {
          id: 'mock_2',
          startTime: 5,
          endTime: 10,
          text: 'This is an example subtitle with multiple lines.\nSubtitles can span multiple lines.',
        },
        {
          id: 'mock_3',
          startTime: 15,
          endTime: 20,
          text: 'Subtitles support different languages and formats.',
        },
        {
          id: 'mock_4',
          startTime: 25,
          endTime: 30,
          text: 'This includes SRT, VTT, and ASS formats.',
        },
      ],
    };
  }
}

// Export singleton instance
export const subtitleService = new SubtitleExtractionService();
