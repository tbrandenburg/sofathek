# PRP-2.5: Content Organization Automation System

## Purpose & Core Principles

### Purpose

Transform SOFATHEK from a passive file scanner into an intelligent content organization system that automatically structures, renames, categorizes, and maintains video libraries according to family preferences while preserving user control and maintaining file system simplicity.

### Philosophy: Intelligent Automation with Human Override

Before automating organization, ask:

- How can automation reduce family media management burden?
- What organization patterns reflect how families actually browse content?
- How do we balance automation with user preferences and control?
- What makes content organization intuitive for all family members?

### Core Principles

1. **Gentle Automation**: Suggest improvements rather than forcing changes
2. **Pattern Learning**: Adapt to family organization preferences over time
3. **Safety First**: Never destructively modify files without explicit permission
4. **Reversible Actions**: All organization changes can be undone or adjusted
5. **Progressive Enhancement**: Start simple, add sophistication based on library patterns

## Gap Analysis: Current vs. Target State

### Current State (What Works)

✅ **Basic file scanning** discovers all video files in specified directories
✅ **Metadata extraction** pulls technical information from video files
✅ **Simple file listing** presents videos in chronological order
✅ **Profile-based access** ensures family-appropriate content organization
✅ **Manual file management** allows users to organize files themselves

### Critical Gaps (What's Missing)

❌ **Automatic File Organization** - Videos remain in original upload/download locations
❌ **Smart Naming** - Filenames often cryptic or inconsistent (e.g., "VID_20231205_142318.mp4")
❌ **Series Detection** - TV episodes scattered across different folders
❌ **Duplicate Management** - Same content exists in multiple formats/locations
❌ **Batch Operations** - No way to apply changes to multiple files efficiently
❌ **Content Lifecycle** - No automated archiving, cleanup, or maintenance
❌ **Family Preferences** - System doesn't learn or adapt to family organization patterns
❌ **Quality Consolidation** - Multiple versions of same content without intelligent selection

### User Impact of Gaps

- **Chaotic Browsing**: Users struggle to find content in disorganized libraries
- **Storage Waste**: Duplicates and poor quality files consume unnecessary space
- **Manual Effort**: Families spend hours organizing content instead of enjoying it
- **Inconsistent Experience**: Different family members organize differently, creating confusion

## Implementation Strategy

### Phase 1: Intelligent Content Analysis Engine

#### 1.1 Content Pattern Recognition System

