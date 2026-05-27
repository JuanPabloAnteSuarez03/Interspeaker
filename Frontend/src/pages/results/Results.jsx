import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Results.css'
import * as api from '../../services/api'

export default function Results() {
  const location = useLocation()
  const { sessionId, evaluation, area, level } = location.state || {}
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionId) {
      setError('No hay datos de sesión')
      setLoading(false)
      return
    }

    const loadInterview = async () => {
      try {
        const data = await api.getUserInterview(sessionId)
        setInterview(data)
      } catch (err) {
        console.error('Error loading interview:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadInterview()
  }, [sessionId])

  if (loading) {
    return (
      <div className="rs-wrapper">
        <div className="rs-container">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="iv-spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Cargando resultados...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rs-wrapper">
        <div className="rs-container">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
            <p>Error: {error}</p>
            <Link to="/home" className="rs-btn-back">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const score = evaluation?.evaluation_score || 0
  const evaluationText = evaluation?.evaluation_text || ''
  const audioUrl = evaluation?.evaluation_audio_url

  const circumference = 2 * Math.PI * 52
  const offset = circumference - (score / 100) * circumference

  const getScoreLabel = (s) => {
    if (s >= 90) return '¡Excelente desempeño!'
    if (s >= 80) return '¡Muy buen desempeño!'
    if (s >= 70) return 'Buen desempeño'
    if (s >= 60) return 'Desempeño aceptable'
    return 'Necesitas mejorar'
  }

  return (
    <div className="rs-wrapper">
      <div className="rs-container">
        {/* Header */}
        <div className="rs-header">
          <div>
            <h1 className="rs-title">Reporte de Evaluación</h1>
            <p className="rs-subtitle">Análisis detallado de tu última sesión de práctica técnica.</p>
          </div>
          <Link to="/interview" className="rs-repeat-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Repetir Entrevista
          </Link>
        </div>

        {/* Score + Metrics */}
        <div className="rs-top-grid">
          <div className="rs-score-card">
            <h3 className="rs-card-title">Puntuación Global</h3>
            <div className="rs-score-ring-wrap">
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="65" cy="65" r="52"
                  fill="none"
                  stroke="url(#scoreGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform="rotate(-90 65 65)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1e3a8a" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="rs-score-inner">
                <span className="rs-score-num">{Math.round(score)}</span>
                <span className="rs-score-denom">/ 100</span>
              </div>
            </div>
            <p className="rs-score-label">{getScoreLabel(score)}</p>
          </div>

          <div className="rs-metrics-card">
            <h3 className="rs-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="#1e3a8a" strokeWidth="1.8"/>
                <path d="M8 12h8M8 8h8M8 16h5" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Información de la sesión
            </h3>
            <div className="rs-metrics-list">
              <div className="rs-metric-item">
                <div className="rs-metric-row">
                  <span className="rs-metric-name">Puesto</span>
                  <span className="rs-metric-pct">{area}</span>
                </div>
              </div>
              <div className="rs-metric-item">
                <div className="rs-metric-row">
                  <span className="rs-metric-name">Nivel de experiencia</span>
                  <span className="rs-metric-pct">{level}</span>
                </div>
              </div>
              <div className="rs-metric-item">
                <div className="rs-metric-row">
                  <span className="rs-metric-name">Preguntas respondidas</span>
                  <span className="rs-metric-pct">{interview?.answered_questions}/{interview?.total_questions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback from LLM */}
        <div className="rs-feedback-grid">
          <div className="rs-feedback-card rs-feedback-card--strength">
            <h3 className="rs-feedback-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#059669" strokeWidth="1.8"/>
                <path d="M8 12l3 3 5-5" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Retroalimentación de la IA
            </h3>
            <div className="rs-feedback-item">
              <p className="rs-feedback-item-desc">{evaluationText}</p>
              {audioUrl && (
                <div style={{ marginTop: '1rem' }}>
                  <audio controls style={{ width: '100%', marginTop: '0.5rem' }}>
                    <source src={audioUrl} type="audio/mpeg" />
                    Tu navegador no soporta audio.
                  </audio>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="rs-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/interview" className="rs-repeat-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Repetir Entrevista
          </Link>
          <Link to="/history" className="rs-repeat-btn" style={{ background: '#e2e8f0', color: '#1e3a8a' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Ver Historial
          </Link>
        </div>

      </div>
    </div>
  )
}