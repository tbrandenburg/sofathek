# PRP-2.3: Metadata Enrichment & External API Integration

## Purpose & Core Principles

### Purpose

Transform SOFATHEK from a basic file browser into a rich media library by intelligently integrating with external movie/TV databases (TMDB, IMDB, OMDb) to automatically enrich video files with professional metadata, artwork, cast information, and user ratings while maintaining privacy and respecting API rate limits.

### Philosophy: Smart Enhancement Without Dependency

Before implementing external integrations, ask:

- How do we enrich content without creating external dependencies?
- What happens when APIs are unavailable or rate-limited?
- How do we balance rich metadata with user privacy?
- What data truly improves the family viewing experience?

### Core Principles

1. **Graceful Degradation**: System works perfectly without external data, enhanced when available
2. **Privacy-First**: No tracking, minimal data exposure, local caching of all metadata
3. **Rate Limit Respect**: Intelligent batching and caching to stay within API limits
4. **Family Context**: Prioritize metadata that helps families discover and organize content

## Gap Analysis: Current vs. Target State

### Current State (What Works)

✅ **Basic file metadata** extracted via ffprobe (duration, resolution, file size)
✅ **Simple filename parsing** for title extraction
✅ **Thumbnail generation** for visual previews
✅ **File-based storage** maintaining system simplicity
✅ **Profile-based access** ensuring family-appropriate content

### Critical Gaps (What's Missing)

❌ **Rich Content Information** - No movie plots, cast info, or professional descriptions
❌ **Visual Appeal** - No movie posters, backdrops, or professional artwork
❌ **Content Context** - No ratings, release dates, or genre information
❌ **Series Organization** - No season/episode detection or TV show metadata
❌ **User Ratings** - No way to see external ratings (IMDB, Rotten Tomatoes, etc.)
❌ **Smart Matching** - No automatic content identification from filename
❌ **Related Content** - No suggestions or "more like this" functionality

### User Impact of Gaps

- **Poor Visual Experience**: Generic thumbnails make content look unprofessional
- **Limited Discovery**: Users can't find content based on actors, directors, or genres
- **No Context**: Users don't know what content is about before watching
- **Difficult Organization**: TV shows mixed with movies without proper grouping

## Implementation Strategy

### Phase 1: External API Integration Framework

#### 1.1 API Client Architecture