```typescript
// backend/src/services/organization/patternAnalyzer.ts
export class ContentPatternAnalyzer {
  private patterns: OrganizationPattern[] = [];
  private userPreferences: UserPreferences;

  async analyzeLibraryPatterns(videos: VideoMetadataCache[]): Promise<LibraryAnalysis> {
    const analysis: LibraryAnalysis = {
      contentTypes: await this.analyzeContentTypes(videos),
      namingPatterns: await this.analyzeNamingPatterns(videos),
      directoryStructure: await this.analyzeDirectoryStructure(videos),
      duplicates: await this.findDuplicates(videos),
      qualityDistribution: await this.analyzeQualityDistribution(videos),
      organizationOpportunities: [],
      recommendations: [],
    };

    // Generate organization recommendations
    analysis.organizationOpportunities = await this.identifyOrganizationOpportunities(analysis);
    analysis.recommendations = await this.generateRecommendations(analysis);

    return analysis;
  }

  private async analyzeContentTypes(videos: VideoMetadataCache[]): Promise<ContentTypeAnalysis> {
    const typeDistribution = new Map<string, VideoGroup>();

    for (const video of videos) {
      const contentType = await this.classifyContent(video);

      if (!typeDistribution.has(contentType.type)) {
        typeDistribution.set(contentType.type, {
          type: contentType.type,
          videos: [],
          totalSize: 0,
          avgQuality: 0,
          patterns: [],
        });
      }

      const group = typeDistribution.get(contentType.type)!;
      group.videos.push(video);
      group.totalSize += video.basicInfo.fileSize;
    }

    // Analyze patterns within each content type
    for (const [type, group] of typeDistribution) {
      group.patterns = await this.findTypeSpecificPatterns(group.videos);
      group.avgQuality = this.calculateAverageQuality(group.videos);
    }

    return {
      distribution: Object.fromEntries(typeDistribution),
      dominantType: this.findDominantContentType(typeDistribution),
      mixedContent: typeDistribution.size > 3,
      organizationComplexity: this.calculateOrganizationComplexity(typeDistribution),
    };
  }

  private async classifyContent(video: VideoMetadataCache): Promise<ContentClassification> {
    const filename = video.basicInfo.filename.toLowerCase();
    const duration = video.basicInfo.duration;
    const path = video.filePath;

    // TV Series Detection
    if (this.isTVEpisode(filename, path)) {
      const seriesInfo = this.extractSeriesInfo(filename, path);
      return {
        type: 'tv_series',
        subtype: seriesInfo.seriesName,
        confidence: seriesInfo.confidence,
        metadata: {
          series: seriesInfo.seriesName,
          season: seriesInfo.season,
          episode: seriesInfo.episode,
          episodeTitle: seriesInfo.episodeTitle,
        },
      };
    }

    // Movie Detection
    if (duration > 3600 && this.isMoviePattern(filename)) {
      return {
        type: 'movie',
        confidence: 0.8,
        metadata: {
          title: this.extractMovieTitle(filename),
          year: this.extractYear(filename),
        },
      };
    }

    // Home Videos Detection
    if (this.isHomeVideo(filename, path)) {
      const homeVideoInfo = this.analyzeHomeVideo(filename, path, video);
      return {
        type: 'home_video',
        subtype: homeVideoInfo.category,
        confidence: homeVideoInfo.confidence,
        metadata: homeVideoInfo.metadata,
      };
    }

    // Short Content Detection
    if (duration < 1800) {
      // < 30 minutes
      return {
        type: 'short_content',
        subtype: this.classifyShortContent(filename, duration),
        confidence: 0.6,
      };
    }

    return {
      type: 'unknown',
      confidence: 0.1,
    };
  }

  private isTVEpisode(filename: string, path: string): boolean {
    const patterns = [
      /s\d{1,2}e\d{1,2}/i, // S01E01
      /season\s*\d+.*episode\s*\d+/i, // Season 1 Episode 1
      /\d{1,2}x\d{1,2}/, // 1x01
      /ep\d+/i, // ep01
      /episode\s*\d+/i, // episode 1
    ];

    return (
      patterns.some(pattern => pattern.test(filename)) ||
      path.toLowerCase().includes('series') ||
      path.toLowerCase().includes('season')
    );
  }

  private extractSeriesInfo(filename: string, path: string): SeriesInfo {
    const seriesName = this.extractSeriesName(filename, path);
    const seasonEpisode = this.extractSeasonEpisode(filename);
    const episodeTitle = this.extractEpisodeTitle(filename);

    return {
      seriesName,
      season: seasonEpisode.season,
      episode: seasonEpisode.episode,
      episodeTitle,
      confidence: this.calculateSeriesConfidence(seriesName, seasonEpisode),
    };
  }

  private extractSeriesName(filename: string, path: string): string {
    // Try to extract from path first (more reliable)
    const pathParts = path.split('/');
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const part = pathParts[i];
      if (part.toLowerCase().includes('season') || part.match(/s\d{1,2}/i)) {
        return pathParts[i - 1] || 'Unknown Series';
      }
    }

    // Extract from filename
    const patterns = [/^(.+?)[\s\.\-]s\d{1,2}e\d{1,2}/i, /^(.+?)[\s\.\-]\d{1,2}x\d{1,2}/i, /^(.+?)[\s\.\-]season/i];

    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        return this.cleanSeriesName(match[1]);
      }
    }

    return 'Unknown Series';
  }

  private analyzeHomeVideo(filename: string, path: string, video: VideoMetadataCache): HomeVideoInfo {
    const metadata = video.basicInfo;
    const patterns = {
      birthday: /birthday|bday|party/i,
      vacation: /vacation|trip|travel|holiday/i,
      wedding: /wedding|marriage/i,
      graduation: /graduation|grad/i,
      christmas: /christmas|xmas|holiday/i,
      family: /family|reunion/i,
      kids: /kids|children|baby/i,
      sports: /game|sport|soccer|football|basketball/i,
    };

    let category = 'general';
    let confidence = 0.5;

    for (const [cat, pattern] of Object.entries(patterns)) {
      if (pattern.test(filename) || pattern.test(path)) {
        category = cat;
        confidence = 0.8;
        break;
      }
    }

    // Analyze creation date for temporal organization
    const createdAt = metadata.createdAt;
    const year = createdAt.getFullYear();
    const month = createdAt.getMonth();

    return {
      category,
      confidence,
      metadata: {
        year,
        month,
        season: this.getSeasonFromMonth(month),
        suggestedPath: this.generateHomeVideoPath(category, year, month),
      },
    };
  }
}

interface LibraryAnalysis {
  contentTypes: ContentTypeAnalysis;
  namingPatterns: NamingPatternAnalysis;
  directoryStructure: DirectoryStructureAnalysis;
  duplicates: DuplicateGroup[];
  qualityDistribution: QualityAnalysis;
  organizationOpportunities: OrganizationOpportunity[];
  recommendations: OrganizationRecommendation[];
}

interface ContentClassification {
  type: string;
  subtype?: string;
  confidence: number;
  metadata?: Record<string, any>;
}

interface SeriesInfo {
  seriesName: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  confidence: number;
}

interface HomeVideoInfo {
  category: string;
  confidence: number;
  metadata: {
    year: number;
    month: number;
    season: string;
    suggestedPath: string;
  };
}
```

#### 1.2 Smart Organization Engine

