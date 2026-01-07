import React, { useState, useEffect } from 'react';
import './SimpleUsage.css';

interface WatchSession {
  id: string;
  videoId: string;
  videoTitle: string;
  startTime: string;
  endTime?: string;
  totalWatchTime: number;
  progress: number;
  completed: boolean;
  sessionId: string;
}

interface UsageStatistics {
  totalViews: number;
  totalWatchTime: number;
  averageWatchTime: number;
  completionRate: number;
  mostWatchedVideos: Array<{
    videoId: string;
    title: string;
    views: number;
    totalTime: number;
  }>;
  dailyStats: Array<{
    date: string;
    views: number;
    watchTime: number;
  }>;
  recentSessions: WatchSession[];
}

const SimpleUsage: React.FC = () => {
  const [statistics, setStatistics] = useState<UsageStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/usage/statistics?range=${timeRange}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.statusText}`);
      }

      const data = await response.json();
      setStatistics(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching usage statistics:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load statistics'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/usage/export?format=${exportFormat}&range=${timeRange}`
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sofathek-usage-${timeRange}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="simple-usage">
        <div className="usage-header">
          <h1>Usage Statistics</h1>
        </div>
        <div className="loading">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="simple-usage">
        <div className="usage-header">
          <h1>Usage Statistics</h1>
        </div>
        <div className="error">
          <p>Error: {error}</p>
          <button onClick={fetchStatistics}>Retry</button>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="simple-usage">
        <div className="usage-header">
          <h1>Usage Statistics</h1>
        </div>
        <div className="no-data">No usage data available</div>
      </div>
    );
  }

  return (
    <div className="simple-usage">
      <div className="usage-header">
        <h1>Usage Statistics</h1>

        <div className="controls">
          <div className="time-range-selector">
            <label>Time Range:</label>
            <select
              value={timeRange}
              onChange={e =>
                setTimeRange(e.target.value as '7d' | '30d' | 'all')
              }
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div className="export-controls">
            <select
              value={exportFormat}
              onChange={e => setExportFormat(e.target.value as 'json' | 'csv')}
            >
              <option value="csv">CSV Format</option>
              <option value="json">JSON Format</option>
            </select>
            <button onClick={handleExport} className="export-btn">
              Export Data
            </button>
          </div>

          <button onClick={fetchStatistics} className="refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="stats-overview">
        <div className="stat-card">
          <h3>Total Views</h3>
          <div className="stat-value">
            {statistics.totalViews.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <h3>Total Watch Time</h3>
          <div className="stat-value">
            {formatTime(statistics.totalWatchTime)}
          </div>
        </div>

        <div className="stat-card">
          <h3>Average Watch Time</h3>
          <div className="stat-value">
            {formatTime(statistics.averageWatchTime)}
          </div>
        </div>

        <div className="stat-card">
          <h3>Completion Rate</h3>
          <div className="stat-value">
            {Math.round(statistics.completionRate * 100)}%
          </div>
        </div>
      </div>

      {/* Most Watched Videos */}
      <div className="section">
        <h2>Most Watched Videos</h2>
        {statistics.mostWatchedVideos.length > 0 ? (
          <div className="most-watched-table">
            <table>
              <thead>
                <tr>
                  <th>Video Title</th>
                  <th>Views</th>
                  <th>Total Watch Time</th>
                </tr>
              </thead>
              <tbody>
                {statistics.mostWatchedVideos.map((video, index) => (
                  <tr key={video.videoId}>
                    <td className="video-title">
                      <span className="rank">#{index + 1}</span>
                      {video.title}
                    </td>
                    <td>{video.views}</td>
                    <td>{formatTime(video.totalTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">No video data available</div>
        )}
      </div>

      {/* Daily Statistics */}
      <div className="section">
        <h2>Daily Activity</h2>
        {statistics.dailyStats.length > 0 ? (
          <div className="daily-stats-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Views</th>
                  <th>Watch Time</th>
                </tr>
              </thead>
              <tbody>
                {statistics.dailyStats.map(day => (
                  <tr key={day.date}>
                    <td>{new Date(day.date).toLocaleDateString()}</td>
                    <td>{day.views}</td>
                    <td>{formatTime(day.watchTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">No daily data available</div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="section">
        <h2>Recent Watch Sessions</h2>
        {statistics.recentSessions.length > 0 ? (
          <div className="sessions-table">
            <table>
              <thead>
                <tr>
                  <th>Video</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {statistics.recentSessions.map(session => (
                  <tr key={session.id}>
                    <td className="video-title">{session.videoTitle}</td>
                    <td>{formatDate(session.startTime)}</td>
                    <td>{formatTime(session.totalWatchTime)}</td>
                    <td>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${session.progress}%` }}
                        />
                        <span className="progress-text">
                          {Math.round(session.progress)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status ${session.completed ? 'completed' : 'incomplete'}`}
                      >
                        {session.completed ? 'Completed' : 'Incomplete'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">No recent sessions</div>
        )}
      </div>
    </div>
  );
};

export default SimpleUsage;
