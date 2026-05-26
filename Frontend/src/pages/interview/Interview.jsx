import { useState, useRef, useEffect, useCallback } from 'react'
import './Interview.css'

const LEVELS = ['Sin experiencia', '1 - 2 años', '3 - 5 años', '6+ años']

const QUESTIONS = [
  'Cuéntame sobre tu experiencia con React y cómo manejas el estado en aplicaciones grandes.',
  '¿Cómo optimizarías el rendimiento de un componente que se re-renderiza con frecuencia?',
  'Explica la diferencia entre useMemo y useCallback y cuándo usarías cada uno.',
  '¿Qué estrategias usas para manejar errores en aplicaciones frontend?',
  'Describe tu experiencia con arquitecturas de micro-frontends.',
]

/* ─── Mic permission states ─────────────────────────────────────── */
const MIC_STATE = {
  IDLE:       'idle',
  REQUESTING: 'requesting',
  GRANTED:    'granted',
  DENIED:     'denied',
  ERROR:      'error',
}

export default function Interview() {
  const [step, setStep] = useState('setup')

  const [name, setName]     = useState('')
  const [area, setArea]     = useState('frontend')
  const [level, setLevel]   = useState('Mid-Level')
  const [voiceHint, setVoiceHint] = useState(false)

  const [questionIndex, setQuestionIndex] = useState(0)
  const [phase, setPhase]       = useState('listening')
  const [recording, setRecording] = useState(false)
  const [paused, setPaused]     = useState(false)
  const [micState, setMicState] = useState(MIC_STATE.IDLE)
  const [audioChunks, setAudioChunks] = useState([])
  const [recordings, setRecordings]   = useState([])
  const [volume, setVolume]     = useState(0)
  const [duration, setDuration] = useState(0)

  const mediaRecorderRef = useRef(null)
  const streamRef        = useRef(null)
  const analyserRef      = useRef(null)
  const animFrameRef     = useRef(null)
  const timerRef         = useRef(null)
  const chunksRef        = useRef([])

  /* ── cleanup on unmount ── */
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

  /* ── Start recording ── */
  const startRecording = async () => {
    let stream = streamRef.current
    if (!stream) {
      stream = await requestMicPermission()
      if (!stream) return
    }

    chunksRef.current = []
    setAudioChunks([])
    setDuration(0)

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    })

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
      const url  = URL.createObjectURL(blob)
      setRecordings(prev => [...prev, { blob, url, questionIndex }])
      console.log('Audio blob ready:', blob.size, 'bytes')
    }

    recorder.start(100)
    mediaRecorderRef.current = recorder

    startVolumeAnalysis(stream)

    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)

    setRecording(true)
    setPhase('speaking')
  }

  /* ── Stop recording ── */
  const stopRecording = () => {
    cancelAnimationFrame(animFrameRef.current)
    clearInterval(timerRef.current)
    setVolume(0)

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    setRecording(false)
    setPhase('processing')

    setTimeout(() => {
      if (questionIndex < QUESTIONS.length - 1) {
        setQuestionIndex(i => i + 1)
        setPhase('listening')
        setDuration(0)
      } else {
        window.location.href = '/results'
      }
    }, 1800)
  }

  /* ── Mic button handler ── */
  const handleMic = async () => {
    if (micState === MIC_STATE.DENIED) return
    if (phase === 'processing') return

    if (phase === 'listening' || phase === 'ready') {
      await startRecording()
    } else if (phase === 'speaking') {
      stopRecording()
    }
  }

  /* ── Start interview ── */
  const handleStart = async () => {
    sessionStorage.setItem('interview-config', JSON.stringify({ name, area, level }))
    // Pre-request permission when entering interview
    await requestMicPermission()
    setStep('interview')
  }

  if (step === 'setup') {
    return (
      <SetupStep
        {...{ name, setName, area, setArea, level, setLevel, voiceHint, setVoiceHint, handleStart, micState }}
      />
    )
  }

  return (
    <InterviewStep
      {...{
        questionIndex,
        phase,
        recording,
        paused,
        setPaused,
        handleMic,
        micState,
        volume,
        duration,
        recordings,
      }}
    />
  )
}

