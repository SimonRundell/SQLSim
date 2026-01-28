/**
 * ResultsPanel Component
 * Displays query results or errors
 */

import React from 'react';
import './ResultsPanel.css';

export default function ResultsPanel({ result, error }) {
  if (error) {
    return (
      <div className="results-panel">
        <h2>Error</h2>
        <div className="error-display">
          <div className="error-code">{error.code}</div>
          <div className="error-message">{error.message}</div>
          {error.position !== null && (
            <div className="error-position">Position: {error.position}</div>
          )}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="results-panel">
        <h2>Results</h2>
        <div className="no-results">
          Click "Run Query" to execute your SQL query.
        </div>
      </div>
    );
  }

  return (
    <div className="results-panel">
      <div className="results-header">
        <h2>Results</h2>
        <div className="row-count">
          {result.meta.rowCount} row{result.meta.rowCount !== 1 ? 's' : ''}
        </div>
      </div>
      
      {result.rows.length === 0 ? (
        <div className="no-results">No rows returned.</div>
      ) : (
        <div className="results-wrapper">
          <table className="results-table">
            <thead>
              <tr>
                {result.columns.map((col, idx) => (
                  <th key={idx}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
