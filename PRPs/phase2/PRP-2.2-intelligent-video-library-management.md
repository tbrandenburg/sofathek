# PRP-2.2: Intelligent Video Library Management System

## Purpose & Core Principles

### Purpose

Transform SOFATHEK's basic file-system video scanning into an intelligent, searchable, and highly organized media library that provides users with Netflix-quality discovery and browsing experiences while maintaining the simplicity of file-based storage.

### Philosophy: Smart Organization Without Database Complexity

Before implementing complex search systems, ask:

- How can we make content discovery intuitive for families?
- What metadata can we extract and cache without external dependencies?
- How do we balance search power with system simplicity?
- What makes browsing enjoyable rather than overwhelming?

### Core Principles

1. **Intelligent Caching**: Store computed metadata in JSON sidecar files for lightning-fast searches
2. **Family-First Discovery**: Prioritize content organization that works for all ages and technical levels
3. **Progressive Enhancement**: Build from basic file listing to advanced AI-powered recommendations
4. **Performance Over Perfection**: Fast, responsive search trumps comprehensive metadata every time

## Gap Analysis: Current vs. Target State

### Current State (What Works)

✅ **Basic file scanning** via `backend/src/services/scanner.ts`
✅ **Video metadata extraction** using ffprobe
✅ **Thumbnail generation** for basic previews
✅ **Profile-based access control** for family safety
✅ **RESTful API endpoints** for video listing and details

### Critical Gaps (What's Missing)

❌ **Search functionality** - No way to find specific videos by title, genre, or content
❌ **Content categorization** - Videos listed chronologically without organization
❌ **Smart filtering** - Cannot filter by duration, quality, date, or custom tags
❌ **Duplicate detection** - Same content may be scanned multiple times
❌ **Library analytics** - No insights into viewing patterns or library composition
❌ **Metadata caching** - Expensive ffprobe operations run repeatedly
❌ **Content tagging** - No way to mark favorites, create collections, or add notes
❌ **Advanced sorting** - Limited to basic filename alphabetization

### User Impact of Gaps

- **Discovery Frustration**: Users must scroll through hundreds of videos to find content
- **Performance Issues**: Repeated metadata extraction slows library browsing
- **No Organization**: Mixed content types create chaotic browsing experience
- **Missing Context**: No way to understand what content is actually available

## Implementation Strategy

### Phase 1: Enhanced Metadata Caching System

#### 1.1 Metadata Cache Architecture

```typescript
// backend/src/types/library.ts
interface VideoMetadataCache {
  id: string;
  filePath: string;
  basicInfo: {
    filename: string;
    fileSize: number;
    duration: number;
    resolution: string;
    format: string;
    bitrate: number;
    createdAt: Date;
    modifiedAt: Date;
  };
  extractedInfo: {
    title?: string;
    description?: string;
    tags: string[];
    genre?: string;
    year?: number;
    language?: string;
  };
  computedInfo: {
    searchKeywords: string[];
    contentType: 'movie' | 'episode' | 'clip' | 'other';
    quality: 'sd' | 'hd' | '4k' | '8k';
    estimatedRating: 'family' | 'teen' | 'mature';
  };
  userInfo: {
    favorites: string[]; // profile IDs who favorited
    watchCount: number;
    lastWatched?: Date;
    userTags: string[];
    collections: string[];
  };
  cacheVersion: string;
  lastScanned: Date;
}

interface LibrarySearchIndex {
  videos: VideoMetadataCache[];
  searchTerms: Map<string, string[]>; // term -> video IDs
  categories: Map<string, string[]>; // category -> video IDs
  collections: Map<string, string[]>; // collection -> video IDs
  lastUpdated: Date;
}
```

#### 1.2 Intelligent Metadata Extraction Service

