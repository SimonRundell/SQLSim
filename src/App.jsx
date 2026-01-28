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
        <span className="in-row">
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
    </div>
  )
}

export default App