```typescript
// backend/src/services/organization/organizationEngine.ts
export class SmartOrganizationEngine {
  private preferences: OrganizationPreferences;
  private safetyMode: boolean = true;

  async generateOrganizationPlan(analysis: LibraryAnalysis): Promise<OrganizationPlan> {
    const plan: OrganizationPlan = {
      id: crypto.randomUUID(),
      title: 'Smart Library Organization',
      description: 'Automated organization suggestions based on content analysis',
      actions: [],
      estimatedTime: 0,
      estimatedSpaceSavings: 0,
      riskLevel: 'low',
      createdAt: new Date(),
    };

    // Generate organization actions based on analysis
    const actions: OrganizationAction[] = [];

    // 1. Handle duplicates first (biggest space savings)
    actions.push(...(await this.generateDuplicateActions(analysis.duplicates)));

    // 2. Organize TV series
    actions.push(...(await this.generateSeriesOrganizationActions(analysis)));

    // 3. Organize movies
    actions.push(...(await this.generateMovieOrganizationActions(analysis)));

    // 4. Organize home videos
    actions.push(...(await this.generateHomeVideoOrganizationActions(analysis)));

    // 5. Clean up and optimize
    actions.push(...(await this.generateCleanupActions(analysis)));

    // 6. Apply smart naming
    actions.push(...(await this.generateNamingActions(analysis)));

    // Sort actions by priority and safety
    plan.actions = this.prioritizeActions(actions);
    plan.estimatedTime = this.calculateEstimatedTime(plan.actions);
    plan.estimatedSpaceSavings = this.calculateSpaceSavings(plan.actions);
    plan.riskLevel = this.calculateRiskLevel(plan.actions);

    return plan;
  }

  private async generateSeriesOrganizationActions(analysis: LibraryAnalysis): Promise<OrganizationAction[]> {
    const actions: OrganizationAction[] = [];

    // Find all TV series content
    const seriesContent = analysis.contentTypes.distribution.tv_series;
    if (!seriesContent) return actions;

    // Group episodes by series
    const seriesGroups = new Map<string, VideoMetadataCache[]>();
    for (const video of seriesContent.videos) {
      const seriesName = video.computedInfo?.series || 'Unknown Series';
      if (!seriesGroups.has(seriesName)) {
        seriesGroups.set(seriesName, []);
      }
      seriesGroups.get(seriesName)!.push(video);
    }

    // Generate organization actions for each series
    for (const [seriesName, episodes] of seriesGroups) {
      if (episodes.length < 2) continue; // Skip single episodes

      // Group by seasons
      const seasons = new Map<number, VideoMetadataCache[]>();
      episodes.forEach(episode => {
        const season = episode.computedInfo?.season || 1;
        if (!seasons.has(season)) {
          seasons.set(season, []);
        }
        seasons.get(season)!.push(episode);
      });

      // Create directory structure action
      const targetStructure = this.generateSeriesDirectoryStructure(seriesName, seasons);

      actions.push({
        id: crypto.randomUUID(),
        type: 'organize_series',
        title: `Organize "${seriesName}" episodes`,
        description: `Move ${episodes.length} episodes into organized season folders`,
        priority: 'high',
        riskLevel: 'low',
        estimatedTime: episodes.length * 2, // 2 seconds per episode
        actions: episodes.map(episode => ({
          type: 'move_file',
          sourceFile: episode.filePath,
          targetPath: this.generateEpisodePath(targetStructure, episode),
          reason: 'series_organization',
        })),
        benefits: [
          `Organize ${episodes.length} episodes by season`,
          'Enable proper series browsing',
          'Improve content discovery',
        ],
        preview: {
          before: episodes.slice(0, 3).map(e => e.filePath),
          after: episodes.slice(0, 3).map(e => this.generateEpisodePath(targetStructure, e)),
        },
      });
    }

    return actions;
  }

  private async generateDuplicateActions(duplicates: DuplicateGroup[]): Promise<OrganizationAction[]> {
    const actions: OrganizationAction[] = [];

    for (const duplicateGroup of duplicates) {
      const bestVersion = this.selectBestVersion(duplicateGroup.files);
      const duplicatesToRemove = duplicateGroup.files.filter(f => f.id !== bestVersion.id);

      if (duplicatesToRemove.length === 0) continue;

      const spaceSavings = duplicatesToRemove.reduce((sum, f) => sum + f.basicInfo.fileSize, 0);

      actions.push({
        id: crypto.randomUUID(),
        type: 'remove_duplicates',
        title: `Remove ${duplicatesToRemove.length} duplicate copies`,
        description: `Keep best quality version of "${bestVersion.extractedInfo.title || bestVersion.basicInfo.filename}"`,
        priority: 'medium',
        riskLevel: this.safetyMode ? 'medium' : 'low',
        estimatedTime: duplicatesToRemove.length * 5,
        spaceSavings,
        actions: [
          {
            type: 'keep_file',
            sourceFile: bestVersion.filePath,
            reason: 'best_quality_version',
          },
          ...duplicatesToRemove.map(duplicate => ({
            type: this.safetyMode ? 'move_to_trash' : 'delete_file',
            sourceFile: duplicate.filePath,
            reason: 'duplicate_content',
          })),
        ],
        benefits: [
          `Save ${this.formatBytes(spaceSavings)} of storage`,
          'Eliminate confusion from multiple copies',
          'Keep highest quality version',
        ],
        preview: {
          keeping: bestVersion.filePath,
          removing: duplicatesToRemove.map(d => d.filePath),
        },
      });
    }

    return actions;
  }

  private async generateNamingActions(analysis: LibraryAnalysis): Promise<OrganizationAction[]> {
    const actions: OrganizationAction[] = [];
    const namingIssues = analysis.namingPatterns.issues;

    // Find files with poor naming
    const filesToRename = namingIssues.crypticNames.concat(namingIssues.inconsistentNames);

    if (filesToRename.length > 0) {
      actions.push({
        id: crypto.randomUUID(),
        type: 'smart_rename',
        title: `Improve names for ${filesToRename.length} files`,
        description: 'Apply consistent, readable naming based on content analysis',
        priority: 'low',
        riskLevel: 'low',
        estimatedTime: filesToRename.length * 3,
        actions: filesToRename.map(video => ({
          type: 'rename_file',
          sourceFile: video.filePath,
          targetName: this.generateSmartName(video),
          reason: 'improve_readability',
        })),
        benefits: ['Make file names human-readable', 'Apply consistent naming convention', 'Improve file organization'],
        preview: {
          examples: filesToRename.slice(0, 5).map(video => ({
            before: path.basename(video.filePath),
            after: this.generateSmartName(video),
          })),
        },
      });
    }

    return actions;
  }

  private selectBestVersion(files: VideoMetadataCache[]): VideoMetadataCache {
    // Score each file based on quality factors
    const scoredFiles = files.map(file => ({
      file,
      score: this.calculateQualityScore(file),
    }));

    // Return file with highest score
    return scoredFiles.sort((a, b) => b.score - a.score)[0].file;
  }

  private calculateQualityScore(video: VideoMetadataCache): number {
    let score = 0;

    // Resolution score (higher is better)
    const resolution = video.basicInfo.resolution;
    if (resolution.includes('4K') || resolution.includes('2160')) score += 40;
    else if (resolution.includes('1080')) score += 30;
    else if (resolution.includes('720')) score += 20;
    else if (resolution.includes('480')) score += 10;

    // Bitrate score (higher is generally better, but with diminishing returns)
    const bitrate = video.basicInfo.bitrate || 0;
    score += Math.min(bitrate / 100000, 20); // Max 20 points for bitrate

    // File size score (reasonable size is good, too small/large is bad)
    const sizeGB = video.basicInfo.fileSize / (1024 * 1024 * 1024);
    const duration = video.basicInfo.duration / 3600; // hours
    const sizePerHour = sizeGB / duration;

    if (sizePerHour > 0.5 && sizePerHour < 8)
      score += 15; // Good size ratio
    else if (sizePerHour < 0.2)
      score -= 10; // Too compressed
    else if (sizePerHour > 15) score -= 5; // Unnecessarily large

    // Format score (modern formats preferred)
    const format = video.basicInfo.format.toLowerCase();
    if (format.includes('h264') || format.includes('h265') || format.includes('hevc')) score += 10;
    else if (format.includes('avi') || format.includes('wmv')) score -= 5;

    return score;
  }

  private generateSmartName(video: VideoMetadataCache): string {
    const contentType = video.computedInfo?.contentType;
    const title = video.extractedInfo.title;
    const filename = video.basicInfo.filename;

    switch (contentType) {
      case 'tv_series':
        return this.generateSeriesFileName(video);
      case 'movie':
        return this.generateMovieFileName(video);
      case 'home_video':
        return this.generateHomeVideoFileName(video);
      default:
        return title || this.cleanFilename(filename);
    }
  }
}

interface OrganizationPlan {
  id: string;
  title: string;
  description: string;
  actions: OrganizationAction[];
  estimatedTime: number; // seconds
  estimatedSpaceSavings: number; // bytes
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: Date;
}

interface OrganizationAction {
  id: string;
  type: 'organize_series' | 'remove_duplicates' | 'smart_rename' | 'create_collections' | 'cleanup_files';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime: number;
  spaceSavings?: number;
  actions: FileAction[];
  benefits: string[];
  preview?: any;
}

interface FileAction {
  type: 'move_file' | 'rename_file' | 'delete_file' | 'move_to_trash' | 'keep_file' | 'create_directory';
  sourceFile?: string;
  targetPath?: string;
  targetName?: string;
  reason: string;
}
```

