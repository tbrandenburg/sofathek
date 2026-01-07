import React from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

export function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{ textAlign: 'center' }}>
      <h1
        style={{
          fontSize: '3rem',
          marginBottom: '1rem',
          color: 'var(--color-primary)',
        }}
      >
        🎬 Sofathek Media Center
      </h1>

      <p
        style={{
          fontSize: '1.25rem',
          color: 'var(--color-text-secondary)',
          marginBottom: '2rem',
          maxWidth: '600px',
          margin: '0 auto 2rem',
        }}
      >
        Your personal Netflix-like media center with YouTube download
        capabilities. Stream, organize, and enjoy your video collection
        anywhere.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          marginTop: '3rem',
        }}
      >
        {/* Features */}
        <div
          style={{
            padding: '2rem',
            border: '1px solid var(--color-surface-hover)',
            borderRadius: 'var(--border-radius-lg)',
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>
            🎥 Video Library
          </h3>
          <ul style={{ textAlign: 'left', lineHeight: '1.6' }}>
            <li>Netflix-like browsing</li>
            <li>Category organization</li>
            <li>Search & filtering</li>
            <li>Thumbnail previews</li>
            <li>Auto-metadata</li>
          </ul>
        </div>

        <div
          style={{
            padding: '2rem',
            border: '1px solid var(--color-surface-hover)',
            borderRadius: 'var(--border-radius-lg)',
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h3 style={{ color: 'var(--color-accent)', marginBottom: '1rem' }}>
            📥 YouTube Downloads
          </h3>
          <ul style={{ textAlign: 'left', lineHeight: '1.6' }}>
            <li>High-quality downloads</li>
            <li>Queue management</li>
            <li>Progress tracking</li>
            <li>Auto-categorization</li>
            <li>Multiple formats</li>
          </ul>
        </div>

        <div
          style={{
            padding: '2rem',
            border: '1px solid var(--color-surface-hover)',
            borderRadius: 'var(--border-radius-lg)',
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h3 style={{ color: 'var(--color-warning)', marginBottom: '1rem' }}>
            🎮 Streaming Player
          </h3>
          <ul style={{ textAlign: 'left', lineHeight: '1.6' }}>
            <li>HTML5 video player</li>
            <li>Range request streaming</li>
            <li>Playback controls</li>
            <li>Fullscreen mode</li>
            <li>Mobile responsive</li>
          </ul>
        </div>
      </div>

      {/* Navigation Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginTop: '3rem',
        }}
      >
        <Link
          to="/library"
          style={{
            display: 'block',
            padding: '2rem',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 'var(--border-radius-lg)',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            transition: 'all var(--transition-fast)',
          }}
        >
          📚 Browse Library
        </Link>

        <Link
          to="/downloads"
          style={{
            display: 'block',
            padding: '2rem',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-background)',
            textDecoration: 'none',
            borderRadius: 'var(--border-radius-lg)',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            transition: 'all var(--transition-fast)',
          }}
        >
          📥 Download Videos
        </Link>

        <Link
          to="/upload"
          style={{
            display: 'block',
            padding: '2rem',
            backgroundColor: 'var(--color-warning)',
            color: 'var(--color-background)',
            textDecoration: 'none',
            borderRadius: 'var(--border-radius-lg)',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            transition: 'all var(--transition-fast)',
          }}
        >
          📤 Upload Videos
        </Link>
      </div>

      {/* Quick Demo */}
      <div
        style={{
          marginTop: '3rem',
          padding: '2rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--color-surface-hover)',
        }}
      >
        <h3 style={{ color: 'var(--color-text)' }}>✨ Phase 2 Complete ✨</h3>
        <p
          style={{
            marginBottom: '1.5rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          Backend media processing pipeline is ready! YouTube downloads, video
          streaming, and library management are all functional.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-success)',
              color: 'var(--color-background)',
              borderRadius: 'var(--border-radius-base)',
              fontSize: '0.9rem',
            }}
          >
            ✅ 19/21 Tests Passing (90.5%)
          </span>
          <span
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              borderRadius: 'var(--border-radius-base)',
              fontSize: '0.9rem',
            }}
          >
            🎬 Phase 3 In Progress
          </span>
        </div>
      </div>
    </div>
  );
}