```typescript
// backend/src/services/external-apis/apiClient.ts
interface ExternalAPIConfig {
  tmdb: {
    apiKey: string;
    baseUrl: string;
    rateLimit: { requestsPerSecond: number; burstSize: number };
  };
  omdb: {
    apiKey: string;
    baseUrl: string;
    rateLimit: { requestsPerDay: number };
  };
}

export class ExternalAPIManager {
  private rateLimiters: Map<string, RateLimiter>;
  private cache: MetadataCache;
  private config: ExternalAPIConfig;

  constructor(config: ExternalAPIConfig) {
    this.config = config;
    this.rateLimiters = new Map([
      ['tmdb', new RateLimiter(config.tmdb.rateLimit.requestsPerSecond, config.tmdb.rateLimit.burstSize)],
      ['omdb', new RateLimiter(config.omdb.rateLimit.requestsPerDay / (24 * 60 * 60), 1)],
    ]);
    this.cache = new MetadataCache();
  }

  async enrichVideo(video: VideoMetadataCache): Promise<EnrichedVideoMetadata> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(video);
      const cached = await this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // Extract searchable information from filename/metadata
      const searchQuery = this.extractSearchQuery(video);

      // Search external APIs
      const tmdbResult = await this.searchTMDB(searchQuery);
      const omdbResult = await this.searchOMDB(searchQuery);

      // Combine and validate results
      const enriched = await this.combineResults(video, tmdbResult, omdbResult);

      // Download and cache artwork
      if (enriched.artwork?.poster) {
        enriched.artwork.poster = await this.downloadArtwork(enriched.artwork.poster, video.id, 'poster');
      }
      if (enriched.artwork?.backdrop) {
        enriched.artwork.backdrop = await this.downloadArtwork(enriched.artwork.backdrop, video.id, 'backdrop');
      }

      // Cache results
      await this.cache.set(cacheKey, enriched, { ttl: 30 * 24 * 60 * 60 * 1000 }); // 30 days

      return enriched;
    } catch (error) {
      console.warn(`Failed to enrich metadata for ${video.basicInfo.filename}:`, error.message);

      // Return original video with empty enrichment data
      return {
        ...video,
        enrichedMetadata: {
          source: 'none',
          confidence: 0,
          lastEnriched: new Date(),
          externalIds: {},
          plot: null,
          cast: [],
          crew: [],
          ratings: {},
          artwork: {},
          genres: [],
          releaseDate: null,
          runtime: video.basicInfo.duration,
          contentRating: null,
        },
      };
    }
  }

  private extractSearchQuery(video: VideoMetadataCache): SearchQuery {
    const filename = video.basicInfo.filename;

    // Try to extract title and year from filename
    const titleMatch = filename.match(/^(.+?)(?:\s*[\(\[]?(\d{4})[\)\]]?)?(?:\s*[\.\-\s])/);

    let title = video.extractedInfo.title || titleMatch?.[1] || filename;
    let year = video.extractedInfo.year || (titleMatch?.[2] ? parseInt(titleMatch[2]) : undefined);

    // Clean up title
    title = this.cleanTitle(title);

    // Detect content type
    const contentType = this.detectContentType(filename, video);

    return {
      title,
      year,
      contentType,
      originalFilename: filename,
    };
  }

  private async searchTMDB(query: SearchQuery): Promise<TMDBResult | null> {
    if (!this.config.tmdb.apiKey) return null;

    await this.rateLimiters.get('tmdb')?.waitForPermission();

    try {
      const searchUrl =
        query.contentType === 'tv'
          ? `${this.config.tmdb.baseUrl}/search/tv`
          : `${this.config.tmdb.baseUrl}/search/movie`;

      const params = new URLSearchParams({
        api_key: this.config.tmdb.apiKey,
        query: query.title,
        ...(query.year && { year: query.year.toString() }),
      });

      const response = await fetch(`${searchUrl}?${params}`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const bestMatch = this.selectBestMatch(data.results, query);

        // Get detailed information
        const detailUrl =
          query.contentType === 'tv'
            ? `${this.config.tmdb.baseUrl}/tv/${bestMatch.id}`
            : `${this.config.tmdb.baseUrl}/movie/${bestMatch.id}`;

        const detailResponse = await fetch(
          `${detailUrl}?api_key=${this.config.tmdb.apiKey}&append_to_response=credits,keywords`
        );
        const detailData = await detailResponse.json();

        return {
          id: detailData.id,
          title: detailData.title || detailData.name,
          originalTitle: detailData.original_title || detailData.original_name,
          overview: detailData.overview,
          releaseDate: detailData.release_date || detailData.first_air_date,
          runtime: detailData.runtime || (detailData.episode_run_time && detailData.episode_run_time[0]),
          genres: detailData.genres,
          posterPath: detailData.poster_path,
          backdropPath: detailData.backdrop_path,
          voteAverage: detailData.vote_average,
          voteCount: detailData.vote_count,
          cast: detailData.credits?.cast?.slice(0, 10) || [],
          crew: detailData.credits?.crew?.filter(c => ['Director', 'Writer', 'Producer'].includes(c.job)) || [],
          keywords: detailData.keywords?.keywords || detailData.keywords?.results || [],
          contentRating: this.extractContentRating(detailData),
          confidence: this.calculateMatchConfidence(detailData, query),
        };
      }
    } catch (error) {
      console.warn('TMDB search failed:', error.message);
    }

    return null;
  }

  private async searchOMDB(query: SearchQuery): Promise<OMDBResult | null> {
    if (!this.config.omdb.apiKey) return null;

    await this.rateLimiters.get('omdb')?.waitForPermission();

    try {
      const params = new URLSearchParams({
        apikey: this.config.omdb.apiKey,
        t: query.title,
        type: query.contentType === 'tv' ? 'series' : 'movie',
        ...(query.year && { y: query.year.toString() }),
      });

      const response = await fetch(`${this.config.omdb.baseUrl}?${params}`);
      const data = await response.json();

      if (data.Response === 'True') {
        return {
          imdbID: data.imdbID,
          title: data.Title,
          plot: data.Plot,
          director: data.Director,
          actors: data.Actors,
          imdbRating: parseFloat(data.imdbRating),
          imdbVotes: data.imdbVotes,
          rottenTomatoesRating: this.extractRottenTomatoesRating(data.Ratings),
          metacriticRating: data.Metascore ? parseInt(data.Metascore) : null,
          rated: data.Rated,
          confidence: this.calculateMatchConfidence(data, query),
        };
      }
    } catch (error) {
      console.warn('OMDB search failed:', error.message);
    }

    return null;
  }
}

interface SearchQuery {
  title: string;
  year?: number;
  contentType: 'movie' | 'tv' | 'unknown';
  originalFilename: string;
}

interface EnrichedVideoMetadata extends VideoMetadataCache {
  enrichedMetadata: {
    source: 'tmdb' | 'omdb' | 'combined' | 'none';
    confidence: number;
    lastEnriched: Date;
    externalIds: {
      tmdb?: number;
      imdb?: string;
      omdb?: string;
    };
    plot: string | null;
    cast: CastMember[];
    crew: CrewMember[];
    ratings: {
      imdb?: number;
      tmdb?: number;
      rottenTomatoes?: number;
      metacritic?: number;
    };
    artwork: {
      poster?: string; // Local file path
      backdrop?: string; // Local file path
      fanart?: string[];
    };
    genres: string[];
    releaseDate: Date | null;
    runtime: number; // Minutes
    contentRating: string | null;
  };
}
```

