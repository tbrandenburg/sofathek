/**
 * Usage Tracking API Routes
 * Handles video watching statistics, interactions, and analytics
 */

import { Router, Request, Response } from 'express';
import { WatchHistoryService } from '../services/watchHistory';

const router = Router();
const watchHistoryService = new WatchHistoryService();

/**
 * Start a new watch session
 * POST /api/usage/start-watch
 */
router.post('/start-watch', async (req: Request, res: Response) => {
  try {
    const { sessionId, videoId, videoInfo } = req.body;

    if (!sessionId || !videoId) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, videoId',
      });
    }

    const watchSession = await watchHistoryService.startWatchSessionAPI(
      sessionId,
      videoId,
      videoInfo || {}
    );

    res.json({
      success: true,
      watchSessionId: watchSession.id,
      message: 'Watch session started',
    });
  } catch (error) {
    console.error('Error starting watch session:', error);
    res.status(500).json({
      error: 'Failed to start watch session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update watch progress
 * POST /api/usage/update-progress
 */
router.post('/update-progress', async (req: Request, res: Response) => {
  try {
    const { sessionId, videoId, currentTime, duration, progress, watchTime } =
      req.body;

    if (!sessionId || !videoId || typeof currentTime !== 'number') {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, videoId, currentTime',
      });
    }

    await watchHistoryService.updateProgress(sessionId, videoId, {
      currentTime,
      duration: duration || 0,
      progress: progress || 0,
      watchTime: watchTime || 0,
    });

    res.json({
      success: true,
      message: 'Progress updated',
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({
      error: 'Failed to update progress',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * End watch session
 * POST /api/usage/end-watch
 */
router.post('/end-watch', async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      videoId,
      totalWatchTime,
      completed,
      finalProgress,
      unloadSave,
    } = req.body;

    if (!sessionId || !videoId) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, videoId',
      });
    }

    await watchHistoryService.endWatchSessionAPI(sessionId, videoId, {
      totalWatchTime: totalWatchTime || 0,
      completed: completed || false,
      finalProgress: finalProgress || 0,
      unloadSave: unloadSave || false,
    });

    res.json({
      success: true,
      message: 'Watch session ended',
    });
  } catch (error) {
    console.error('Error ending watch session:', error);
    res.status(500).json({
      error: 'Failed to end watch session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Record interaction event
 * POST /api/usage/interaction
 */
router.post('/interaction', async (req: Request, res: Response) => {
  try {
    const { sessionId, videoId, action, timestamp, data } = req.body;

    if (!sessionId || !videoId || !action) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, videoId, action',
      });
    }

    await watchHistoryService.recordInteraction(
      sessionId,
      videoId,
      action,
      data || {},
      timestamp || Date.now()
    );

    res.json({
      success: true,
      message: 'Interaction recorded',
    });
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({
      error: 'Failed to record interaction',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Session heartbeat
 * POST /api/usage/heartbeat
 */
router.post('/heartbeat', async (req: Request, res: Response) => {
  try {
    const { sessionId, videoId } = req.body;

    if (!sessionId || !videoId) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, videoId',
      });
    }

    await watchHistoryService.updateHeartbeat(sessionId, videoId);

    res.json({
      success: true,
      message: 'Heartbeat recorded',
    });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({
      error: 'Failed to update heartbeat',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get usage statistics
 * GET /api/usage/statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { range = '7d' } = req.query;

    const validRanges = ['7d', '30d', 'all'];
    if (!validRanges.includes(range as string)) {
      return res.status(400).json({
        error: 'Invalid range parameter. Valid values: 7d, 30d, all',
      });
    }

    const statistics = await watchHistoryService.getStatistics(range as string);

    res.json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get session statistics
 * GET /api/usage/session-stats
 */
router.get('/session-stats', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing required parameter: sessionId',
      });
    }

    const sessionStats = await watchHistoryService.getSessionStatistics(
      sessionId as string
    );

    res.json(sessionStats);
  } catch (error) {
    console.error('Error fetching session statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch session statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Export usage data
 * GET /api/usage/export
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { format = 'csv', range = '7d' } = req.query;

    const validFormats = ['csv', 'json'];
    const validRanges = ['7d', '30d', 'all'];

    if (!validFormats.includes(format as string)) {
      return res.status(400).json({
        error: 'Invalid format parameter. Valid values: csv, json',
      });
    }

    if (!validRanges.includes(range as string)) {
      return res.status(400).json({
        error: 'Invalid range parameter. Valid values: 7d, 30d, all',
      });
    }

    const exportData = await watchHistoryService.exportData(
      range as string,
      format as string
    );

    // Set appropriate headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `sofathek-usage-${range}-${timestamp}.${format}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
    } else {
      res.setHeader('Content-Type', 'application/json');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      error: 'Failed to export data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get recent watch sessions
 * GET /api/usage/recent-sessions
 */
router.get('/recent-sessions', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;

    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Invalid limit parameter. Must be between 1 and 100',
      });
    }

    const recentSessions =
      await watchHistoryService.getRecentSessions(limitNum);

    res.json({
      sessions: recentSessions,
      count: recentSessions.length,
    });
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    res.status(500).json({
      error: 'Failed to fetch recent sessions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Health check endpoint
 * GET /api/usage/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'usage-tracking',
    timestamp: new Date().toISOString(),
  });
});

export default router;
