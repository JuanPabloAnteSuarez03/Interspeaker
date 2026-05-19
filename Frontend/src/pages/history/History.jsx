import { useState } from 'react'
import { Link } from 'react-router-dom'
import './History.css'

const SESSIONS = [
  {
    id: 1,
    date: '15 May 2025',
    area: 'Frontend',
    level: 'Mid-Level',
    score: 85,
    duration: '18 min',
    questions: 5,
    badge: 'Excelente',
    badgeType: 'excellent',
    strengths: ['Hooks de React', 'Método STAR'],
    improvement: 'Optimización con useMemo',
  },
  {
    id: 2,
    date: '10 May 2025',
    area: 'Frontend',
    level: 'Mid-Level',
    score: 72,
    duration: '22 min',
    questions: 5,
    badge: 'Buen intento',
    badgeType: 'good',
    strengths: ['CSS avanzado', 'Accesibilidad'],
    improvement: 'Arquitectura de componentes',
  },
  {
    id: 3,
    date: '3 May 2025',
    area: 'Backend',
    level: 'Junior',
    score: 61,
    duration: '15 min',
    questions: 4,
    badge: 'A mejorar',
    badgeType: 'improve',
    strengths: ['REST APIs'],
    improvement: 'Base de datos y joins SQL',
  },
  {
    id: 4,
    date: '24 Abr 2025',
    area: 'Full Stack',
    level: 'Senior',
    score: 91,
    duration: '25 min',
    questions: 6,
    badge: 'Sobresaliente',
    badgeType: 'excellent',
    strengths: ['Arquitectura', 'Liderazgo técnico'],
    improvement: 'Métricas de rendimiento',
  },
]

const STATS = {
  total: 4,
  avgScore: 77,
  bestScore: 91,
  totalTime: '80 min',
}

export default function History() {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="hs-wrapper">
      <div className="hs-container">

        {/* Header */}
        <div className="hs-header">
          <div>
            <h1 className="hs-title">Historial de entrevistas</h1>
            <p className="hs-subtitle">Revisa tu progreso y evolución en cada sesión.</p>
          </div>
          <Link to="/setup" className="hs-new-btn">
            + Nueva entrevista
          </Link>
        </div>

        {/* Stats row */}
        <div className="hs-stats-row">
          {[
            { label: 'Sesiones totales', value: STATS.total,     icon: '🎤' },
            { label: 'Puntuación media', value: `${STATS.avgScore}/100`, icon: '📊' },
            { label: 'Mejor puntuación', value: `${STATS.bestScore}/100`, icon: '🏆' },
            { label: 'Tiempo practicado', value: STATS.totalTime, icon: '⏱️' },
          ].map((s) => (
            <div key={s.label} className="hs-stat-card">
              <span className="hs-stat-icon">{s.icon}</span>
              <span className="hs-stat-value">{s.value}</span>
              <span className="hs-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Session list */}
        <div className="hs-list">
          {SESSIONS.map((s) => {
            const isOpen = expanded === s.id
            return (
              <div key={s.id} className={`hs-session-card ${isOpen ? 'hs-session-card--open' : ''}`}>
                <button className="hs-session-header" onClick={() => setExpanded(isOpen ? null : s.id)}>
                  <div className="hs-session-left">
                    <ScoreRing score={s.score} type={s.badgeType} />
                    <div>
                      <div className="hs-session-title">{s.area} · {s.level}</div>
                      <div className="hs-session-meta">{s.date} · {s.duration} · {s.questions} preguntas</div>
                    </div>
                  </div>
                  <div className="hs-session-right">
                    <span className={`hs-badge hs-badge--${s.badgeType}`}>{s.badge}</span>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      className={`hs-chevron ${isOpen ? 'hs-chevron--open' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="hs-session-body">
                    <div className="hs-detail-grid">
                      <div className="hs-detail-block">
                        <p className="hs-detail-label">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#059669" strokeWidth="1.8"/>
                            <path d="M8 12l3 3 5-5" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Fortalezas
                        </p>
                        <ul className="hs-detail-list">
                          {s.strengths.map((t) => <li key={t}>{t}</li>)}
                        </ul>
                      </div>
                      <div className="hs-detail-block">
                        <p className="hs-detail-label">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#d97706" strokeWidth="1.8"/>
                            <path d="M12 8v4M12 16h.01" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                          A mejorar
                        </p>
                        <ul className="hs-detail-list">
                          <li>{s.improvement}</li>
                        </ul>
                      </div>
                    </div>
                    <Link to="/results" className="hs-view-report">Ver reporte completo →</Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

function ScoreRing({ score, type }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = type === 'excellent' ? '#1e3a8a' : type === 'good' ? '#0891b2' : '#d97706'

  return (
    <div className="hs-ring-wrap">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span className="hs-ring-score">{score}</span>
    </div>
  )
}