#### 1.2 Intelligent Content Matching

```typescript
// backend/src/services/external-apis/contentMatcher.ts
export class ContentMatcher {
  private commonWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
  ]);

  selectBestMatch(results: any[], query: SearchQuery): any {
    let bestMatch = results[0];
    let bestScore = 0;

    for (const result of results) {
      const score = this.calculateMatchScore(result, query);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    }

    return bestMatch;
  }

  private calculateMatchScore(result: any, query: SearchQuery): number {
    let score = 0;

    // Title similarity (most important)
    const titleSimilarity = this.calculateTitleSimilarity(result.title || result.name, query.title);
    score += titleSimilarity * 0.6;

    // Year matching
    if (query.year) {
      const resultYear = this.extractYear(result.release_date || result.first_air_date);
      if (resultYear) {
        const yearDiff = Math.abs(resultYear - query.year);
        if (yearDiff === 0) score += 0.3;
        else if (yearDiff === 1) score += 0.2;
        else if (yearDiff <= 2) score += 0.1;
      }
    }

    // Popularity/vote count (tiebreaker)
    const popularity = result.popularity || 0;
    score += Math.min(popularity / 1000, 0.1); // Max 0.1 bonus

    return score;
  }

  private calculateTitleSimilarity(title1: string, title2: string): number {
    const clean1 = this.cleanTitle(title1);
    const clean2 = this.cleanTitle(title2);

    // Exact match
    if (clean1 === clean2) return 1.0;

    // Levenshtein distance based similarity
    const distance = this.levenshteinDistance(clean1, clean2);
    const maxLength = Math.max(clean1.length, clean2.length);
    const similarity = 1 - distance / maxLength;

    // Word-based similarity for better matching
    const words1 = clean1.split(' ').filter(w => !this.commonWords.has(w.toLowerCase()));
    const words2 = clean2.split(' ').filter(w => !this.commonWords.has(w.toLowerCase()));

    let wordMatches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.toLowerCase() === word2.toLowerCase()) {
          wordMatches++;
          break;
        }
      }
    }

    const wordSimilarity = wordMatches / Math.max(words1.length, words2.length);

    // Combine both similarities
    return Math.max(similarity, wordSimilarity);
  }

  cleanTitle(title: string): string {
    return title
      .replace(/[\[\]()]/g, '') // Remove brackets and parentheses
      .replace(/\b(dvd|bluray|blu-ray|hd|4k|1080p|720p|480p)\b/gi, '') // Remove quality indicators
      .replace(/\b(xvid|divx|x264|x265|hevc|avc)\b/gi, '') // Remove codec info
      .replace(/\b(proper|repack|extended|director[''']?s?\s+cut|unrated)\b/gi, '') // Remove release info
      .replace(/[_\.\-]/g, ' ') // Replace separators with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  detectContentType(filename: string, video: VideoMetadataCache): 'movie' | 'tv' | 'unknown' {
    const lower = filename.toLowerCase();

    // TV show indicators
    if (lower.match(/s\d+e\d+|season\s*\d+|episode\s*\d+|\bep\d+/)) {
      return 'tv';
    }

    // Movie indicators (longer duration, specific patterns)
    if (video.basicInfo.duration > 3600 && lower.match(/\b(movie|film|dvd|bluray)\b/)) {
      return 'movie';
    }

    // Default based on duration
    return video.basicInfo.duration > 2400 ? 'movie' : 'unknown'; // 40 minutes threshold
  }
}
```

