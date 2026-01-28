/**
 * QueryEditor Component
 * Text area for entering SQL queries with Run and Reset buttons
 */

import React from 'react';
import './QueryEditor.css';

export default function QueryEditor({ 
  query, 
  onQueryChange, 
  onRun, 
  onReset,
  disabled 
}) {
  return (
    <div className="query-editor">
      <div className="editor-header">
        <h2>SQL Query Editor</h2>
        <div className="button-group">
          <button 
            onClick={onRun} 
            disabled={disabled}
            className="btn btn-primary"
          >
            ▶ Run Query
          </button>
          <button 
            onClick={onReset}
            className="btn btn-secondary"
          >
            ↺ Reset
          </button>
        </div>
      </div>
      <textarea
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        spellCheck={false}
        placeholder="Enter your SQL query here..."
      />
    </div>
  );
}