```typescript
// backend/src/services/metadataExtractor.ts
export class MetadataExtractor {
  private cacheDir = path.join(process.cwd(), '.sofathek/metadata-cache');

  async extractAndCache(filePath: string, forceRefresh = false): Promise<VideoMetadataCache> {
    const cacheFile = this.getCacheFilePath(filePath);

    // Check if cache exists and is valid
    if (!forceRefresh && (await this.isCacheValid(cacheFile, filePath))) {
      return await this.loadFromCache(cacheFile);
    }

    // Extract fresh metadata
    const metadata = await this.extractMetadata(filePath);

    // Enhance with intelligent analysis
    const enhanced = await this.enhanceMetadata(metadata, filePath);

    // Cache results
    await this.saveToCache(cacheFile, enhanced);

    return enhanced;
  }

  private async extractMetadata(filePath: string): Promise<Partial<VideoMetadataCache>> {
    const ffprobeData = await this.runFFProbe(filePath);
    const fileStats = await fs.stat(filePath);

    return {
      id: this.generateStableId(filePath), // Fixed: use file path hash, not timestamp
      filePath,
      basicInfo: {
        filename: path.basename(filePath),
        fileSize: fileStats.size,
        duration: parseFloat(ffprobeData.format.duration),
        resolution: this.extractResolution(ffprobeData),
        format: ffprobeData.format.format_name,
        bitrate: parseInt(ffprobeData.format.bit_rate),
        createdAt: fileStats.birthtime,
        modifiedAt: fileStats.mtime,
      },
      extractedInfo: {
        title: this.extractTitle(filePath, ffprobeData),
        description: ffprobeData.format.tags?.comment || ffprobeData.format.tags?.description,
        tags: this.extractTags(ffprobeData),
        genre: ffprobeData.format.tags?.genre,
        year: this.extractYear(filePath, ffprobeData),
        language: ffprobeData.format.tags?.language || 'en',
      },
      lastScanned: new Date(),
      cacheVersion: '2.2.0',
    };
  }

  private async enhanceMetadata(metadata: Partial<VideoMetadataCache>, filePath: string): Promise<VideoMetadataCache> {
    const enhanced = { ...metadata } as VideoMetadataCache;

    // Intelligent content analysis
    enhanced.computedInfo = {
      searchKeywords: this.generateSearchKeywords(enhanced),
      contentType: this.detectContentType(enhanced, filePath),
      quality: this.determineQuality(enhanced.basicInfo.resolution),
      estimatedRating: this.estimateRating(enhanced, filePath),
    };

    // Initialize user info
    enhanced.userInfo = {
      favorites: [],
      watchCount: 0,
      userTags: [],
      collections: [],
    };

    return enhanced;
  }

  private generateSearchKeywords(metadata: VideoMetadataCache): string[] {
    const keywords = new Set<string>();

    // Add filename keywords (cleaned)
    const cleanFilename = this.cleanFilename(metadata.basicInfo.filename);
    cleanFilename.split(/[\s\-_\.]+/).forEach(word => {
      if (word.length > 2) keywords.add(word.toLowerCase());
    });

    // Add metadata keywords
    if (metadata.extractedInfo.title) {
      metadata.extractedInfo.title.split(/\s+/).forEach(word => {
        if (word.length > 2) keywords.add(word.toLowerCase());
      });
    }

    // Add genre and tags
    if (metadata.extractedInfo.genre) keywords.add(metadata.extractedInfo.genre.toLowerCase());
    metadata.extractedInfo.tags?.forEach(tag => keywords.add(tag.toLowerCase()));

    // Add technical keywords
    keywords.add(metadata.computedInfo.quality);
    keywords.add(metadata.computedInfo.contentType);

    return Array.from(keywords);
  }

  private generateStableId(filePath: string): string {
    // CRITICAL FIX: Use file path hash instead of timestamp
    const crypto = require('crypto');
    return crypto.createHash('md5').update(filePath).digest('hex').substring(0, 16);
  }
}
```

### Phase 2: Advanced Search System

#### 2.1 Multi-dimensional Search Engine

