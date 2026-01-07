/**
 * AdminPage - System Administration
 * Manage system status and configuration
 */

import React from 'react';
import { Link } from 'react-router-dom';
import './AdminPage.css';

export function AdminPage() {
  return (
    <div className="admin-page">
      <div className="container">
        <h1>System Administration</h1>
        <p>Monitor system status and manage configuration</p>

        <div className="admin-menu">
          <div className="admin-card">
            <h3>📊 Usage Statistics</h3>
            <p>View video watching statistics and user analytics</p>
            <Link to="/admin/usage" className="admin-link">
              View Usage Stats
            </Link>
          </div>

          <div className="admin-card">
            <h3>⚙️ System Configuration</h3>
            <p>Manage system settings and preferences</p>
            <div className="coming-soon">Coming Soon</div>
          </div>

          <div className="admin-card">
            <h3>📁 File Management</h3>
            <p>Manage video library and storage</p>
            <div className="coming-soon">Coming Soon</div>
          </div>

          <div className="admin-card">
            <h3>🔧 Maintenance</h3>
            <p>System maintenance and cleanup tools</p>
            <div className="coming-soon">Coming Soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}
