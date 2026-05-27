import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './Interview.css'
import * as api from '../../services/api'

const LEVELS = ['Sin experiencia', '1 - 2 años', '3 - 5 años', '6+ años']
const EXPERIENCE_MAP = {
  'Sin experiencia': 'junior',
  '1 - 2 años': 'junior',
  '3 - 5 años': 'mid',
  '6+ años': 'senior'
}

/* ─── Mic permission states ─────────────────────────────────────── */
const MIC_STATE = {
  IDLE:       'idle',
  REQUESTING: 'requesting',
  GRANTED:    'granted',
  DENIED:     'denied',
  ERROR:      'error',
}

export default function Interview() {
  const navigate = useNavigate()
  const [step, setStep] = useState('setup')
  
  // Setup
  const [area, setArea] = useState('frontend')
  const [level, setLevel] = useState('1 - 2 años')
  const [micState, setMicState] = useState(MIC_STATE.IDLE)
  
  // Interview state
  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState('listening')
  const [recording, setRecording] = useState(false)
  const [volume, setVolume] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const timerRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    return () => {
      stopStream()
      cancelAnimationFrame(animFrameRef.current)
      clearInterval(timerRef.current)
    }
  }, [])

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  /* ── Volume analyser ── */
  const startVolumeAnalysis = useCallback((stream) => {
    const ctx     = new (window.AudioContext || window.webkitAudioContext)()
    const source  = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((s, v) => s + v, 0) / data.length
      setVolume(Math.min(100, avg * 2))
      animFrameRef.current = requestAnimationFrame(tick)
    }
    tick()
  }, [])

  /* ── Request mic permission ── */
  const requestMicPermission = async () => {
    setMicState(MIC_STATE.REQUESTING)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      })
      streamRef.current = stream
      setMicState(MIC_STATE.GRANTED)
      return stream
    } catch (err) {
      console.error('Mic error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicState(MIC_STATE.DENIED)
      } else {
        setMicState(MIC_STATE.ERROR)
      }
      return null
    }
  }

  const startRecording = async () => {
    let stream = streamRef.current
    if (!stream) {
      stream = await requestMicPermission()
      if (!stream) return
    }

    chunksRef.current = []
    setDuration(0)

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    })

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
      await processAnswer(blob)
    }

    recorder.start(100)
    mediaRecorderRef.current = recorder

    startVolumeAnalysis(stream)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)

    setRecording(true)
    setPhase('speaking')
  }

  const stopRecording = () => {
    cancelAnimationFrame(animFrameRef.current)
    clearInterval(timerRef.current)
    setVolume(0)

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    setRecording(false)
    setPhase('processing')
  }

  const processAnswer = async (audioBlob) => {
    setIsLoading(true)
    setError(null)

    try {
      const isLastQuestion = currentIndex === questions.length - 1

      if (isLastQuestion) {
        // Finalizar y evaluar
        const result = await api.evaluateInterview(sessionId, currentIndex, audioBlob)
        navigate('/results', { 
          state: { 
            sessionId, 
            evaluation: result,
            area,
            level
          } 
        })
      } else {
        // Enviar respuesta y cargar siguiente pregunta
        const result = await api.submitAnswer(sessionId, currentIndex, audioBlob)
        
        if (result.has_more) {
          setCurrentIndex(result.next_index)
          setPhase('listening')
          setDuration(0)
        } else {
          throw new Error('No hay más preguntas')
        }
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
      setPhase('listening')
      setDuration(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMic = async () => {
    if (micState === MIC_STATE.DENIED || isLoading) return

    if (phase === 'listening') {
      await startRecording()
    } else if (phase === 'speaking') {
      stopRecording()
    }
  }

  const handleStartInterview = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await requestMicPermission()
      
      const response = await api.startInterview(
        area,
        EXPERIENCE_MAP[level]
      )

      setSessionId(response.session_id)
      setQuestions(response.questions_metadata)
      setCurrentIndex(0)
      setPhase('listening')
      setStep('interview')
    } catch (err) {
      console.error('Error starting interview:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'setup') {
    return <SetupStep 
      {...{ area, setArea, level, setLevel, handleStartInterview, micState, error, isLoading }} 
    />
  }

  return <InterviewStep 
    {...{
      currentIndex,
      totalQuestions: questions.length,
      question: questions[currentIndex]?.question_text,
      phase,
      recording,
      handleMic,
      micState,
      volume,
      duration,
      error,
      isLoading,
      setError
    }}
  />
}

function SetupStep({ area, setArea, level, setLevel, handleStartInterview, micState, error, isLoading }) {
  return (
    <div className="sp-wrapper">
      <div className="sp-card">
        <div className="sp-right">
          <h1 className="sp-title">Interspeaker</h1>
          <p className="sp-subtitle">Entrevista técnica simulada con IA</p>

          <div className="sp-field">
            <label className="sp-label">Puesto deseado</label>
            <div className="sp-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="sp-input-icon">
                <polyline points="16 18 22 12 16 6" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
                <polyline points="8 6 2 12 8 18" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <input
                className="sp-input"
                type="text"
                placeholder="Ej. Desarrollador Frontend"
                value={area}
                onChange={e => setArea(e.target.value)}
              />
            </div>
          </div>

          <div className="sp-field">
            <label className="sp-label">Nivel de experiencia</label>
            <div className="sp-level-group">
              {['Sin experiencia', '1 - 2 años', '3 - 5 años', '6+ años'].map(l => (
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

          {error && (
            <div className="sp-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {micState === MIC_STATE.DENIED && (
            <div className="sp-mic-warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="1.8"/>
                <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Micrófono bloqueado. Actívalo en la configuración del navegador.
            </div>
          )}

          <button 
            className="sp-start-btn" 
            onClick={handleStartInterview}
            disabled={isLoading || micState === MIC_STATE.REQUESTING}
          >
            {isLoading ? (
              <span className="sp-btn-inner">
                <span className="sp-spinner" /> Iniciando...
              </span>
            ) : micState === MIC_STATE.REQUESTING ? (
              <span className="sp-btn-inner">
                <span className="sp-spinner" /> Solicitando micrófono...
              </span>
            ) : (
              'Comenzar Entrevista'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function InterviewStep({ 
  currentIndex, 
  totalQuestions, 
  question, 
  phase, 
  recording, 
  handleMic, 
  micState, 
  volume, 
  duration, 
  error,
  isLoading,
  setError 
}) {
  const current = currentIndex + 1
  const isLastQuestion = currentIndex === totalQuestions - 1

  const phaseLabel = {
    listening: isLastQuestion ? 'Última pregunta' : 'Escucha la pregunta',
    speaking: 'Grabando tu respuesta...',
    processing: isLastQuestion ? 'Evaluando tu entrevista...' : 'Procesando respuesta...',
  }

  const phaseHint = {
    listening: isLastQuestion 
      ? 'Esta es la última pregunta. Habla con claridad para ser evaluado.'
      : 'Cuando estés listo, pulsa el micrófono para comenzar a responder.',
    speaking: 'Habla con claridad. Pulsa de nuevo para detener la grabación.',
    processing: isLastQuestion
      ? 'Analizando tu respuesta final y generando evaluación...'
      : 'Analizando tu respuesta...',
  }

  const formatDuration = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="iv-wrapper">
      <div className="iv-bg">
        <div className={`iv-blob iv-blob-1 ${recording ? 'iv-blob--active' : ''}`} />
        <div className={`iv-blob iv-blob-2 ${recording ? 'iv-blob--active' : ''}`} />
      </div>

      <div className="iv-card">
        <div className="iv-progress-row">
          <span className="iv-badge">PREGUNTA {current} DE {totalQuestions}</span>
        </div>
        <div className="iv-progress-track">
          <div className="iv-progress-fill" style={{ width: `${(current / totalQuestions) * 100}%` }} />
        </div>

        {error && (
          <div className="iv-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            {error}
            <button onClick={() => setError(null)} className="iv-error-close">×</button>
          </div>
        )}

        {micState === MIC_STATE.DENIED && (
          <div className="iv-mic-denied">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M4.93 4.93l14.14 14.14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Micrófono bloqueado
          </div>
        )}

        <h2 className="iv-phase-title">{phaseLabel[phase]}</h2>
        <p className="iv-phase-hint">{phaseHint[phase]}</p>

        <div className="iv-waveform-area">
          <div className={`iv-waveform-glow ${recording ? 'iv-waveform-glow--active' : ''}`} />
        </div>

        {recording && (
          <div className="iv-recording-status">
            <span className="iv-rec-dot" />
            <span className="iv-rec-timer">{formatDuration(duration)}</span>
            <span className="iv-rec-label">REC</span>
          </div>
        )}

        {recording && (
          <div className="iv-volume-meter">
            <div className="iv-volume-fill" style={{ width: `${volume}%` }} />
          </div>
        )}

        {phase === 'listening' && question && (
          <div className="iv-question-box">
            <p className="iv-question-text">"{question}"</p>
          </div>
        )}

        <button
          className={`iv-mic-btn
            ${recording ? 'iv-mic-btn--recording' : ''}
            ${phase === 'processing' ? 'iv-mic-btn--processing' : ''}
            ${micState === MIC_STATE.DENIED ? 'iv-mic-btn--disabled' : ''}
            ${isLastQuestion ? 'iv-mic-btn--final' : ''}
          `}
          onClick={handleMic}
          disabled={phase === 'processing' || micState === MIC_STATE.DENIED || isLoading}
          aria-label={recording ? 'Detener grabación' : isLastQuestion ? 'Terminar entrevista' : 'Iniciar grabación'}
        >
          {phase === 'processing' ? (
            <span className="iv-spinner" />
          ) : recording ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="#fff" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C10.3 2 9 3.3 9 5v6c0 1.7 1.3 3 3 3s3-1.3 3-3V5c0-1.7-1.3-3-3-3z" fill="#fff" />
              <path d="M19 11c0 3.9-3.1 7-7 7s-7-3.1-7-7H3c0 4.9 3.7 8.9 8.5 9.4V22h1V20.4c4.8-.5 8.5-4.5 8.5-9.4h-2z" fill="#fff" />
            </svg>
          )}
        </button>

        <p className="iv-mic-label">
          {micState === MIC_STATE.DENIED
            ? 'MICRÓFONO BLOQUEADO'
            : phase === 'listening'
            ? isLastQuestion ? 'PULSAR PARA TERMINAR' : 'PULSAR PARA HABLAR'
            : phase === 'speaking'
            ? 'PULSAR PARA DETENER'
            : 'PROCESANDO...'}
        </p>
      </div>
    </div>
  )
}