```typescript
// backend/src/services/librarySearch.ts
export class LibrarySearchEngine {
  private searchIndex: LibrarySearchIndex;

  async search(query: SearchQuery, profileId: string): Promise<SearchResult[]> {
    const results = new Map<string, SearchMatch>();

    // Text search
    if (query.text) {
      const textMatches = await this.performTextSearch(query.text);
      this.mergeResults(results, textMatches, 'text', 1.0);
    }

    // Filter by attributes
    if (query.filters) {
      const filtered = await this.applyFilters(query.filters);
      this.mergeResults(results, filtered, 'filter', 0.8);
    }

    // Apply profile restrictions
    const profileFiltered = await this.applyProfileRestrictions(results, profileId);

    // Sort by relevance and user preferences
    return this.sortResults(profileFiltered, query.sortBy, profileId);
  }

  private async performTextSearch(text: string): Promise<SearchMatch[]> {
    const searchTerms = this.tokenizeSearch(text);
    const matches: SearchMatch[] = [];

    for (const video of this.searchIndex.videos) {
      let score = 0;

      // Title match (highest priority)
      if (video.extractedInfo.title) {
        score += this.calculateMatchScore(searchTerms, video.extractedInfo.title) * 3.0;
      }

      // Filename match
      score += this.calculateMatchScore(searchTerms, video.basicInfo.filename) * 2.0;

      // Keyword match
      const keywordMatches = searchTerms.filter(term => video.computedInfo.searchKeywords.includes(term.toLowerCase()));
      score += (keywordMatches.length / searchTerms.length) * 1.5;

      // Tag and genre match
      if (video.extractedInfo.genre) {
        score += this.calculateMatchScore(searchTerms, video.extractedInfo.genre) * 1.2;
      }

      if (score > 0.1) {
        // Minimum relevance threshold
        matches.push({
          videoId: video.id,
          score,
          matchReasons: this.generateMatchReasons(searchTerms, video),
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  private async applyFilters(filters: SearchFilters): Promise<SearchMatch[]> {
    let filtered = [...this.searchIndex.videos];

    // Duration filter
    if (filters.durationRange) {
      filtered = filtered.filter(
        v => v.basicInfo.duration >= filters.durationRange.min && v.basicInfo.duration <= filters.durationRange.max
      );
    }

    // Quality filter
    if (filters.quality) {
      filtered = filtered.filter(v => filters.quality.includes(v.computedInfo.quality));
    }

    // Content type filter
    if (filters.contentType) {
      filtered = filtered.filter(v => filters.contentType.includes(v.computedInfo.contentType));
    }

    // Date range filter
    if (filters.dateRange) {
      filtered = filtered.filter(
        v => v.basicInfo.createdAt >= filters.dateRange.start && v.basicInfo.createdAt <= filters.dateRange.end
      );
    }

    // User tags filter
    if (filters.userTags) {
      filtered = filtered.filter(v => filters.userTags.some(tag => v.userInfo.userTags.includes(tag)));
    }

    // Collections filter
    if (filters.collections) {
      filtered = filtered.filter(v =>
        filters.collections.some(collection => v.userInfo.collections.includes(collection))
      );
    }

    return filtered.map(video => ({
      videoId: video.id,
      score: 1.0,
      matchReasons: ['filter_match'],
    }));
  }
}

// Search query types
interface SearchQuery {
  text?: string;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'date' | 'duration' | 'title' | 'popularity';
  limit?: number;
  offset?: number;
}

interface SearchFilters {
  durationRange?: { min: number; max: number };
  quality?: ('sd' | 'hd' | '4k' | '8k')[];
  contentType?: ('movie' | 'episode' | 'clip' | 'other')[];
  dateRange?: { start: Date; end: Date };
  userTags?: string[];
  collections?: string[];
  favorites?: boolean;
  unwatched?: boolean;
}

interface SearchResult {
  video: VideoMetadataCache;
  score: number;
  matchReasons: string[];
  relevanceExplanation: string;
}
```

#### 2.2 Smart Categorization System