### Phase 2: Automated Execution Engine

#### 2.1 Safe Execution System

```typescript
// backend/src/services/organization/executionEngine.ts
export class SafeExecutionEngine {
  private backupEnabled: boolean = true;
  private dryRunMode: boolean = true;
  private undoHistory: UndoAction[] = [];

  async executePlan(plan: OrganizationPlan, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const executionId = crypto.randomUUID();
    const result: ExecutionResult = {
      executionId,
      planId: plan.id,
      status: 'running',
      startedAt: new Date(),
      totalActions: plan.actions.length,
      completedActions: 0,
      failedActions: 0,
      results: [],
      spaceSaved: 0,
      errors: [],
    };

    try {
      // Pre-execution safety checks
      await this.performSafetyChecks(plan);

      // Create backup manifest if enabled
      if (this.backupEnabled && !options.skipBackup) {
        await this.createBackupManifest(plan, executionId);
      }

      // Execute actions in priority order
      for (const action of plan.actions) {
        try {
          const actionResult = await this.executeAction(action, options);
          result.results.push(actionResult);

          if (actionResult.success) {
            result.completedActions++;
            result.spaceSaved += actionResult.spaceSaved || 0;

            // Record undo information
            if (actionResult.undoInfo) {
              this.undoHistory.push({
                executionId,
                actionId: action.id,
                undoInfo: actionResult.undoInfo,
                timestamp: new Date(),
              });
            }
          } else {
            result.failedActions++;
            result.errors.push(`Action ${action.id} failed: ${actionResult.error}`);
          }

          // Progress callback
          if (options.progressCallback) {
            options.progressCallback(result);
          }
        } catch (error) {
          result.failedActions++;
          result.errors.push(`Action ${action.id} error: ${error.message}`);
        }
      }

      result.status = result.failedActions > 0 ? 'partial_success' : 'completed';
      result.completedAt = new Date();

      // Post-execution validation
      await this.validateExecution(result);
    } catch (error) {
      result.status = 'failed';
      result.errors.push(`Execution failed: ${error.message}`);
      result.completedAt = new Date();

      // Attempt rollback on critical failure
      if (options.rollbackOnFailure) {
        await this.rollbackExecution(executionId);
      }
    }

    return result;
  }

  async executeAction(action: OrganizationAction, options: ExecutionOptions): Promise<ActionResult> {
    const actionResult: ActionResult = {
      actionId: action.id,
      success: false,
      startedAt: new Date(),
      fileChanges: [],
      spaceSaved: 0,
    };

    try {
      // Dry run mode - simulate without making changes
      if (this.dryRunMode && !options.forceLive) {
        actionResult.success = true;
        actionResult.dryRun = true;
        actionResult.simulatedChanges = await this.simulateAction(action);
        return actionResult;
      }

      // Execute actual file operations
      for (const fileAction of action.actions) {
        const changeResult = await this.executeFileAction(fileAction);
        actionResult.fileChanges.push(changeResult);
        actionResult.spaceSaved += changeResult.spaceSaved || 0;
      }

      actionResult.success = actionResult.fileChanges.every(c => c.success);
      actionResult.completedAt = new Date();

      // Generate undo information
      if (actionResult.success) {
        actionResult.undoInfo = this.generateUndoInfo(actionResult.fileChanges);
      }
    } catch (error) {
      actionResult.success = false;
      actionResult.error = error.message;
      actionResult.completedAt = new Date();
    }

    return actionResult;
  }

  private async executeFileAction(fileAction: FileAction): Promise<FileChangeResult> {
    const result: FileChangeResult = {
      action: fileAction.type,
      sourceFile: fileAction.sourceFile,
      success: false,
      timestamp: new Date(),
    };

    try {
      switch (fileAction.type) {
        case 'move_file':
          result.targetFile = fileAction.targetPath;
          await this.moveFileWithBackup(fileAction.sourceFile!, fileAction.targetPath!);
          result.success = true;
          break;

        case 'rename_file':
          const newPath = path.join(path.dirname(fileAction.sourceFile!), fileAction.targetName!);
          result.targetFile = newPath;
          await this.renameFileWithBackup(fileAction.sourceFile!, newPath);
          result.success = true;
          break;

        case 'delete_file':
          const fileSize = (await fs.stat(fileAction.sourceFile!)).size;
          await this.deleteFileWithBackup(fileAction.sourceFile!);
          result.success = true;
          result.spaceSaved = fileSize;
          break;

        case 'move_to_trash':
          const trashPath = await this.moveToTrash(fileAction.sourceFile!);
          result.targetFile = trashPath;
          result.success = true;
          result.spaceSaved = (await fs.stat(fileAction.sourceFile!)).size;
          break;

        case 'create_directory':
          await fs.ensureDir(fileAction.targetPath!);
          result.success = true;
          break;
      }
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }

    return result;
  }

  private async moveFileWithBackup(sourcePath: string, targetPath: string): Promise<void> {
    // Ensure target directory exists
    await fs.ensureDir(path.dirname(targetPath));

    // Check if target exists and handle conflicts
    if (await fs.pathExists(targetPath)) {
      const conflictResolution = await this.resolveNameConflict(targetPath);
      targetPath = conflictResolution.resolvedPath;
    }

    // Create backup reference if enabled
    if (this.backupEnabled) {
      await this.recordFileBackup(sourcePath, targetPath, 'move');
    }

    // Perform the move
    await fs.move(sourcePath, targetPath);

    console.log(`Moved: ${sourcePath} -> ${targetPath}`);
  }

  private async resolveNameConflict(targetPath: string): Promise<{ resolvedPath: string; action: string }> {
    const dir = path.dirname(targetPath);
    const ext = path.extname(targetPath);
    const basename = path.basename(targetPath, ext);

    let counter = 1;
    let resolvedPath = targetPath;

    while (await fs.pathExists(resolvedPath)) {
      resolvedPath = path.join(dir, `${basename} (${counter})${ext}`);
      counter++;
    }

    return {
      resolvedPath,
      action: counter > 1 ? 'renamed_to_avoid_conflict' : 'no_conflict',
    };
  }

  async rollbackExecution(executionId: string): Promise<RollbackResult> {
    const undoActions = this.undoHistory.filter(action => action.executionId === executionId).reverse(); // Reverse order for proper undo

    const rollbackResult: RollbackResult = {
      executionId,
      totalActions: undoActions.length,
      successfulRollbacks: 0,
      failedRollbacks: 0,
      errors: [],
    };

    for (const undoAction of undoActions) {
      try {
        await this.executeUndo(undoAction.undoInfo);
        rollbackResult.successfulRollbacks++;
      } catch (error) {
        rollbackResult.failedRollbacks++;
        rollbackResult.errors.push(`Failed to undo action ${undoAction.actionId}: ${error.message}`);
      }
    }

    return rollbackResult;
  }

  async getDryRunPreview(plan: OrganizationPlan): Promise<DryRunPreview> {
    const preview: DryRunPreview = {
      planId: plan.id,
      totalActions: plan.actions.length,
      fileChanges: [],
      spaceSavingsEstimate: 0,
      riskAssessment: {
        overallRisk: plan.riskLevel,
        risks: [],
        safetyChecks: [],
      },
    };

    for (const action of plan.actions) {
      const simulatedChanges = await this.simulateAction(action);
      preview.fileChanges.push(...simulatedChanges);
      preview.spaceSavingsEstimate += action.spaceSavings || 0;
    }

    // Assess risks
    preview.riskAssessment = await this.assessRisks(plan, preview.fileChanges);

    return preview;
  }
}

interface ExecutionOptions {
  dryRun?: boolean;
  forceLive?: boolean;
  skipBackup?: boolean;
  rollbackOnFailure?: boolean;
  progressCallback?: (result: ExecutionResult) => void;
}

interface ExecutionResult {
  executionId: string;
  planId: string;
  status: 'running' | 'completed' | 'partial_success' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  totalActions: number;
  completedActions: number;
  failedActions: number;
  results: ActionResult[];
  spaceSaved: number;
  errors: string[];
}

interface ActionResult {
  actionId: string;
  success: boolean;
  startedAt: Date;
  completedAt?: Date;
  fileChanges: FileChangeResult[];
  spaceSaved: number;
  error?: string;
  dryRun?: boolean;
  simulatedChanges?: FileChangeResult[];
  undoInfo?: UndoInfo;
}

interface UndoAction {
  executionId: string;
  actionId: string;
  undoInfo: UndoInfo;
  timestamp: Date;
}
```

