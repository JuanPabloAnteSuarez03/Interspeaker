import { Link } from 'react-router-dom'
import './Home.css'

function Home() {
  return (
    <div className="home-wrapper">

      {/* ── HERO ── */}
      <section className="hero">
        <h1 className="hero-title">
          Domina tus entrevistas técnicas con el poder
          de la <span className="hero-accent">voz</span>
        </h1>
        <p className="hero-subtitle">
          Practica con IA, recibe feedback en tiempo real y supera tus nervios.
        </p>
        <Link to="/interview" className="hero-cta">
          Empezar ahora →
        </Link>
      </section>

      {/* ── WAVEFORM VISUAL ── */}
      <section className="waveform-section">
        <div className="waveform-container">
          <div className="waveform">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="waveform-bar"
                style={{
                  animationDelay: `${(i * 0.05) % 1.2}s`,
                  height: `${30 + Math.sin(i * 0.4) * 60 + Math.sin(i * 0.15) * 30}px`,
                }}
              />
            ))}
          </div>
          <div className="waveform-badge">
            <div className="waveform-badge-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C10.3 2 9 3.3 9 5v6c0 1.7 1.3 3 3 3s3-1.3 3-3V5c0-1.7-1.3-3-3-3z" fill="#06b6d4" />
                <path d="M19 11c0 3.9-3.1 7-7 7s-7-3.1-7-7H3c0 4.9 3.7 8.9 8.5 9.4V22h1V20.4c4.8-.5 8.5-4.5 8.5-9.4h-2z" fill="#06b6d4" />
              </svg>
            </div>
            <div>
              <div className="waveform-badge-label">Análisis de Tono</div>
              <div className="waveform-badge-value">Confiado y Claro</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section">
        <h2 className="features-title">Características Principales</h2>
        <p className="features-subtitle">
          Tecnología de vanguardia para potenciar tus habilidades comunicativas.
        </p>

        <div className="features-grid">
          {/* Feature 1 */}
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#1e3a8a" strokeWidth="1.5"/>
                <path d="M12 8v4l3 3" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="feature-name">IA Dinámica (Gemini 2.5)</h3>
            <p className="feature-desc">
              Respuestas adaptativas y contextuales que simulan a un entrevistador humano real.
              La IA ajusta la dificultad basándose en tus respuestas.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="7" r="4" stroke="#1e3a8a" strokeWidth="1.5"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="feature-name">Interacción por voz</h3>
            <p className="feature-desc">
              Tecnología STT/TTS de última generación para una conversación fluida y natural sin latencia perceptible.
            </p>
            <div className="feature-waveform">
              {[3, 6, 9, 7, 4, 8, 5, 7, 3, 6].map((h, i) => (
                <div key={i} className="feature-bar" style={{ height: `${h * 3}px` }} />
              ))}
            </div>
          </div>

          {/* Feature 3 */}
          <div className="feature-card feature-card--wide">
            <div className="feature-card-left">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="#1e3a8a" strokeWidth="1.5"/>
                  <path d="M8 12h8M8 8h8M8 16h5" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="feature-name">Reportes detallados</h3>
              <p className="feature-desc">
                Obtén feedback procesable inmediatamente después de cada sesión.
                Analizamos tu claridad, uso de muletillas y la estructura de tus respuestas (método STAR).
              </p>
              <div className="feature-pills">
                <span className="pill">● Claridad: 92%</span>
                <span className="pill">● Estructura: 85%</span>
              </div>
            </div>
            <div className="feature-card-right">
              <div className="metric-row">
                <span className="metric-label">Confianza Vocal</span>
                <span className="metric-tag good">Excelente</span>
              </div>
              <div className="metric-bar-track">
                <div className="metric-bar-fill" style={{ width: '88%' }} />
              </div>
              <div className="metric-row" style={{ marginTop: '12px' }}>
                <span className="metric-label">Uso de Muletillas</span>
                <span className="metric-tag warn">A mejorar</span>
              </div>
              <div className="metric-bar-track">
                <div className="metric-bar-fill warn" style={{ width: '42%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Home