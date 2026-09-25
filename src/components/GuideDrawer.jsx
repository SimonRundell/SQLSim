/**
 * GuideDrawer
 * A step-by-step, clickable walkthrough of SQL as SQLSim supports it.
 * The lesson list lives in ../data/guideLessons.jsx; this component is just
 * the shell - navigation, the current lesson's content, and the "Try it
 * yourself" challenge button that hands a query back to App via onLoadQuery.
 */

import { useState } from 'react';
import './GuideDrawer.css';
import { guideLessons, guideSections } from '../data/guideLessons';

function GuideDrawer({ isOpen, onClose, onLoadQuery }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const lesson = guideLessons[currentIndex];

  const goTo = (index) => {
    if (index >= 0 && index < guideLessons.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <>
      {isOpen && <div className="drawer-overlay" onClick={onClose} />}

      <div className={`guide-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2>🎓 Student Guide</h2>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close guide">
            ×
          </button>
        </div>

        <div className="guide-body">
          <nav className="guide-nav" aria-label="Lesson list">
            {guideSections.map(section => (
              <div key={section} className="guide-nav-section">
                <h4>{section}</h4>
                <ul>
                  {guideLessons.map((l, i) => (l.section === section ? (
                    <li key={l.id}>
                      <button
                        className={`guide-nav-item${i === currentIndex ? ' active' : ''}`}
                        onClick={() => goTo(i)}
                      >
                        {l.title}
                      </button>
                    </li>
                  ) : null))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="guide-content">
            <div className="guide-progress">Lesson {currentIndex + 1} of {guideLessons.length} - {lesson.section}</div>
            <h3>{lesson.title}</h3>

            {lesson.diagram && <div className="guide-diagram-wrap">{lesson.diagram}</div>}

            <div className="guide-lesson-body">{lesson.body}</div>

            {lesson.challenge && (
              <div className="challenge-box">
                <h4>🎯 Try it yourself</h4>
                <p>{lesson.challenge.prompt}</p>
                <pre className="code-block">{lesson.challenge.query}</pre>
                <button
                  className="btn-challenge"
                  onClick={() => onLoadQuery(lesson.challenge.query)}
                >
                  Load into editor →
                </button>
              </div>
            )}

            <div className="guide-pager">
              <button
                className="btn-outline"
                disabled={currentIndex === 0}
                onClick={() => goTo(currentIndex - 1)}
              >
                ← Previous
              </button>
              <button
                className="btn-outline"
                disabled={currentIndex === guideLessons.length - 1}
                onClick={() => goTo(currentIndex + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default GuideDrawer;
