import { useState } from 'react'
import './App.css'
import TablesPanel from './components/TablesPanel'
import QueryEditor from './components/QueryEditor'
import ResultsPanel from './components/ResultsPanel'
import { executeQuery } from './engine/executor'
import { schema } from './data/schema'
import { sampleData } from './data/sampleData'

const DEFAULT_QUERY = `SELECT students.forename, students.surname, tutor_groups.tutor_name
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
WHERE tutor_groups.room = 'B12'
ORDER BY students.surname ASC
LIMIT 20`;

function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRun = () => {
    try {
      setError(null);
      const queryResult = executeQuery({
        queryText: query,
        tables: sampleData,
        schema: schema,
      });
      setResult(queryResult);
    } catch (err) {
      setError({
        code: err.code || 'ERROR',
        message: err.message,
        position: err.position,
      });
      setResult(null);
    }
  };

  const handleReset = () => {
    setQuery(DEFAULT_QUERY);
    setResult(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <span className="in-row" onClick={() => setIsModalOpen(true)} style={{ cursor: 'pointer' }}>
            <h1>SQLSim</h1>
            <img className="sql-logo" src="images/sql.png" alt="SQLSim Logo" />
            <img className="exeter-logo" src="images/exeter logo.png" alt="Exeter College Logo" />
            </span>
        <p>Learn SQL with interactive queries on sample data</p>
      </header>
      
      <div className="app-layout">
        <aside className="sidebar">
          <TablesPanel tables={sampleData} schema={schema} />
        </aside>
        
        <main className="main-content">
          <div className="editor-section">
            <QueryEditor
              query={query}
              onQueryChange={setQuery}
              onRun={handleRun}
              onReset={handleReset}
            />
          </div>
          
          <div className="results-section">
            <ResultsPanel result={result} error={error} />
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
              ×
            </button>
            <div className="modal-header">
              <img className="modal-logo" src="images/exeter logo.png" alt="Exeter College Logo" />
              <h2>About SQLSim</h2>
            </div>
            <div className="modal-body">
              <h3>Author</h3>
              <p><strong>Simon Rundell</strong></p>
              <p>Programme Leader, Dept of ITDD<br/>Exeter College</p>
              
              <h3>About This Tool</h3>
              <p>SQLSim is an interactive teaching aid designed to help students learn SQL through hands-on practice with realistic data scenarios.</p>
              
              <p>This tool allows students to experiment with SELECT queries, including JOINs, WHERE clauses, aggregate functions, and GROUP BY statements in a safe, browser-based environment.</p>
              
              <h3>Purpose</h3>
              <p>Created to provide an accessible way for students to practice SQL without requiring database server setup, making it perfect for classroom demonstrations and self-paced learning.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