function SetupStep({ name, setName, area, setArea, level, setLevel, voiceHint, setVoiceHint, handleStart, micState }) {
  return (
    <div className="sp-wrapper">
      <div className="sp-card">
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
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

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
              {LEVELS.map(l => (
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

          {/* Mic permission status in setup */}
          {micState === MIC_STATE.DENIED && (
            <div className="sp-mic-warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="1.8"/>
                <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Micrófono bloqueado. Permite el acceso en la configuración del navegador.
            </div>
          )}

          <button className="sp-start-btn" onClick={handleStart}>
            {micState === MIC_STATE.REQUESTING ? (
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

function InterviewStep({ questionIndex, phase, recording, paused, setPaused, handleMic, micState, volume, duration, recordings }) {
  const total   = QUESTIONS.length
  const current = questionIndex + 1

  const phaseLabel = {
    listening:  'Escucha la pregunta',
    speaking:   'Grabando tu respuesta...',
    processing: 'Procesando respuesta...',
  }

  const phaseHint = {
    listening:  'Cuando estés listo, pulsa el micrófono para comenzar a responder.',
    speaking:   'Habla con claridad. Pulsa de nuevo para detener la grabación.',
    processing: 'Analizando tu respuesta con IA...',
  }

  const formatDuration = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  /* Dynamic bars height based on volume */
  const getBarHeight = (i, baseH) => {
    if (!recording) return baseH
    const wave = Math.sin(i * 0.7 + Date.now() * 0.003) * 0.5 + 0.5
    return baseH + (volume / 100) * wave * 40
  }

  return (
    <div className="iv-wrapper">
      {/* BG blobs */}
      <div className="iv-bg">
        <div className={`iv-blob iv-blob-1 ${recording ? 'iv-blob--active' : ''}`} />
        <div className={`iv-blob iv-blob-2 ${recording ? 'iv-blob--active' : ''}`} />
      </div>

      <div className="iv-card">

        {/* Progress */}
        <div className="iv-progress-row">
          <span className="iv-badge">PREGUNTA {current} DE {total}</span>
        </div>
        <div className="iv-progress-track">
          <div className="iv-progress-fill" style={{ width: `${(current / total) * 100}%` }} />
        </div>

        {/* Mic permission banner */}
        {micState === MIC_STATE.DENIED && (
          <div className="iv-mic-denied">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M4.93 4.93l14.14 14.14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Micrófono bloqueado — actívalo en la configuración del navegador
          </div>
        )}
        {micState === MIC_STATE.REQUESTING && (
          <div className="iv-mic-requesting">
            <span className="iv-spinner-sm" />
            Solicitando acceso al micrófono...
          </div>
        )}

        {/* Phase title */}
        <h2 className="iv-phase-title">{phaseLabel[phase]}</h2>
        <p className="iv-phase-hint">{phaseHint[phase]}</p>

        {/* Waveform visual */}
        <div className="iv-waveform-area">
          <div className={`iv-waveform-glow ${recording ? 'iv-waveform-glow--active' : ''}`} />
          <LiveWaveform recording={recording} volume={volume} />
        </div>

        {/* Recording timer */}
        {recording && (
          <div className="iv-recording-status">
            <span className="iv-rec-dot" />
            <span className="iv-rec-timer">{formatDuration(duration)}</span>
            <span className="iv-rec-label">REC</span>
          </div>
        )}

        {/* Volume meter */}
        {recording && (
          <div className="iv-volume-meter">
            <div
              className="iv-volume-fill"
              style={{ width: `${volume}%` }}
            />
          </div>
        )}

        {/* Question text */}
        {phase === 'listening' && (
          <div className="iv-question-box">
            <p className="iv-question-text">"{QUESTIONS[questionIndex]}"</p>
          </div>
        )}

        {/* Mic button */}
        <button
          className={`iv-mic-btn
            ${recording ? 'iv-mic-btn--recording' : ''}
            ${phase === 'processing' ? 'iv-mic-btn--processing' : ''}
            ${micState === MIC_STATE.DENIED ? 'iv-mic-btn--disabled' : ''}
          `}
          onClick={handleMic}
          disabled={phase === 'processing' || micState === MIC_STATE.DENIED || micState === MIC_STATE.REQUESTING}
          aria-label={recording ? 'Detener grabación' : 'Iniciar grabación'}
        >
          {phase === 'processing' ? (
            <span className="iv-spinner" />
          ) : micState === MIC_STATE.REQUESTING ? (
            <span className="iv-spinner" />
          ) : recording ? (
            /* Stop icon */
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="#fff" />
            </svg>
          ) : (
            /* Mic icon */
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C10.3 2 9 3.3 9 5v6c0 1.7 1.3 3 3 3s3-1.3 3-3V5c0-1.7-1.3-3-3-3z" fill="#fff" />
              <path d="M19 11c0 3.9-3.1 7-7 7s-7-3.1-7-7H3c0 4.9 3.7 8.9 8.5 9.4V22h1V20.4c4.8-.5 8.5-4.5 8.5-9.4h-2z" fill="#fff" />
            </svg>
          )}
        </button>

        <p className="iv-mic-label">
          {micState === MIC_STATE.DENIED
            ? 'MICRÓFONO BLOQUEADO'
            : micState === MIC_STATE.REQUESTING
            ? 'ESPERANDO PERMISO...'
            : phase === 'listening'
            ? 'PULSAR PARA HABLAR'
            : phase === 'speaking'
            ? 'PULSAR PARA DETENER'
            : 'PROCESANDO...'}
        </p>

        {/* Recordings count */}
        {recordings.length > 0 && (
          <div className="iv-recordings-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {recordings.length} respuesta{recordings.length > 1 ? 's' : ''} grabada{recordings.length > 1 ? 's' : ''}
          </div>
        )}

        {/* Pause */}
        <button className="iv-pause-btn" onClick={() => setPaused(p => !p)}>
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

function LiveWaveform({ recording, volume }) {
  const [bars, setBars] = useState(() =>
    Array.from({ length: 28 }, (_, i) => ({
      base: 14 + Math.sin(i * 0.5) * 18 + Math.sin(i * 0.2) * 10,
      phase: Math.random() * Math.PI * 2,
      speed: 0.03 + Math.random() * 0.04,
    }))
  )
  const frameRef = useRef(null)
  const tRef     = useRef(0)

  useEffect(() => {
    if (!recording) {
      cancelAnimationFrame(frameRef.current)
      return
    }
    const animate = () => {
      tRef.current += 1
      setBars(prev => prev.map(b => ({ ...b }))) // trigger re-render for animation
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [recording])

  return (
    <div className={`iv-waveform ${recording ? 'iv-waveform--active' : ''}`}>
      {bars.map((b, i) => {
        let h = b.base
        if (recording) {
          const wave = Math.sin(tRef.current * b.speed + b.phase + i * 0.3) * 0.5 + 0.5
          h = b.base + (volume / 100) * wave * 48
        }
        return (
          <div
            key={i}
            className="iv-bar"
            style={{
              height: `${Math.max(4, Math.min(90, h))}px`,
              animationDelay: recording ? `${i * 0.06}s` : '0s',
            }}
          />
        )
      })}
    </div>
  )
}