### Phase 3: Batch Processing and Scheduling

#### 3.1 Batch Operation Manager

```typescript
// backend/src/services/organization/batchManager.ts
export class BatchOperationManager {
  private processingQueue = new Queue('organization-batch');
  private scheduledJobs = new Map<string, ScheduledJob>();

  constructor() {
    this.setupWorkers();
  }

  async scheduleLibraryOrganization(config: BatchConfig): Promise<string> {
    const jobId = crypto.randomUUID();

    await this.processingQueue.add(
      'organize-library',
      {
        jobId,
        config,
        scheduledAt: new Date(),
      },
      {
        priority: config.priority || 5,
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
        delay: config.delay || 0,
      }
    );

    return jobId;
  }

  async scheduleRecurringOrganization(schedule: RecurringSchedule): Promise<string> {
    const scheduleId = crypto.randomUUID();

    const job = {
      scheduleId,
      schedule,
      nextRun: this.calculateNextRun(schedule),
      active: true,
      createdAt: new Date(),
    };

    this.scheduledJobs.set(scheduleId, job);

    // Schedule the first run
    await this.scheduleLibraryOrganization({
      ...schedule.config,
      delay: job.nextRun.getTime() - Date.now(),
    });

    return scheduleId;
  }

  private setupWorkers(): void {
    this.processingQueue.process('organize-library', async job => {
      const { jobId, config } = job.data;

      try {
        // Load current library state
        const videos = await this.getAllVideos();

        // Analyze library patterns
        const analyzer = new ContentPatternAnalyzer();
        const analysis = await analyzer.analyzeLibraryPatterns(videos);

        await job.progress(25);

        // Generate organization plan
        const organizationEngine = new SmartOrganizationEngine();
        const plan = await organizationEngine.generateOrganizationPlan(analysis);

        await job.progress(50);

        // Filter actions based on batch config
        const filteredPlan = this.filterPlanByConfig(plan, config);

        await job.progress(60);

        // Execute plan
        const executionEngine = new SafeExecutionEngine();
        const result = await executionEngine.executePlan(filteredPlan, {
          dryRun: config.dryRun,
          progressCallback: execResult => {
            const totalProgress = 60 + (execResult.completedActions / execResult.totalActions) * 40;
            job.progress(totalProgress);
          },
        });

        await job.progress(100);

        return {
          jobId,
          result,
          completedAt: new Date(),
        };
      } catch (error) {
        console.error(`Batch organization failed for job ${jobId}:`, error);
        throw error;
      }
    });
  }

  private filterPlanByConfig(plan: OrganizationPlan, config: BatchConfig): OrganizationPlan {
    const filteredActions = plan.actions.filter(action => {
      // Filter by action types
      if (config.actionTypes && !config.actionTypes.includes(action.type)) {
        return false;
      }

      // Filter by risk level
      if (config.maxRiskLevel) {
        const riskLevels = ['low', 'medium', 'high'];
        const maxRiskIndex = riskLevels.indexOf(config.maxRiskLevel);
        const actionRiskIndex = riskLevels.indexOf(action.riskLevel);
        if (actionRiskIndex > maxRiskIndex) {
          return false;
        }
      }

      // Filter by space savings threshold
      if (config.minSpaceSavings && (action.spaceSavings || 0) < config.minSpaceSavings) {
        return false;
      }

      return true;
    });

    return {
      ...plan,
      actions: filteredActions,
      title: `Filtered ${plan.title}`,
      description: `${plan.description} (${filteredActions.length}/${plan.actions.length} actions)`,
    };
  }

  async getOrganizationStats(): Promise<OrganizationStats> {
    const completedJobs = await this.processingQueue.getCompleted();
    const failedJobs = await this.processingQueue.getFailed();

    let totalSpaceSaved = 0;
    let totalFilesOrganized = 0;
    let totalActionsCompleted = 0;

    for (const job of completedJobs) {
      if (job.returnvalue?.result) {
        const result = job.returnvalue.result;
        totalSpaceSaved += result.spaceSaved || 0;
        totalFilesOrganized += result.completedActions || 0;
        totalActionsCompleted += result.totalActions || 0;
      }
    }

    return {
      totalJobs: completedJobs.length + failedJobs.length,
      successfulJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      totalSpaceSaved,
      totalFilesOrganized,
      totalActionsCompleted,
      averageJobTime: this.calculateAverageJobTime(completedJobs),
      lastOrganization: completedJobs.length > 0 ? completedJobs[completedJobs.length - 1].finishedOn : null,
    };
  }

  async generateOrganizationReport(timeRange: TimeRange): Promise<OrganizationReport> {
    const jobs = await this.getJobsInTimeRange(timeRange);

    const report: OrganizationReport = {
      timeRange,
      summary: {
        totalJobs: jobs.length,
        spaceSaved: 0,
        filesOrganized: 0,
        duplicatesRemoved: 0,
        seriesOrganized: 0,
      },
      actionBreakdown: {},
      beforeAfter: {
        organizationScore: {
          before: 0,
          after: 0,
          improvement: 0,
        },
        duplicateCount: {
          before: 0,
          after: 0,
          removed: 0,
        },
      },
      recommendations: [],
    };

    // Analyze job results
    for (const job of jobs) {
      if (job.returnvalue?.result) {
        const result = job.returnvalue.result;
        report.summary.spaceSaved += result.spaceSaved || 0;

        // Analyze actions by type
        for (const actionResult of result.results) {
          const actionType = this.getActionTypeFromResult(actionResult);
          report.actionBreakdown[actionType] = (report.actionBreakdown[actionType] || 0) + 1;

          if (actionType === 'remove_duplicates') {
            report.summary.duplicatesRemoved += actionResult.fileChanges.length;
          } else if (actionType === 'organize_series') {
            report.summary.seriesOrganized++;
          }
        }
      }
    }

    // Generate recommendations for future organization
    report.recommendations = await this.generateFutureRecommendations(report);

    return report;
  }
}

interface BatchConfig {
  actionTypes?: OrganizationActionType[];
  maxRiskLevel?: 'low' | 'medium' | 'high';
  minSpaceSavings?: number; // bytes
  dryRun?: boolean;
  priority?: number;
  delay?: number; // ms
}

interface RecurringSchedule {
  type: 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  config: BatchConfig;
}

interface OrganizationStats {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  totalSpaceSaved: number;
  totalFilesOrganized: number;
  totalActionsCompleted: number;
  averageJobTime: number; // ms
  lastOrganization: Date | null;
}

interface OrganizationReport {
  timeRange: TimeRange;
  summary: {
    totalJobs: number;
    spaceSaved: number;
    filesOrganized: number;
    duplicatesRemoved: number;
    seriesOrganized: number;
  };
  actionBreakdown: Record<string, number>;
  beforeAfter: {
    organizationScore: {
      before: number;
      after: number;
      improvement: number;
    };
    duplicateCount: {
      before: number;
      after: number;
      removed: number;
    };
  };
  recommendations: string[];
}
```