### Phase 2: Artwork Management System

#### 2.1 Artwork Download and Processing

```typescript
// backend/src/services/external-apis/artworkManager.ts
export class ArtworkManager {
  private artworkDir = path.join(process.cwd(), '.sofathek/artwork');
  private downloadQueue = new Queue('artwork-download');

  constructor() {
    this.ensureDirectories();
    this.setupDownloadWorker();
  }

  async downloadArtwork(url: string, videoId: string, type: 'poster' | 'backdrop'): Promise<string> {
    const filename = `${videoId}_${type}.jpg`;
    const localPath = path.join(this.artworkDir, type, filename);

    // Return existing file if already downloaded
    if (await fs.pathExists(localPath)) {
      return localPath;
    }

    try {
      // Queue download job
      const job = await this.downloadQueue.add(
        'download',
        {
          url,
          localPath,
          videoId,
          type,
        },
        {
          attempts: 3,
          backoff: 'exponential',
          delay: 1000,
        }
      );

      await job.finished();
      return localPath;
    } catch (error) {
      console.warn(`Failed to download ${type} for video ${videoId}:`, error.message);
      return null;
    }
  }

  private setupDownloadWorker() {
    this.downloadQueue.process('download', async job => {
      const { url, localPath, videoId, type } = job.data;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.buffer();

      // Process image (resize, optimize)
      const processedBuffer = await this.processImage(buffer, type);

      await fs.ensureDir(path.dirname(localPath));
      await fs.writeFile(localPath, processedBuffer);

      console.log(`Downloaded ${type} for video ${videoId}: ${localPath}`);
    });
  }

  private async processImage(buffer: Buffer, type: 'poster' | 'backdrop'): Promise<Buffer> {
    const sharp = require('sharp');

    const dimensions =
      type === 'poster'
        ? { width: 400, height: 600 } // Standard poster ratio
        : { width: 780, height: 440 }; // Standard backdrop ratio

    return await sharp(buffer)
      .resize(dimensions.width, dimensions.height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  }

  async generateArtworkCollage(videoIds: string[], type: 'grid' | 'strip'): Promise<string> {
    const sharp = require('sharp');
    const artworks: Buffer[] = [];

    // Collect artwork files
    for (const videoId of videoIds.slice(0, type === 'grid' ? 9 : 5)) {
      const artworkPath = path.join(this.artworkDir, 'poster', `${videoId}_poster.jpg`);
      if (await fs.pathExists(artworkPath)) {
        const buffer = await fs.readFile(artworkPath);
        artworks.push(buffer);
      }
    }

    if (artworks.length === 0) return null;

    // Create collage
    const collageBuffer =
      type === 'grid' ? await this.createGridCollage(artworks) : await this.createStripCollage(artworks);

    // Save collage
    const collageId = crypto.randomUUID();
    const collagePath = path.join(this.artworkDir, 'collages', `${collageId}.jpg`);
    await fs.ensureDir(path.dirname(collagePath));
    await fs.writeFile(collagePath, collageBuffer);

    return collagePath;
  }

  private async createGridCollage(artworks: Buffer[]): Promise<Buffer> {
    const sharp = require('sharp');
    const cols = 3;
    const rows = Math.ceil(artworks.length / cols);
    const imageWidth = 133; // 400/3
    const imageHeight = 200; // 600/3

    const canvas = sharp({
      create: {
        width: imageWidth * cols,
        height: imageHeight * rows,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    });

    const composites = artworks.map((artwork, index) => ({
      input: artwork,
      left: (index % cols) * imageWidth,
      top: Math.floor(index / cols) * imageHeight,
    }));

    return await canvas.composite(composites).jpeg().toBuffer();
  }
}
```

### Phase 3: TV Show & Series Management

#### 3.1 Series Detection and Organization