```typescript
// backend/src/services/libraryCategories.ts
export class LibraryCategorizer {
  async categorizeLibrary(videos: VideoMetadataCache[]): Promise<CategoryTree> {
    const categories: CategoryTree = {
      root: {
        name: 'All Videos',
        children: new Map(),
        videoIds: videos.map(v => v.id),
      },
    };

    // Auto-categorize by content type
    await this.categorizeByContentType(categories, videos);

    // Auto-categorize by quality
    await this.categorizeByQuality(categories, videos);

    // Auto-categorize by date
    await this.categorizeByDate(categories, videos);

    // User-defined categories
    await this.applyUserCategories(categories, videos);

    return categories;
  }

  private async categorizeByContentType(categories: CategoryTree, videos: VideoMetadataCache[]) {
    const contentTypes = ['Movies', 'TV Shows', 'Clips', 'Other'];

    for (const type of contentTypes) {
      const typeVideos = videos.filter(v => {
        switch (type) {
          case 'Movies':
            return v.computedInfo.contentType === 'movie';
          case 'TV Shows':
            return v.computedInfo.contentType === 'episode';
          case 'Clips':
            return v.computedInfo.contentType === 'clip';
          case 'Other':
            return v.computedInfo.contentType === 'other';
          default:
            return false;
        }
      });

      if (typeVideos.length > 0) {
        categories.root.children.set(type, {
          name: type,
          children: new Map(),
          videoIds: typeVideos.map(v => v.id),
          metadata: { type: 'content_type', value: type.toLowerCase() },
        });
      }
    }
  }

  private async categorizeByQuality(categories: CategoryTree, videos: VideoMetadataCache[]) {
    const qualityCategories = new Map([
      ['4K & 8K', ['4k', '8k']],
      ['HD', ['hd']],
      ['Standard', ['sd']],
    ]);

    const qualityParent: CategoryNode = {
      name: 'By Quality',
      children: new Map(),
      videoIds: [],
    };

    for (const [categoryName, qualities] of qualityCategories) {
      const qualityVideos = videos.filter(v => qualities.includes(v.computedInfo.quality));

      if (qualityVideos.length > 0) {
        qualityParent.children.set(categoryName, {
          name: categoryName,
          children: new Map(),
          videoIds: qualityVideos.map(v => v.id),
          metadata: { type: 'quality', values: qualities },
        });
      }
    }

    if (qualityParent.children.size > 0) {
      categories.root.children.set('By Quality', qualityParent);
    }
  }

  async generateSmartCollections(videos: VideoMetadataCache[]): Promise<SmartCollection[]> {
    const collections: SmartCollection[] = [];

    // Recently Added
    const recentVideos = videos
      .filter(v => v.basicInfo.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .sort((a, b) => b.basicInfo.createdAt.getTime() - a.basicInfo.createdAt.getTime());

    if (recentVideos.length > 0) {
      collections.push({
        id: 'recent',
        name: 'Recently Added',
        description: 'Videos added in the last week',
        videoIds: recentVideos.slice(0, 20).map(v => v.id),
        rules: {
          type: 'date_added',
          parameters: { days: 7 },
        },
        autoUpdate: true,
      });
    }

    // Most Popular (by watch count)
    const popularVideos = videos
      .filter(v => v.userInfo.watchCount > 0)
      .sort((a, b) => b.userInfo.watchCount - a.userInfo.watchCount);

    if (popularVideos.length > 0) {
      collections.push({
        id: 'popular',
        name: 'Most Watched',
        description: 'Your most popular videos',
        videoIds: popularVideos.slice(0, 20).map(v => v.id),
        rules: {
          type: 'watch_count',
          parameters: { minimum: 1 },
        },
        autoUpdate: true,
      });
    }

    // Long Form Content
    const longVideos = videos
      .filter(v => v.basicInfo.duration > 3600) // > 1 hour
      .sort((a, b) => b.basicInfo.duration - a.basicInfo.duration);

    if (longVideos.length > 5) {
      collections.push({
        id: 'movies',
        name: 'Feature Length',
        description: 'Videos longer than 1 hour',
        videoIds: longVideos.map(v => v.id),
        rules: {
          type: 'duration',
          parameters: { minimum: 3600 },
        },
        autoUpdate: true,
      });
    }

    return collections;
  }
}

interface CategoryTree {
  root: CategoryNode;
}

interface CategoryNode {
  name: string;
  children: Map<string, CategoryNode>;
  videoIds: string[];
  metadata?: {
    type: string;
    value?: string;
    values?: string[];
  };
}

interface SmartCollection {
  id: string;
  name: string;
  description: string;
  videoIds: string[];
  rules: {
    type: 'date_added' | 'watch_count' | 'duration' | 'quality' | 'tags';
    parameters: Record<string, any>;
  };
  autoUpdate: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### Phase 3: Library Analytics & Insights

#### 3.1 Analytics Service

```typescript
// backend/src/services/libraryAnalytics.ts
export class LibraryAnalytics {
  async generateLibraryInsights(videos: VideoMetadataCache[]): Promise<LibraryInsights> {
    const insights: LibraryInsights = {
      overview: await this.generateOverviewStats(videos),
      contentDistribution: await this.analyzeContentDistribution(videos),
      qualityBreakdown: await this.analyzeQualityDistribution(videos),
      storageAnalysis: await this.analyzeStorageUsage(videos),
      viewingPatterns: await this.analyzeViewingPatterns(videos),
      recommendations: await this.generateRecommendations(videos),
      generatedAt: new Date(),
    };

    return insights;
  }

