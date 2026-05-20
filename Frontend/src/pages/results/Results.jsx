import { Link } from 'react-router-dom'
import './Results.css'

const DATA = {
  score: 85,
  label: '¡Excelente desempeño!',
  metrics: [
    { name: 'Claridad y Estructura',       value: 90 },
    { name: 'Precisión Técnica',            value: 80 },
    { name: 'Profundidad del Conocimiento', value: 85 },
  ],
  strengths: [
    {
      title: 'Uso preciso de terminología',
      desc: "Demostraste un dominio sólido del vocabulario técnico de React, especialmente al discutir hooks y el ciclo de vida.",
    },
    {
      title: 'Estructuración de respuestas',
      desc: 'Utilizaste el método STAR de manera efectiva para explicar tus experiencias pasadas.',
    },
  ],
  improvements: [
    {
      title: 'Profundizar en optimización',
      desc: "Al mencionar 'useMemo', faltó explicar escenarios específicos donde su uso no es recomendado para evitar cuellos de botella.",
    },
    {
      title: 'Claridad en ejemplos abstractos',
      desc: 'La explicación sobre arquitecturas de micro-frontends fue un poco dispersa. Intenta estructurar mejor la introducción al concepto.',
    },
  ],
  recommendations: [
    'Optimización de Renderizado en React',
    'Patrones de Micro-Frontends',
    'Gestión de Estado Global (Redux vs Context)',
  ],
}

export default function Results() {
  const circumference = 2 * Math.PI * 52
  const offset = circumference - (DATA.score / 100) * circumference

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
                <span className="rs-score-num">{DATA.score}</span>
                <span className="rs-score-denom">/ 100</span>
              </div>
            </div>
            <p className="rs-score-label">{DATA.label}</p>
          </div>

          <div className="rs-metrics-card">
            <h3 className="rs-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="#1e3a8a" strokeWidth="1.8"/>
                <path d="M8 12h8M8 8h8M8 16h5" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Métricas Detalladas
            </h3>
            <div className="rs-metrics-list">
              {DATA.metrics.map((m) => (
                <div key={m.name} className="rs-metric-item">
                  <div className="rs-metric-row">
                    <span className="rs-metric-name">{m.name}</span>
                    <span className="rs-metric-pct">{m.value}%</span>
                  </div>
                  <div className="rs-bar-track">
                    <div className="rs-bar-fill" style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Strengths + Improvements */}
        <div className="rs-feedback-grid">
          <div className="rs-feedback-card rs-feedback-card--strength">
            <h3 className="rs-feedback-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#059669" strokeWidth="1.8"/>
                <path d="M8 12l3 3 5-5" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Fortalezas
            </h3>
            {DATA.strengths.map((s) => (
              <div key={s.title} className="rs-feedback-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="rs-feedback-icon">
                  <circle cx="12" cy="12" r="10" stroke="#059669" strokeWidth="1.5"/>
                  <path d="M8 12l3 3 5-5" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p className="rs-feedback-item-title">{s.title}</p>
                  <p className="rs-feedback-item-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rs-feedback-card rs-feedback-card--improve">
            <h3 className="rs-feedback-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M23 6l-9.5 9.5-5-5L1 18" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 6h6v6" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Áreas de mejora
            </h3>
            {DATA.improvements.map((item) => (
              <div key={item.title} className="rs-feedback-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="rs-feedback-icon">
                  <circle cx="12" cy="12" r="10" stroke="#d97706" strokeWidth="1.5"/>
                  <path d="M12 8v4M12 16h.01" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <div>
                  <p className="rs-feedback-item-title">{item.title}</p>
                  <p className="rs-feedback-item-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="rs-reco-section">
          <h3 className="rs-reco-title">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="#1e3a8a" strokeWidth="1.8"/>
            </svg>
            Recomendaciones de estudio
          </h3>
          <div className="rs-reco-pills">
            {DATA.recommendations.map((r) => (
              <span key={r} className="rs-reco-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {r}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}