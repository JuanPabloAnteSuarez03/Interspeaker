import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './History.css'
import * as api from '../../services/api'

export default function History() {
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    loadInterviews()
  }, [])

  const loadInterviews = async () => {
    try {
      const data = await api.getUserInterviews()
      setInterviews(data.interviews || [])
    } catch (err) {
      console.error('Error loading interviews:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="hs-wrapper">
        <div className="hs-container">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="iv-spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Cargando historial...</p>
          </div>
        </div>
      </div>
    )
  }

  const stats = {
    total: interviews.length,
    avgScore: interviews.length > 0 
      ? Math.round(interviews.reduce((sum, i) => sum + (i.score || 0), 0) / interviews.length) 
      : 0,
    bestScore: interviews.length > 0 
      ? Math.max(...interviews.map(i => i.score || 0)) 
      : 0,
  }

  const getScoreBadge = (score) => {
    if (score >= 90) return { label: 'Sobresaliente', type: 'excellent' }
    if (score >= 80) return { label: 'Excelente', type: 'excellent' }
    if (score >= 70) return { label: 'Buen intento', type: 'good' }
    if (score >= 60) return { label: 'A mejorar', type: 'improve' }
    return { label: 'Necesitas mejorar', type: 'poor' }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp)
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="hs-wrapper">
      <div className="hs-container">
        {/* Header */}
        <div className="hs-header">
          <div>
            <h1 className="hs-title">Historial de entrevistas</h1>
            <p className="hs-subtitle">Revisa tu progreso y evolución en cada sesión.</p>
          </div>
          <Link to="/interview" className="hs-new-btn">
            + Nueva entrevista
          </Link>
        </div>

        {/* Stats row */}
        <div className="hs-stats-row">
          {[
            { label: 'Sesiones totales', value: stats.total, icon: '🎤' },
            { label: 'Puntuación media', value: `${stats.avgScore}/100`, icon: '📊' },
            { label: 'Mejor puntuación', value: `${stats.bestScore}/100`, icon: '🏆' },
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
          {error ? (
            <div style={{ color: '#dc2626', textAlign: 'center', padding: '2rem' }}>
              {error}
            </div>
          ) : interviews.length === 0 ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
              <p>Aún no tienes sesiones registradas.</p>
              <Link to="/interview" className="hs-new-btn" style={{ marginTop: '1rem', display: 'inline-block' }}>
                Comenzar primera entrevista
              </Link>
            </div>
          ) : (
            interviews.map((interview) => {
              const isOpen = expanded === interview.session_id
              const badge = getScoreBadge(interview.score || 0)
              return (
                <div key={interview.session_id} className={`hs-session-card ${isOpen ? 'hs-session-card--open' : ''}`}>
                  <button className="hs-session-header" onClick={() => setExpanded(isOpen ? null : interview.session_id)}>
                    <div className="hs-session-left">
                      <ScoreRing score={interview.score || 0} type={badge.type} />
                      <div>
                        <div className="hs-session-title">{interview.area} · {interview.experience}</div>
                        <div className="hs-session-meta">{formatDate(interview.created_at)} · {interview.answered_questions}/{interview.total_questions} preguntas</div>
                      </div>
                    </div>
                    <div className="hs-session-right">
                      <span className={`hs-badge hs-badge--${badge.type}`}>{badge.label}</span>
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
                            Estado
                          </p>
                          <p className="hs-detail-text">{interview.status === 'completed' ? 'Completada' : 'En progreso'}</p>
                        </div>
                        <div className="hs-detail-block">
                          <p className="hs-detail-label">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="#d97706" strokeWidth="1.8"/>
                              <path d="M12 8v4M12 16h.01" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                            Puntuación
                          </p>
                          <p className="hs-detail-text">{interview.score || 'N/A'}/100</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
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