  private async generateOverviewStats(videos: VideoMetadataCache[]): Promise<OverviewStats> {
    const totalDuration = videos.reduce((sum, v) => sum + v.basicInfo.duration, 0);
    const totalSize = videos.reduce((sum, v) => sum + v.basicInfo.fileSize, 0);

    return {
      totalVideos: videos.length,
      totalDuration: {
        seconds: totalDuration,
        humanReadable: this.formatDuration(totalDuration),
      },
      totalStorage: {
        bytes: totalSize,
        humanReadable: this.formatBytes(totalSize),
      },
      averageFileSize: totalSize / videos.length,
      averageDuration: totalDuration / videos.length,
      oldestVideo: videos.reduce((oldest, v) => (v.basicInfo.createdAt < oldest.basicInfo.createdAt ? v : oldest)),
      newestVideo: videos.reduce((newest, v) => (v.basicInfo.createdAt > newest.basicInfo.createdAt ? v : newest)),
      mostWatched: videos.reduce((most, v) => (v.userInfo.watchCount > most.userInfo.watchCount ? v : most)),
    };
  }

  private async analyzeContentDistribution(videos: VideoMetadataCache[]): Promise<ContentDistribution> {
    const distribution = new Map<string, number>();
    const durationByType = new Map<string, number>();

    for (const video of videos) {
      const type = video.computedInfo.contentType;
      distribution.set(type, (distribution.get(type) || 0) + 1);
      durationByType.set(type, (durationByType.get(type) || 0) + video.basicInfo.duration);
    }

    return {
      byCount: Object.fromEntries(distribution),
      byDuration: Object.fromEntries(durationByType),
      percentages: Object.fromEntries(
        Array.from(distribution.entries()).map(([type, count]) => [type, (count / videos.length) * 100])
      ),
    };
  }

  async generateDuplicateReport(videos: VideoMetadataCache[]): Promise<DuplicateReport[]> {
    const duplicates: DuplicateReport[] = [];
    const processed = new Set<string>();

    for (const video of videos) {
      if (processed.has(video.id)) continue;

      const similarVideos = videos.filter(v => v.id !== video.id && this.calculateSimilarity(video, v) > 0.8);

      if (similarVideos.length > 0) {
        duplicates.push({
          primaryVideo: video,
          duplicates: similarVideos,
          similarityScore: Math.max(...similarVideos.map(v => this.calculateSimilarity(video, v))),
          recommendedAction: this.recommendDuplicateAction(video, similarVideos),
          potentialSavings: {
            files: similarVideos.length,
            storage: similarVideos.reduce((sum, v) => sum + v.basicInfo.fileSize, 0),
          },
        });

        // Mark as processed
        processed.add(video.id);
        similarVideos.forEach(v => processed.add(v.id));
      }
    }

    return duplicates.sort((a, b) => b.potentialSavings.storage - a.potentialSavings.storage);
  }

