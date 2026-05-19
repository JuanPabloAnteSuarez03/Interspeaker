import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Setup.css'

const AREAS = [
  { value: 'frontend',  label: 'Frontend' },
  { value: 'backend',   label: 'Backend' },
  { value: 'fullstack', label: 'Full Stack' },
  { value: 'devops',    label: 'DevOps' },
  { value: 'data',      label: 'Data / ML' },
  { value: 'mobile',    label: 'Mobile' },
]

const LEVELS = ['Junior', 'Mid-Level', 'Senior', 'Lead / Staff']

export default function Setup() {
  const [name, setName]   = useState('Ana García')
  const [area, setArea]   = useState('frontend')
  const [level, setLevel] = useState('Mid-Level')
  const [voiceHint, setVoiceHint] = useState(false)
  const navigate = useNavigate()

  const handleStart = () => {
    sessionStorage.setItem('interview-config', JSON.stringify({ name, area, level }))
    navigate('/interview')
  }

  return (
    <div className="sp-wrapper">
      <div className="sp-card">

        {/* ── LEFT: voz ── */}
        <div className="sp-left">
          <h2 className="sp-left-title">Prepara tu sesión</h2>
          <p className="sp-left-sub">La IA de Interspeaker adaptará la entrevista a tu perfil.</p>

          <div className="sp-mic-area">
            <div className="sp-mic-rings">
              <div className="sp-ring sp-ring-1" />
              <div className="sp-ring sp-ring-2" />
            </div>
            <button
              className={`sp-mic-btn ${voiceHint ? 'sp-mic-btn--active' : ''}`}
              onClick={() => setVoiceHint((v) => !v)}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C10.3 2 9 3.3 9 5v6c0 1.7 1.3 3 3 3s3-1.3 3-3V5c0-1.7-1.3-3-3-3z" fill="#fff" />
                <path d="M19 11c0 3.9-3.1 7-7 7s-7-3.1-7-7H3c0 4.9 3.7 8.9 8.5 9.4V22h1V20.4c4.8-.5 8.5-4.5 8.5-9.4h-2z" fill="#fff" />
              </svg>
            </button>
            <div className="sp-mini-wave">
              {[3, 5, 8, 6, 4, 7, 5, 3].map((h, i) => (
                <div key={i} className="sp-mini-bar" style={{ height: `${h * 3}px` }} />
              ))}
            </div>
          </div>

          <p className="sp-voice-label">Haz clic para hablar</p>
          <p className="sp-voice-hint">
            "Hola, soy Alex. Soy desarrollador<br />Frontend con nivel Senior..."
          </p>
        </div>

        {/* ── DIVIDER ── */}
        <div className="sp-divider-wrap">
          <div className="sp-divider-line" />
          <span className="sp-divider-text">O COMPLETA MANUALMENTE</span>
          <div className="sp-divider-line" />
        </div>

        {/* ── RIGHT: form ── */}
        <div className="sp-right">
          <div className="sp-field">
            <label className="sp-label">Nombre completo</label>
            <div className="sp-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="sp-input-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="12" cy="7" r="4" stroke="#94a3b8" strokeWidth="1.8"/>
              </svg>
              <input
                className="sp-input"
                type="text"
                placeholder="Ej. Ana García"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="sp-field">
            <label className="sp-label">Área de especialidad</label>
            <div className="sp-select-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="sp-input-icon">
                <polyline points="16 18 22 12 16 6" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
                <polyline points="8 6 2 12 8 18" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <select
                className="sp-select"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                <option value="" disabled>Selecciona un área</option>
                {AREAS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="sp-select-chevron">
                <path d="M6 9l6 6 6-6" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <div className="sp-field">
            <label className="sp-label">Nivel de experiencia</label>
            <div className="sp-level-group">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  className={`sp-level-btn ${level === l ? 'sp-level-btn--active' : ''}`}
                  onClick={() => setLevel(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button className="sp-start-btn" onClick={handleStart}>
            Comenzar Entrevista →
          </button>
        </div>

      </div>
    </div>
  )
}