### Phase 4: API Integration & Frontend Support

#### 4.1 Organization API Routes

```typescript
// backend/src/routes/organization.ts
import express from 'express';
import { ContentPatternAnalyzer } from '../services/organization/patternAnalyzer';
import { SmartOrganizationEngine } from '../services/organization/organizationEngine';
import { SafeExecutionEngine } from '../services/organization/executionEngine';
import { BatchOperationManager } from '../services/organization/batchManager';

const router = express.Router();
const patternAnalyzer = new ContentPatternAnalyzer();
const organizationEngine = new SmartOrganizationEngine();
const executionEngine = new SafeExecutionEngine();
const batchManager = new BatchOperationManager();

// Analyze library organization opportunities
router.post('/analyze', async (req, res) => {
  try {
    const videos = await getAllVideos();
    const analysis = await patternAnalyzer.analyzeLibraryPatterns(videos);

    res.json({
      success: true,
      analysis,
      opportunities: analysis.organizationOpportunities.length,
      estimatedSpaceSavings: analysis.organizationOpportunities.reduce((sum, opp) => sum + (opp.spaceSavings || 0), 0),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message,
    });
  }
});

// Generate organization plan
router.post('/plan', async (req, res) => {
  try {
    const videos = await getAllVideos();
    const analysis = await patternAnalyzer.analyzeLibraryPatterns(videos);
    const plan = await organizationEngine.generateOrganizationPlan(analysis);

    res.json({
      success: true,
      plan,
      summary: {
        totalActions: plan.actions.length,
        estimatedTime: plan.estimatedTime,
        estimatedSpaceSavings: plan.estimatedSpaceSavings,
        riskLevel: plan.riskLevel,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Plan generation failed',
      message: error.message,
    });
  }
});

// Get dry run preview
router.post('/preview', async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await getOrganizationPlan(planId);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    const preview = await executionEngine.getDryRunPreview(plan);

    res.json({
      success: true,
      preview,
      safe: preview.riskAssessment.overallRisk === 'low',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Preview generation failed',
      message: error.message,
    });
  }
});

// Execute organization plan
router.post('/execute', async (req, res) => {
  try {
    const { planId, options = {} } = req.body;
    const plan = await getOrganizationPlan(planId);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    // Start execution
    const result = await executionEngine.executePlan(plan, {
      ...options,
      progressCallback: execResult => {
        // Could emit real-time updates via WebSocket here
      },
    });

    res.json({
      success: true,
      result,
      executionId: result.executionId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Execution failed',
      message: error.message,
    });
  }
});

// Schedule batch organization
router.post('/batch/schedule', async (req, res) => {
  try {
    const { config } = req.body;
    const jobId = await batchManager.scheduleLibraryOrganization(config);

    res.json({
      success: true,
      jobId,
      message: 'Batch organization scheduled',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Scheduling failed',
      message: error.message,
    });
  }
});

// Get organization statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await batchManager.getOrganizationStats();

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

// Rollback execution
router.post('/rollback/:executionId', async (req, res) => {
  try {
    const executionId = req.params.executionId;
    const rollbackResult = await executionEngine.rollbackExecution(executionId);

    res.json({
      success: true,
      rollbackResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Rollback failed',
      message: error.message,
    });
  }
});

export default router;
```