```typescript
// backend/src/services/external-apis/seriesManager.ts
export class SeriesManager {
  async detectAndOrganizeSeries(videos: VideoMetadataCache[]): Promise<SeriesCollection[]> {
    const seriesMap = new Map<string, VideoMetadataCache[]>();

    // Group videos by potential series
    for (const video of videos) {
      const seriesKey = this.extractSeriesKey(video);
      if (seriesKey) {
        if (!seriesMap.has(seriesKey)) {
          seriesMap.set(seriesKey, []);
        }
        seriesMap.get(seriesKey)!.push(video);
      }
    }

    // Create series collections
    const series: SeriesCollection[] = [];
    for (const [seriesName, episodes] of seriesMap) {
      if (episodes.length >= 2) {
        // Only create series with 2+ episodes
        const collection = await this.createSeriesCollection(seriesName, episodes);
        series.push(collection);
      }
    }

    return series.sort((a, b) => a.name.localeCompare(b.name));
  }

  private extractSeriesKey(video: VideoMetadataCache): string | null {
    const filename = video.basicInfo.filename.toLowerCase();

    // Pattern: Show.Name.S01E01.mkv
    const seasonEpisodeMatch = filename.match(/^(.+?)\.s(\d+)e(\d+)/);
    if (seasonEpisodeMatch) {
      return seasonEpisodeMatch[1].replace(/[._]/g, ' ').trim();
    }

    // Pattern: Show Name - 1x01 - Episode Title
    const seriesMatch = filename.match(/^(.+?)\s*[-–]\s*\d+x\d+/);
    if (seriesMatch) {
      return seriesMatch[1].trim();
    }

    // Pattern: Show Name (2021) - Season 1 Episode 1
    const longFormMatch = filename.match(/^(.+?)\s*(?:\(\d{4}\))?\s*[-–]\s*season\s*\d+/i);
    if (longFormMatch) {
      return longFormMatch[1].trim();
    }

    return null;
  }

  private async createSeriesCollection(seriesName: string, episodes: VideoMetadataCache[]): Promise<SeriesCollection> {
    // Sort episodes by season and episode number
    const sortedEpisodes = episodes.sort((a, b) => {
      const aEpisode = this.parseEpisodeInfo(a.basicInfo.filename);
      const bEpisode = this.parseEpisodeInfo(b.basicInfo.filename);

      if (aEpisode.season !== bEpisode.season) {
        return aEpisode.season - bEpisode.season;
      }
      return aEpisode.episode - bEpisode.episode;
    });

    // Try to get series metadata from external APIs
    const seriesMetadata = await this.getSeriesMetadata(seriesName);

    // Group by seasons
    const seasons = new Map<number, VideoMetadataCache[]>();
    for (const episode of sortedEpisodes) {
      const episodeInfo = this.parseEpisodeInfo(episode.basicInfo.filename);
      if (!seasons.has(episodeInfo.season)) {
        seasons.set(episodeInfo.season, []);
      }
      seasons.get(episodeInfo.season)!.push(episode);
    }

    return {
      id: crypto.randomUUID(),
      name: seriesName,
      displayName: seriesMetadata?.name || this.formatSeriesName(seriesName),
      totalEpisodes: episodes.length,
      totalSeasons: seasons.size,
      seasons: Array.from(seasons.entries()).map(([seasonNumber, seasonEpisodes]) => ({
        number: seasonNumber,
        episodes: seasonEpisodes.length,
        videos: seasonEpisodes,
      })),
      metadata: seriesMetadata,
      artwork: seriesMetadata?.posterPath
        ? await this.downloadArtwork(seriesMetadata.posterPath, `series_${seriesName}`, 'poster')
        : null,
      lastWatched: Math.max(...episodes.map(e => e.userInfo.lastWatched?.getTime() || 0)),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private parseEpisodeInfo(filename: string): { season: number; episode: number } {
    const lower = filename.toLowerCase();

    // S01E01 format
    const seasonEpisodeMatch = lower.match(/s(\d+)e(\d+)/);
    if (seasonEpisodeMatch) {
      return {
        season: parseInt(seasonEpisodeMatch[1]),
        episode: parseInt(seasonEpisodeMatch[2]),
      };
    }

    // 1x01 format
    const shortMatch = lower.match(/(\d+)x(\d+)/);
    if (shortMatch) {
      return {
        season: parseInt(shortMatch[1]),
        episode: parseInt(shortMatch[2]),
      };
    }

    // Season X Episode Y format
    const longMatch = lower.match(/season\s*(\d+).*?episode\s*(\d+)/);
    if (longMatch) {
      return {
        season: parseInt(longMatch[1]),
        episode: parseInt(longMatch[2]),
      };
    }

    // Default to season 1
    return { season: 1, episode: 1 };
  }
}

interface SeriesCollection {
  id: string;
  name: string;
  displayName: string;
  totalEpisodes: number;
  totalSeasons: number;
  seasons: {
    number: number;
    episodes: number;
    videos: VideoMetadataCache[];
  }[];
  metadata?: {
    tmdbId?: number;
    imdbId?: string;
    overview?: string;
    firstAirDate?: Date;
    genres?: string[];
    status?: string;
    network?: string;
  };
  artwork?: string;
  lastWatched: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Phase 4: Intelligent Batch Processing

#### 4.1 Background Enrichment Service

```typescript
// backend/src/services/external-apis/batchEnrichment.ts
export class BatchEnrichmentService {
  private enrichmentQueue = new Queue('metadata-enrichment');
  private concurrency = 2; // Conservative to respect rate limits

