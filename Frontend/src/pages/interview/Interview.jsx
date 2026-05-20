import { useState } from 'react'
import './Interview.css'

const QUESTIONS = [
  'Cuéntame sobre tu experiencia con React y cómo manejas el estado en aplicaciones grandes.',
  '¿Cómo optimizarías el rendimiento de un componente que se re-renderiza con frecuencia?',
  'Explica la diferencia entre useMemo y useCallback y cuándo usarías cada uno.',
  '¿Qué estrategias usas para manejar errores en aplicaciones frontend?',
  'Describe tu experiencia con arquitecturas de micro-frontends.',
]

export default function Interview() {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [phase, setPhase] = useState('listening') // listening | speaking | processing
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)

  const total = QUESTIONS.length
  const current = questionIndex + 1

  const handleMic = () => {
    if (phase === 'listening') {
      setPhase('speaking')
      setRecording(true)
    } else if (phase === 'speaking') {
      setRecording(false)
      setPhase('processing')
      setTimeout(() => {
        if (questionIndex < total - 1) {
          setQuestionIndex((i) => i + 1)
          setPhase('listening')
        } else {
          window.location.href = '/results'
        }
      }, 1800)
    }
  }

  const phaseLabel = {
    listening: 'Escuchando pregunta...',
    speaking: 'Grabando tu respuesta...',
    processing: 'Procesando respuesta...',
  }

  const phaseHint = {
    listening: 'El entrevistador IA está procesando tu currículum para formular la siguiente pregunta técnica.',
    speaking: 'Habla con claridad. Pulsa de nuevo para detener la grabación.',
    processing: 'Analizando tu respuesta con IA...',
  }

  return (
    <div className="iv-wrapper">
      {/* Fondo animado */}
      <div className="iv-bg">
        <div className="iv-blob iv-blob-1" />
        <div className="iv-blob iv-blob-2" />
      </div>

      <div className="iv-card">
        {/* Progress */}
        <div className="iv-progress-row">
          <span className="iv-badge">PREGUNTA {current} DE {total}</span>
        </div>
        <div className="iv-progress-track">
          <div className="iv-progress-fill" style={{ width: `${(current / total) * 100}%` }} />
        </div>

        {/* Phase title */}
        <h2 className="iv-phase-title">{phaseLabel[phase]}</h2>
        <p className="iv-phase-hint">{phaseHint[phase]}</p>

        {/* Waveform visual */}
        <div className="iv-waveform-area">
          <div className={`iv-waveform-glow ${recording ? 'iv-waveform-glow--active' : ''}`} />
          <div className={`iv-waveform ${recording ? 'iv-waveform--active' : ''}`}>
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="iv-bar"
                style={{
                  height: `${18 + Math.sin(i * 0.7) * 22 + Math.sin(i * 0.3) * 12}px`,
                  animationDelay: `${i * 0.07}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Question text (visible when listening) */}
        {phase === 'listening' && (
          <div className="iv-question-box">
            <p className="iv-question-text">"{QUESTIONS[questionIndex]}"</p>
          </div>
        )}

        {/* Mic button */}
        <button
          className={`iv-mic-btn ${recording ? 'iv-mic-btn--recording' : ''} ${phase === 'processing' ? 'iv-mic-btn--processing' : ''}`}
          onClick={handleMic}
          disabled={phase === 'processing'}
        >
          {phase === 'processing' ? (
            <span className="iv-spinner" />
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C10.3 2 9 3.3 9 5v6c0 1.7 1.3 3 3 3s3-1.3 3-3V5c0-1.7-1.3-3-3-3z" fill="#fff" />
              <path d="M19 11c0 3.9-3.1 7-7 7s-7-3.1-7-7H3c0 4.9 3.7 8.9 8.5 9.4V22h1V20.4c4.8-.5 8.5-4.5 8.5-9.4h-2z" fill="#fff" />
            </svg>
          )}
        </button>
        <p className="iv-mic-label">
          {phase === 'listening' ? 'PULSAR PARA HABLAR' : phase === 'speaking' ? 'PULSAR PARA DETENER' : 'PROCESANDO...'}
        </p>

        {/* Pause */}
        <button className="iv-pause-btn" onClick={() => setPaused((p) => !p)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
            <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
          </svg>
          {paused ? 'Reanudar Sesión' : 'Pausar Sesión'}
        </button>
      </div>
    </div>
  )
}