## Validation Loops

### Level 1: Unit Testing

```typescript
// tests/services/organization/patternAnalyzer.test.ts
describe('ContentPatternAnalyzer', () => {
  test('should detect TV series patterns', async () => {
    const analyzer = new ContentPatternAnalyzer();
    const mockVideos = [
      { filePath: '/videos/Show.Name.S01E01.mkv', basicInfo: { filename: 'Show.Name.S01E01.mkv' } },
      { filePath: '/videos/Show.Name.S01E02.mkv', basicInfo: { filename: 'Show.Name.S01E02.mkv' } },
    ];

    const analysis = await analyzer.analyzeLibraryPatterns(mockVideos);

    expect(analysis.contentTypes.distribution.tv_series).toBeDefined();
    expect(analysis.contentTypes.distribution.tv_series.videos.length).toBe(2);
  });

  test('should identify duplicate content', async () => {
    const analyzer = new ContentPatternAnalyzer();
    const duplicates = await analyzer.findDuplicates(mockVideosWithDuplicates);

    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].files.length).toBeGreaterThan(1);
  });
});
```

### Level 2: Integration Testing

```bash
# Test organization plan generation
npm run test:organization:planning

# Test safe execution engine
npm run test:organization:execution

# Test batch processing
npm run test:organization:batch

# Test rollback functionality
npm run test:organization:rollback
```

