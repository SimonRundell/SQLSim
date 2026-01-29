/**
 * ResultsPanel Component
 * Displays query results or errors
 */

import React from 'react';
import './ResultsPanel.css';

export default function ResultsPanel({ result, error, query }) {
  const handlePrintReport = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Please allow pop-ups to print the report');
      return;
    }
    
    // Build HTML content
    let content = `
<!DOCTYPE html>
<html>
<head>
  <title>SQL Query Report</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 20px;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    .query-section {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 5px;
      padding: 15px;
      margin: 20px 0;
    }
    .query-section h2 {
      margin-top: 0;
      color: #495057;
    }
    .query-code {
      background: white;
      border: 1px solid #ced4da;
      border-radius: 3px;
      padding: 10px;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .results-section {
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #dee2e6;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #3498db;
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      font-size: 0.9em;
      color: #6c757d;
    }
    .error-display {
      background: #fff5f5;
      border: 1px solid #fc8181;
      border-radius: 5px;
      padding: 15px;
      color: #c53030;
    }
    @media print {
      body { margin: 15px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>SQL Query Report - SQLSim</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  
  <div class="query-section">
    <h2>Query</h2>
    <div class="query-code">${escapeHtml(query || '')}</div>
  </div>
  
  <div class="results-section">
    <h2>Results</h2>
`;

    if (error) {
      content += `
    <div class="error-display">
      <strong>${error.code}</strong><br>
      ${escapeHtml(error.message)}
      ${error.position !== null ? `<br><em>Position: ${error.position}</em>` : ''}
    </div>
`;
    } else if (result) {
      content += `<p><strong>Rows returned:</strong> ${result.meta.rowCount}</p>`;
      
      if (result.rows.length > 0) {
        content += `
    <table>
      <thead>
        <tr>
          ${result.columns.map(col => `<th>${escapeHtml(String(col))}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${result.rows.map(row => `
        <tr>
          ${row.map(cell => `<td>${escapeHtml(String(cell !== null && cell !== undefined ? cell : ''))}</td>`).join('')}
        </tr>
        `).join('')}
      </tbody>
    </table>
`;
      } else {
        content += '<p><em>No rows returned.</em></p>';
      }
    } else {
      content += '<p><em>No query executed.</em></p>';
    }

    content += `
  </div>
  
  <div class="footer">
    <p><strong>SQLSim</strong> - SQL Learning Tool | Exeter College</p>
    <p>This report can be saved as PDF using your browser's print function (Print → Save as PDF)</p>
  </div>
</body>
</html>
`;

    printWindow.document.write(content);
    printWindow.document.close();
    
    // Wait for content to load then trigger print dialog
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  if (error) {
    return (
      <div className="results-panel">
        <div className="results-header">
          <h2>Error</h2>
          <button className="print-button" onClick={handlePrintReport} title="Print/Export Report">
            🖨️ Print Report
          </button>
        </div>
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
        <div className="results-header-actions">
          <div className="row-count">
            {result.meta.rowCount} row{result.meta.rowCount !== 1 ? 's' : ''}
          </div>
          <button className="print-button" onClick={handlePrintReport} title="Print/Export Report">
            🖨️ Print Report
          </button>
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