  private calculateSimilarity(video1: VideoMetadataCache, video2: VideoMetadataCache): number {
    let score = 0;

    // Duration similarity (within 5%)
    const durationDiff = Math.abs(video1.basicInfo.duration - video2.basicInfo.duration);
    const durationSimilarity = 1 - durationDiff / Math.max(video1.basicInfo.duration, video2.basicInfo.duration);
    if (durationSimilarity > 0.95) score += 0.4;

    // File size similarity (within 10%)
    const sizeDiff = Math.abs(video1.basicInfo.fileSize - video2.basicInfo.fileSize);
    const sizeSimilarity = 1 - sizeDiff / Math.max(video1.basicInfo.fileSize, video2.basicInfo.fileSize);
    if (sizeSimilarity > 0.9) score += 0.3;

    // Title/filename similarity
    const titleSimilarity = this.calculateStringSimilarity(
      video1.extractedInfo.title || video1.basicInfo.filename,
      video2.extractedInfo.title || video2.basicInfo.filename
    );
    score += titleSimilarity * 0.3;

    return score;
  }
}
```

### Phase 4: API Integration

#### 4.1 Enhanced Library Endpoints

```typescript
// backend/src/routes/library.ts
import express from 'express';
import { LibrarySearchEngine } from '../services/librarySearch';
import { LibraryCategorizer } from '../services/libraryCategories';
import { LibraryAnalytics } from '../services/libraryAnalytics';

const router = express.Router();
const searchEngine = new LibrarySearchEngine();
const categorizer = new LibraryCategorizer();
const analytics = new LibraryAnalytics();

// Advanced search endpoint
router.get('/search', async (req, res) => {
  try {
    const profileId = req.headers['x-profile-id'] as string;
    const query = {
      text: req.query.q as string,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      sortBy: (req.query.sort as any) || 'relevance',
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0,
    };

    const results = await searchEngine.search(query, profileId);

    res.json({
      success: true,
      results,
      total: results.length,
      query: {
        text: query.text,
        filters: query.filters,
        sortBy: query.sortBy,
      },
      suggestions: await searchEngine.generateSearchSuggestions(query.text, profileId),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message,
    });
  }
});

// Category browsing
router.get('/categories', async (req, res) => {
  try {
    const videos = await searchEngine.getAllVideos();
    const categories = await categorizer.categorizeLibrary(videos);
    const smartCollections = await categorizer.generateSmartCollections(videos);

    res.json({
      success: true,
      categories,
      smartCollections,
      totalVideos: videos.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load categories',
    });
  }
});

// Library analytics
router.get('/analytics', async (req, res) => {
  try {
    const videos = await searchEngine.getAllVideos();
    const insights = await analytics.generateLibraryInsights(videos);
    const duplicates = await analytics.generateDuplicateReport(videos);

    res.json({
      success: true,
      insights,
      duplicates: duplicates.slice(0, 10), // Top 10 duplicate groups
      duplicateCount: duplicates.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Analytics generation failed',
    });
  }
});

// User actions (favorites, tags, collections)
router.post('/videos/:id/favorite', async (req, res) => {
  try {
    const videoId = req.params.id;
    const profileId = req.headers['x-profile-id'] as string;

    await searchEngine.toggleFavorite(videoId, profileId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite',
    });
  }
});

router.post('/videos/:id/tags', async (req, res) => {
  try {
    const videoId = req.params.id;
    const { tags } = req.body;

    await searchEngine.updateUserTags(videoId, tags);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update tags',
    });
  }
});