  constructor(private apiManager: ExternalAPIManager) {
    this.setupWorker();
  }

  async scheduleLibraryEnrichment(videos: VideoMetadataCache[]): Promise<string> {
    const jobId = crypto.randomUUID();

    // Create batch job with all videos
    await this.enrichmentQueue.add(
      'batch-enrich',
      {
        jobId,
        videoIds: videos.map(v => v.id),
        totalVideos: videos.length,
        startedAt: new Date(),
      },
      {
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    return jobId;
  }

  async scheduleVideoEnrichment(videoId: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    await this.enrichmentQueue.add(
      'single-enrich',
      {
        videoId,
        priority,
      },
      {
        priority: priority === 'high' ? 10 : priority === 'normal' ? 5 : 1,
        attempts: 3,
        backoff: 'exponential',
      }
    );
  }

  private setupWorker() {
    this.enrichmentQueue.process('batch-enrich', async job => {
      const { jobId, videoIds, totalVideos } = job.data;
      let processed = 0;

      for (const videoId of videoIds) {
        try {
          // Load video metadata
          const video = await this.loadVideoMetadata(videoId);
          if (!video) continue;

          // Skip if already enriched recently
          if (this.isRecentlyEnriched(video)) {
            processed++;
            continue;
          }

          // Enrich video
          const enriched = await this.apiManager.enrichVideo(video);
          await this.saveEnrichedMetadata(enriched);

          processed++;

          // Update progress
          await job.progress((processed / totalVideos) * 100);

          // Rate limiting delay
          await this.delay(1000);
        } catch (error) {
          console.warn(`Failed to enrich video ${videoId}:`, error.message);
          processed++;
        }
      }

      return {
        jobId,
        processed,
        total: totalVideos,
        completedAt: new Date(),
      };
    });

    this.enrichmentQueue.process('single-enrich', this.concurrency, async job => {
      const { videoId } = job.data;

      const video = await this.loadVideoMetadata(videoId);
      if (!video) {
        throw new Error(`Video ${videoId} not found`);
      }

      const enriched = await this.apiManager.enrichVideo(video);
      await this.saveEnrichedMetadata(enriched);

      return { videoId, enriched: true };
    });
  }

  async getEnrichmentProgress(jobId: string): Promise<EnrichmentProgress | null> {
    const jobs = await this.enrichmentQueue.getJobs(['active', 'completed', 'failed'], 0, 100);
    const job = jobs.find(j => j.data.jobId === jobId);

    if (!job) return null;

    return {
      jobId,
      status: await job.getState(),
      progress: job.progress(),
      processedVideos: job.returnvalue?.processed || 0,
      totalVideos: job.data.totalVideos,
      startedAt: job.data.startedAt,
      completedAt: job.returnvalue?.completedAt,
      estimatedCompletion: this.calculateEstimatedCompletion(job),
    };
  }

  async getEnrichmentStats(): Promise<EnrichmentStats> {
    const allVideos = await this.getAllVideos();
    const enrichedVideos = allVideos.filter(v => v.enrichedMetadata && v.enrichedMetadata.source !== 'none');

    const sourceBreakdown = enrichedVideos.reduce(
      (acc, v) => {
        const source = v.enrichedMetadata.source;
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalVideos: allVideos.length,
      enrichedVideos: enrichedVideos.length,
      enrichmentPercentage: (enrichedVideos.length / allVideos.length) * 100,
      sourceBreakdown,
      averageConfidence:
        enrichedVideos.reduce((sum, v) => sum + v.enrichedMetadata.confidence, 0) / enrichedVideos.length,
      lastEnrichment: Math.max(...enrichedVideos.map(v => v.enrichedMetadata.lastEnriched.getTime())),
    };
  }

  private isRecentlyEnriched(video: VideoMetadataCache): boolean {
    if (!video.enrichedMetadata?.lastEnriched) return false;

    const daysSinceEnrichment = (Date.now() - video.enrichedMetadata.lastEnriched.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceEnrichment < 30; // Re-enrich after 30 days
  }
}

interface EnrichmentProgress {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  processedVideos: number;
  totalVideos: number;
  startedAt: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
}

interface EnrichmentStats {
  totalVideos: number;
  enrichedVideos: number;
  enrichmentPercentage: number;
  sourceBreakdown: Record<string, number>;
  averageConfidence: number;
  lastEnrichment: number;
}
```

### Phase 5: API Endpoints & Frontend Integration

#### 5.1 Enhanced API Routes

```typescript
// backend/src/routes/metadata.ts
import express from 'express';
import { ExternalAPIManager } from '../services/external-apis/apiClient';
import { BatchEnrichmentService } from '../services/external-apis/batchEnrichment';
import { SeriesManager } from '../services/external-apis/seriesManager';

const router = express.Router();
const apiManager = new ExternalAPIManager(config.externalAPIs);
const enrichmentService = new BatchEnrichmentService(apiManager);
const seriesManager = new SeriesManager();

// Get enriched metadata for a specific video
router.get('/videos/:id/metadata', async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await loadVideoMetadata(videoId);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    // Return cached metadata or trigger enrichment
    if (video.enrichedMetadata && video.enrichedMetadata.source !== 'none') {
      res.json({
        success: true,
        metadata: video.enrichedMetadata,
        cached: true,
      });
    } else {
      // Trigger high-priority enrichment
      await enrichmentService.scheduleVideoEnrichment(videoId, 'high');

      res.json({
        success: true,
        metadata: null,
        message: 'Metadata enrichment scheduled',
        cached: false,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get metadata',
      message: error.message,
    });
  }
});

// Start batch enrichment for entire library
router.post('/enrich/batch', async (req, res) => {
  try {
    const videos = await getAllVideos();
    const jobId = await enrichmentService.scheduleLibraryEnrichment(videos);

    res.json({
      success: true,
      jobId,
      message: `Batch enrichment started for ${videos.length} videos`,
      estimatedDuration: Math.ceil(videos.length / 2), // 2 videos per minute estimate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start batch enrichment',
    });
  }
});

// Get enrichment progress
router.get('/enrich/progress/:jobId', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const progress = await enrichmentService.getEnrichmentProgress(jobId);

    if (!progress) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
      success: true,
      progress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get progress',
    });
  }
});

