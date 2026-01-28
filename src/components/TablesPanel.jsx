/**
 * TablesPanel Component
 * Displays the source tables with their data
 */

import React from 'react';
import './TablesPanel.css';

export default function TablesPanel({ tables, schema }) {
  return (
    <div className="tables-panel">
      <h2>Source Tables</h2>
      {Object.keys(tables).map(tableName => (
        <div key={tableName} className="table-display">
          <h3>{tableName}</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {schema[tableName].columns.map(col => (
                    <th key={col.name}>{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tables[tableName].map((row, idx) => (
                  <tr key={idx}>
                    {schema[tableName].columns.map(col => (
                      <td key={col.name}>{row[col.name]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