### Level 3: User Acceptance Testing

- **Organization Accuracy**: 90% of auto-generated organization plans approved by users
- **Safety Verification**: Zero data loss incidents during automated organization
- **Performance Testing**: Organization plans execute within estimated time +/- 20%
- **User Satisfaction**: 8/10 average rating on organization helpfulness

## Success Metrics

### Organization Effectiveness

- **Content Discoverability**: 50% improvement in time to find specific content
- **Storage Efficiency**: 25% average space savings through duplicate removal
- **Library Structure**: 80% of content properly categorized and organized
- **Naming Consistency**: 95% of files have human-readable, consistent names

### System Performance

- **Analysis Speed**: Complete library analysis within 5 minutes for 10,000 videos
- **Execution Speed**: Organization plans execute at > 95% of estimated time
- **Safety Record**: 100% rollback success rate for failed operations
- **Resource Usage**: Organization operations use < 30% system resources

### User Experience

- **Adoption Rate**: 70% of users run automated organization within first month
- **Approval Rate**: 85% of suggested organization plans executed by users
- **Maintenance Reduction**: 60% reduction in manual file organization time
- **Family Satisfaction**: 8.5/10 average rating on library organization quality

## Anti-Patterns to Avoid

❌ **Destructive Automation**: Don't perform irreversible file operations without user confirmation
**Why bad**: Risk of permanent data loss and user trust destruction
**Better**: Always provide dry run mode and comprehensive backup/undo systems

❌ **Aggressive Organization**: Don't reorganize files that users have manually organized
**Why bad**: Disrupts user-created organization patterns and preferences
**Better**: Learn from existing organization and enhance rather than replace

❌ **Inflexible Patterns**: Don't enforce single organization scheme for all content types
**Why bad**: Different content types need different organization approaches
**Better**: Adaptive organization based on content characteristics and usage patterns

❌ **Silent Operations**: Don't perform organization without clear user visibility
**Why bad**: Users lose track of changes and feel system is unpredictable
**Better**: Transparent operations with detailed progress reporting and change logs

❌ **Batch Overwhelm**: Don't propose massive organization changes all at once
**Why bad**: Users feel overwhelmed and reject beneficial changes
**Better**: Progressive organization with prioritized, digestible action sets

❌ **No Rollback**: Don't implement organization without comprehensive undo capability
**Why bad**: Users afraid to try organization features due to fear of mistakes
**Better**: Complete rollback system with detailed change tracking

## Variation Guidance

**IMPORTANT**: Organization approaches should adapt to family content types and preferences.

**For Media-Heavy Libraries**:

- Prioritize series/movie organization
- Focus on quality consolidation
- Emphasize visual browsing optimization
- Advanced metadata-driven organization

**For Home Video Libraries**:

- Date-based organization emphasis
- Event and occasion categorization
- Privacy-first organization patterns
- Family member-based organization

**For Mixed Content Libraries**:

- Hybrid organization strategies
- Content-type specific approaches
- User preference learning
- Flexible organization hierarchies

**For Storage-Constrained Systems**:

- Aggressive duplicate removal
- Quality-based consolidation
- Archive organization for old content
- Storage optimization priority

## Remember

**Smart organization transforms chaos into discovery.** The goal isn't to create the perfect file structure—it's to make family media libraries intuitive, maintainable, and delightful to browse while respecting user preferences and ensuring complete safety.

Great content organization feels effortless to users while working intelligently in the background. Focus on gentle automation that enhances rather than disrupts existing patterns, always with full transparency and rollback capability.

**SOFATHEK users should feel like their media library organizes itself while staying perfectly under their control.**