// Get enrichment statistics
router.get('/enrich/stats', async (req, res) => {
  try {
    const stats = await enrichmentService.getEnrichmentStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
    });
  }
});

// Get TV series collections
router.get('/series', async (req, res) => {
  try {
    const videos = await getAllVideos();
    const series = await seriesManager.detectAndOrganizeSeries(videos);

    res.json({
      success: true,
      series,
      totalSeries: series.length,
      totalEpisodes: series.reduce((sum, s) => sum + s.totalEpisodes, 0),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get series',
    });
  }
});

export default router;
```

## Validation Loops

### Level 1: Unit Testing

```typescript
// tests/services/external-apis/contentMatcher.test.ts
describe('ContentMatcher', () => {
  const matcher = new ContentMatcher();

  test('should match exact titles', () => {
    const results = [
      { title: 'The Avengers', release_date: '2012-05-04' },
      { title: 'Avengers: Age of Ultron', release_date: '2015-05-01' },
    ];

    const query = { title: 'The Avengers', year: 2012, contentType: 'movie' };
    const best = matcher.selectBestMatch(results, query);

    expect(best.title).toBe('The Avengers');
  });

  test('should clean titles properly', () => {
    const cleaned = matcher.cleanTitle('The.Movie.2020.1080p.BluRay.x264');
    expect(cleaned).toBe('The Movie 2020');
  });
});
```

### Level 2: Integration Testing

```bash
# Test API rate limiting
npm run test:api:ratelimit