export default router;
```

### Phase 5: Frontend Integration Points

#### 5.1 Search Interface Integration

```typescript
// frontend/src/hooks/useLibrarySearch.ts
export const useLibrarySearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (query: string, newFilters?: SearchFilters) => {
      setLoading(true);
      try {
        const response = await fetch(
          '/api/library/search?' +
            new URLSearchParams({
              q: query,
              filters: JSON.stringify(newFilters || filters),
              sort: 'relevance',
            })
        );

        const data = await response.json();
        setResults(data.results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const quickSearch = useCallback(debounce(search, 300), [search]);

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    results,
    loading,
    search,
    quickSearch,
  };
};
```

## Validation Loops

### Level 1: Unit Testing

```typescript
// tests/services/librarySearch.test.ts
describe('LibrarySearchEngine', () => {
  test('should find videos by title', async () => {
    const engine = new LibrarySearchEngine();
    const results = await engine.search({ text: 'avengers' }, 'test-profile');

    expect(results).toHaveLength(2);
    expect(results[0].video.extractedInfo.title).toContain('Avengers');
  });

  test('should filter by duration', async () => {
    const engine = new LibrarySearchEngine();
    const results = await engine.search(
      {
        filters: { durationRange: { min: 3600, max: 7200 } },
      },
      'test-profile'
    );

    results.forEach(result => {
      expect(result.video.basicInfo.duration).toBeGreaterThanOrEqual(3600);
      expect(result.video.basicInfo.duration).toBeLessThanOrEqual(7200);
    });
  });
});
```

### Level 2: Integration Testing

```bash
# Test search performance with large library
npm run test:search:performance

# Test metadata cache consistency
npm run test:cache:consistency

# Test duplicate detection accuracy
npm run test:duplicates:accuracy
```

### Level 3: User Acceptance Testing

- **Search Accuracy**: Users can find 95% of videos they remember having
- **Performance**: Search results return within 200ms for libraries up to 10,000 videos
- **Categorization**: Auto-generated categories feel intuitive and useful
- **Duplicate Detection**: 90% accuracy in identifying true duplicates vs. similar content

## Success Metrics

### Technical Performance

- **Search Response Time**: < 200ms for text search, < 100ms for filtered browsing
- **Cache Hit Rate**: > 95% for metadata requests on previously scanned files
- **Memory Usage**: < 100MB RAM for libraries up to 5,000 videos
- **Storage Overhead**: < 5% additional disk space for metadata cache

### User Experience

- **Discovery Success Rate**: Users find target content within 3 interactions 90% of the time
- **Browse vs. Search**: 60/40 split between browsing categories and active searching
- **User Engagement**: 25% increase in content viewing after implementation
- **Organization Satisfaction**: 8/10 average rating on library organization surveys

### Business Value

- **Support Ticket Reduction**: 50% fewer "can't find video" issues
- **Feature Usage**: 80% of users actively use search within first week
- **Content Utilization**: 30% increase in viewing of older content through improved discovery
- **System Adoption**: Search becomes primary navigation method within one month

## Anti-Patterns to Avoid

❌ **Database Dependency Creep**: Don't let search complexity drive you toward external databases
**Why bad**: Violates SOFATHEK's file-system simplicity principle
**Better**: Keep using JSON sidecar files and in-memory indexing

❌ **Over-Engineering Search**: Don't implement enterprise search features like fuzzy matching, synonyms, or ML-based relevance
**Why bad**: Complexity outweighs benefit for family media centers
**Better**: Focus on fast, predictable keyword and metadata matching

❌ **Metadata Extraction Bottlenecks**: Don't re-extract metadata on every library browse
**Why bad**: Makes interface sluggish and wastes system resources
**Better**: Aggressive caching with smart invalidation based on file modification times

❌ **Category Explosion**: Don't create too many auto-generated categories
**Why bad**: Overwhelming choice paradox reduces usability
**Better**: Start with 5-7 main categories, allow user customization

❌ **Search UI Complexity**: Don't expose all search capabilities in the main interface
**Why bad**: Complex interfaces intimidate family users
**Better**: Progressive disclosure - simple search box with optional advanced filters

## Variation Guidance

**IMPORTANT**: Implementation should vary based on library size and family usage patterns.

**For Small Libraries** (< 500 videos):

- Emphasize browsing over search
- Simpler categorization
- Focus on recently added and favorites

**For Large Libraries** (> 2000 videos):

- Prioritize search performance
- More sophisticated categorization
- Advanced duplicate detection

**For Family-Heavy Usage**:

- Content rating emphasis
- Collection sharing features
- Simpler search interface

**For Power Users**:

- Advanced filter combinations
- Bulk operations support
- Detailed analytics

## Remember

**Intelligent library management transforms a file browser into a media discovery engine.** The goal isn't to create the most sophisticated search system possible—it's to make family media libraries feel organized, discoverable, and delightful to browse.

Great library management feels invisible to users while making their content feel perfectly organized. Focus on speed, simplicity, and smart defaults that work without configuration.

**SOFATHEK users should never think "I know I have that video somewhere"—they should always know exactly where to find it.**