# Test artwork downloading
npm run test:artwork:download

# Test series detection
npm run test:series:detection

# Test enrichment accuracy
npm run test:enrichment:accuracy
```

### Level 3: User Acceptance Testing

- **Metadata Accuracy**: 85% of enriched videos have correct title and plot information
- **Artwork Quality**: Professional posters and backdrops for 90% of mainstream content
- **Series Organization**: TV shows properly grouped with 95% accuracy
- **Performance Impact**: Enrichment runs in background without affecting video playback

## Success Metrics

### Technical Performance

- **API Rate Limit Compliance**: Zero rate limit violations across all external APIs
- **Enrichment Success Rate**: > 80% successful metadata enrichment for popular content
- **Cache Hit Rate**: > 95% for artwork and metadata requests after initial enrichment
- **Processing Speed**: Complete library enrichment within 24 hours for 1000+ videos

### Content Quality

- **Metadata Accuracy**: > 85% user satisfaction with automatic title and plot extraction
- **Artwork Coverage**: Professional artwork available for > 75% of video library
- **Series Detection**: > 90% accuracy in TV show episode grouping and organization
- **Missing Content**: < 10% of videos remain completely un-enriched after batch processing

### User Experience

- **Visual Appeal**: 40% improvement in library browsing engagement
- **Content Discovery**: Users find 50% more content through enhanced search and metadata
- **Family Satisfaction**: 8/10 average rating on content organization and presentation
- **Setup Simplicity**: External API integration requires < 5 minutes configuration

## Anti-Patterns to Avoid

❌ **API Key Hardcoding**: Don't embed API keys in source code or configuration files
**Why bad**: Security risk and prevents easy key rotation
**Better**: Use environment variables or secure configuration system

❌ **Aggressive Rate Limiting**: Don't hammer external APIs without proper throttling
**Why bad**: Gets your API keys banned and violates terms of service
**Better**: Implement intelligent rate limiting with exponential backoff

❌ **Synchronous Enrichment**: Don't block video playback waiting for metadata enrichment
**Why bad**: Degrades user experience and makes system feel slow
**Better**: Asynchronous background processing with progressive enhancement

❌ **External Dependency**: Don't make external APIs required for basic functionality
**Why bad**: System breaks when APIs are unavailable or keys expire
**Better**: Graceful degradation - system works fine without enrichment

❌ **Metadata Overwrites**: Don't replace user-curated data with automatic enrichment
**Why bad**: Users lose their custom tags, descriptions, and organization
**Better**: Merge external data with user data, preferring user choices

❌ **Privacy Violations**: Don't send complete file paths or personal data to external services
**Why bad**: Exposes private information and violates family privacy
**Better**: Send only cleaned titles and necessary search parameters

## Variation Guidance

**IMPORTANT**: Implementation should adapt to family privacy preferences and content types.

**For Privacy-Conscious Families**:

- Optional external API integration
- Local-only metadata caching
- No external image downloads
- Manual enrichment controls

**For Large Libraries** (> 2000 videos):

- Prioritized enrichment (new content first)
- Batch processing optimization
- Advanced duplicate detection
- Series-focused organization

**For Mixed Content Types**:

- Content-type specific enrichment
- Educational content handling
- Home video exclusion
- Custom categorization support

**For International Content**:

- Multi-language API support
- Regional rating systems
- Local streaming service integration
- Cultural content categorization

## Remember

**Rich metadata transforms a file collection into a curated media library.** The goal isn't to create the most comprehensive metadata system possible—it's to make family video libraries feel professional, organized, and delightful to explore.

Great metadata enrichment happens invisibly in the background while respecting privacy and API limits. Focus on enhancing what families actually see and use: titles, descriptions, artwork, and organization.

**SOFATHEK users should feel like they have their own personal Netflix, powered by their own content collection.**
