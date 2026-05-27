import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Interview.css";
import * as api from "../../services/api";
import { auth } from "../../../firebase";

const LEVELS = ["Sin experiencia", "1 - 2 años", "3 - 5 años", "6+ años"];
const EXPERIENCE_MAP = {
  "Sin experiencia": "junior",
  "1 - 2 años": "junior",
  "3 - 5 años": "mid",
  "6+ años": "senior",
};

/* ─── Mic permission states ─────────────────────────────────────── */
const MIC_STATE = {
  IDLE: "idle",
  REQUESTING: "requesting",
  GRANTED: "granted",
  DENIED: "denied",
  ERROR: "error",
};

export default function Interview() {
  const navigate = useNavigate();
  const [step, setStep] = useState("setup");

  // Setup
  const [area, setArea] = useState("frontend");
  const [level, setLevel] = useState("1 - 2 años");
  const [micState, setMicState] = useState(MIC_STATE.IDLE);

  // Interview state
  const [sessionId, setSessionId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioUrls, setAudioUrls] = useState({}); // Mapeo: index -> audioUrl
  const [phase, setPhase] = useState("listening");
  const [recording, setRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [savedSession, setSavedSession] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  /* ─── Audio URL Resolution ─────────────────────────────────────── */
  const constructAudioUrl = useCallback((uid, sid, index) => {
    const BASE = "http://localhost:9000";

    if (!uid || !sid) return null;

    return `${BASE}/interspeaker/AudioUsuarios/${uid}/${sid}/question_${index}.mp3`;
  }, []);

  const pollAudioUrl = useCallback(
    async (uid, sid, index, maxAttempts = 20) => {
      const audioUrl = constructAudioUrl(uid, sid, index);
      let attempts = 0;

      return new Promise((resolve) => {
        const interval = setInterval(async () => {
          attempts++;
          try {
            const response = await fetch(audioUrl, { method: "HEAD" });
            if (response.ok) {
              clearInterval(interval);
              console.log(
                `✅ Audio pregunta ${index} encontrado después de ${attempts} intentos`,
              );
              resolve(audioUrl);
              return;
            }
          } catch {
            // URL no disponible aún
          }

          if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.warn(
              `⚠️ Audio pregunta ${index} no encontrado después de ${maxAttempts} intentos`,
            );
            resolve(null); // Devolver null si no encuentra el audio
          }
        }, 500); // Verificar cada 500ms
      });
    },
    [constructAudioUrl],
  );

  const resolveAudioUrl = useCallback(
    async (uid, sid, index, apiUrl) => {
      // Si viene URL de la API, usar esa
      if (apiUrl && apiUrl.startsWith("http")) {
        return apiUrl;
      }

      // Si no viene, construir y buscar en el bucket
      console.log(`🔍 Buscando audio pregunta ${index} en bucket...`);
      return await pollAudioUrl(uid, sid, index);
    },
    [pollAudioUrl],
  );
  const saveSessionToStorage = useCallback(() => {
    if (sessionId && questions.length > 0) {
      const sessionData = {
        sessionId,
        userId,
        currentIndex,
        questions,
        audioUrls,
        area,
        level,
        timestamp: Date.now(),
      };
      localStorage.setItem("interviewSession", JSON.stringify(sessionData));
      console.log("💾 Sesión guardada en localStorage");
    }
  }, [sessionId, userId, currentIndex, questions, audioUrls, area, level]);

  const loadSessionFromStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem("interviewSession");
      if (saved) {
        const sessionData = JSON.parse(saved);
        setSavedSession(sessionData);
        console.log("📂 Sesión guardada detectada:", sessionData);
        return sessionData;
      }
    } catch (err) {
      console.error("Error cargando sesión:", err);
    }
    return null;
  }, []);

  const clearSessionFromStorage = useCallback(() => {
    localStorage.removeItem("interviewSession");
    setSavedSession(null);
    console.log("🗑️ Sesión guardada eliminada");
  }, []);

  const resumeSession = useCallback((sessionData) => {
    setSessionId(sessionData.sessionId);
    setUserId(sessionData.userId);
    setQuestions(sessionData.questions);
    setCurrentIndex(sessionData.currentIndex);
    setAudioUrls(sessionData.audioUrls);
    setArea(sessionData.area);
    setLevel(sessionData.level);
    setPhase("listening");
    setStep("interview");
    setSavedSession(null);
    console.log(
      "▶️ Sesión reanudada desde pregunta",
      sessionData.currentIndex + 1,
    );
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      cancelAnimationFrame(animFrameRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  // Detectar sesión guardada al montar
  useEffect(() => {
    const saved = loadSessionFromStorage();
    if (saved && step === "setup") {
      // Hay una sesión guardada, mostrar opción de continuar
      setSavedSession(saved);
    }
  }, [loadSessionFromStorage]);

  // Guardar sesión automáticamente cuando cambia el estado
  useEffect(() => {
    saveSessionToStorage();
  }, [sessionId, currentIndex, audioUrls, saveSessionToStorage]);

  // Reproducir audio de la pregunta cuando cambia
  useEffect(() => {
    if (audioRef.current && phase === "listening") {
      const audioUrl = audioUrls[currentIndex];

      // 🛡️ PARCHE 3: validación fuerte de URL
      if (
        audioUrl &&
        (audioUrl.startsWith("http") || audioUrl.startsWith("data:"))
      ) {
        console.log(
          `🔊 Cargando audio para pregunta ${currentIndex + 1}:`,
          audioUrl,
        );

        audioRef.current.src = audioUrl;

        audioRef.current.play().catch((err) => {
          console.warn("No se pudo reproducir audio:", err);
        });
      } else {
        console.warn(
          `⚠️ Audio inválido o inexistente para pregunta ${currentIndex + 1}:`,
          audioUrl,
        );
      }
    }
  }, [currentIndex, audioUrls, phase]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  /* ── Volume analyser ── */
  const startVolumeAnalysis = useCallback((stream) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((s, v) => s + v, 0) / data.length;
      setVolume(Math.min(100, avg * 2));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  /* ── Request mic permission ── */
  const requestMicPermission = async () => {
    setMicState(MIC_STATE.REQUESTING);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;
      setMicState(MIC_STATE.GRANTED);
      return stream;
    } catch (err) {
      console.error("Mic error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setMicState(MIC_STATE.DENIED);
      } else {
        setMicState(MIC_STATE.ERROR);
      }
      return null;
    }
  };

  const startRecording = async () => {
    let stream = streamRef.current;
    if (!stream) {
      stream = await requestMicPermission();
      if (!stream) return;
    }

    chunksRef.current = [];
    setDuration(0);

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      await processAnswer(blob);
    };

    recorder.start(100);
    mediaRecorderRef.current = recorder;

    startVolumeAnalysis(stream);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

    setRecording(true);
    setPhase("speaking");
  };

  const stopRecording = () => {
    cancelAnimationFrame(animFrameRef.current);
    clearInterval(timerRef.current);
    setVolume(0);

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);
    setPhase("processing");
  };

  const processAnswer = async (audioBlob) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODAS las preguntas usan submitAnswer
      let result = null;
      let retries = 0;
      const maxRetries = 2;

      // Reintentar si la transcripción falla
      while (retries <= maxRetries) {
        try {
          result = await api.submitAnswer(sessionId, currentIndex, audioBlob);
          console.log("📝 Respuesta procesada:", result);
          break;
        } catch (err) {
          retries++;
          if (retries <= maxRetries) {
            console.warn(`⚠️ Intento ${retries} falló, reintentando...`);
            await new Promise((r) => setTimeout(r, 500));
          } else {
            throw err;
          }
        }
      }

      if (result.has_more) {
        // Hay más preguntas, avanza a la siguiente
        const nextIndex = result.next_index;

        // Resolver URL del audio (API o bucket)
        const audioUrl = await resolveAudioUrl(
          userId,
          sessionId,
          nextIndex,
          result.next_audio_url,
        );

        if (audioUrl) {
          setAudioUrls((prev) => ({
            ...prev,
            [nextIndex]: audioUrl,
          }));
          console.log(
            `🔊 Audio para pregunta ${nextIndex} guardado:`,
            audioUrl,
          );
        } else {
          console.warn(
            `⚠️ No se pudo obtener audio para pregunta ${nextIndex}`,
          );
        }

        setCurrentIndex(nextIndex);
        setPhase("listening");
        setDuration(0);
      } else {
        // Fue la última pregunta, ahora evalúa
        console.log("🏁 Última pregunta respondida, iniciando evaluación...");
        clearSessionFromStorage(); // Limpiar sesión al finalizar

        // Pequeño delay para asegurar que Firestore esté actualizado
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          const evaluation = await api.evaluateInterview(sessionId);
          navigate(`/results/${sessionId}`, {
            state: {
              sessionId,
              evaluation,
              area,
              level,
            },
          });
        } catch (evalError) {
          console.error("Error en evaluación:", evalError);
          setError(evalError.message);
          setPhase("listening");
        }
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
      setPhase("listening");
      setDuration(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMic = async () => {
    if (micState === MIC_STATE.DENIED || isLoading) return;

    if (phase === "listening") {
      await startRecording();
    } else if (phase === "speaking") {
      stopRecording();
    }
  };

  const handleStartInterview = async () => {
    setIsLoading(true);
    setError(null);
    clearSessionFromStorage(); // Limpiar sesión anterior

    try {
      await requestMicPermission();

      // Obtener userId de Firebase
      const uid = auth.currentUser?.uid;
      if (!uid) {
        throw new Error("No autenticado");
      }
      setUserId(uid);

      const response = await api.startInterview(area, EXPERIENCE_MAP[level]);

      console.log("🎬 Entrevista iniciada:", response);

      setSessionId(response.session_id);
      setQuestions(response.questions_metadata);
      setCurrentIndex(0);

      // Convertir audio_base64 de la primera pregunta (index 0) a data-url
      if (response.audio_base64) {
        const audioUrl = `data:audio/mp3;base64,${response.audio_base64}`;
        setAudioUrls((prev) => ({ ...prev, 0: audioUrl }));
        console.log("🔊 Audio de pregunta 0 (primera) cargado desde base64");
      }

      setPhase("listening");
      setStep("interview");
    } catch (err) {
      console.error("Error starting interview:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "setup") {
    return (
      <>
        <SetupStep
          {...{
            area,
            setArea,
            level,
            setLevel,
            handleStartInterview,
            micState,
            error,
            isLoading,
          }}
        />

        {savedSession && (
          <div className="iv-recovery-overlay">
            <div className="iv-recovery-modal">
              <h2 className="iv-recovery-title">Entrevista no finalizada</h2>
              <p className="iv-recovery-text">
                Tienes una entrevista guardada en la pregunta{" "}
                {savedSession.currentIndex + 1} de{" "}
                {savedSession.questions.length}
              </p>
              <div className="iv-recovery-actions">
                <button
                  className="iv-recovery-continue-btn"
                  onClick={() => resumeSession(savedSession)}
                >
                  ▶️ Continuar entrevista
                </button>
                <button
                  className="iv-recovery-new-btn"
                  onClick={() => clearSessionFromStorage()}
                >
                  ➕ Nueva entrevista
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <InterviewStep
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
        setError,
        audioRef,
        isPaused,
        setIsPaused,
      }}
    />
  );
}

function SetupStep({
  area,
  setArea,
  level,
  setLevel,
  handleStartInterview,
  micState,
  error,
  isLoading,
}) {
  return (
    <div className="sp-wrapper">
      <div className="sp-card">
        <div className="sp-right">
          <h1 className="sp-title">Interspeaker</h1>
          <p className="sp-subtitle">Entrevista técnica simulada con IA</p>

          <div className="sp-field">
            <label className="sp-label">Puesto deseado</label>
            <div className="sp-input-wrap">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="sp-input-icon"
              >
                <polyline
                  points="16 18 22 12 16 6"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <polyline
                  points="8 6 2 12 8 18"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <input
                className="sp-input"
                type="text"
                placeholder="Ej. Desarrollador Frontend"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>
          </div>

          <div className="sp-field">
            <label className="sp-label">Nivel de experiencia</label>
            <div className="sp-level-group">
              {["Sin experiencia", "1 - 2 años", "3 - 5 años", "6+ años"].map(
                (l) => (
                  <button
                    key={l}
                    className={`sp-level-btn ${level === l ? "sp-level-btn--active" : ""}`}
                    onClick={() => setLevel(l)}
                  >
                    {l}
                  </button>
                ),
              )}
            </div>
          </div>

          {error && (
            <div className="sp-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M12 8v4M12 16h.01"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              {error}
            </div>
          )}

          {micState === MIC_STATE.DENIED && (
            <div className="sp-mic-warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#dc2626"
                  strokeWidth="1.8"
                />
                <path
                  d="M12 8v4M12 16h.01"
                  stroke="#dc2626"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
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
              "Comenzar Entrevista"
            )}
          </button>
        </div>
      </div>
    </div>
  );
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
  setError,
  audioRef,
  isPaused,
  setIsPaused,
}) {
  const current = currentIndex + 1;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const phaseLabel = {
    listening: isLastQuestion ? "Última pregunta" : "Escucha la pregunta",
    speaking: "Grabando tu respuesta...",
    processing: isLastQuestion
      ? "Evaluando tu entrevista..."
      : "Procesando respuesta...",
  };

  const phaseHint = {
    listening: isLastQuestion
      ? "Esta es la última pregunta. Habla con claridad para ser evaluado."
      : "Cuando estés listo, pulsa el micrófono para comenzar a responder.",
    speaking: "Habla con claridad. Pulsa de nuevo para detener la grabación.",
    processing: isLastQuestion
      ? "Analizando tu respuesta final y generando evaluación..."
      : "Analizando tu respuesta...",
  };

  const formatDuration = (s) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="iv-wrapper">
      <div className="iv-bg">
        <div
          className={`iv-blob iv-blob-1 ${recording ? "iv-blob--active" : ""}`}
        />
        <div
          className={`iv-blob iv-blob-2 ${recording ? "iv-blob--active" : ""}`}
        />
      </div>

      <div className="iv-card">
        <div className="iv-progress-row">
          <span className="iv-badge">
            PREGUNTA {current} DE {totalQuestions}
          </span>
        </div>
        <div className="iv-progress-track">
          <div
            className="iv-progress-fill"
            style={{ width: `${(current / totalQuestions) * 100}%` }}
          />
        </div>

        {error && (
          <div className="iv-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 8v4M12 16h.01"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            {error}
            <button onClick={() => setError(null)} className="iv-error-close">
              ×
            </button>
          </div>
        )}

        {micState === MIC_STATE.DENIED && (
          <div className="iv-mic-denied">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M4.93 4.93l14.14 14.14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Micrófono bloqueado
          </div>
        )}

        <h2 className="iv-phase-title">{phaseLabel[phase]}</h2>
        <p className="iv-phase-hint">{phaseHint[phase]}</p>

        <div className="iv-waveform-area">
          <div
            className={`iv-waveform-glow ${recording ? "iv-waveform-glow--active" : ""}`}
          />
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

        {phase === "listening" && question && (
          <div className="iv-question-box">
            <p className="iv-question-text">"{question}"</p>
            <audio
              ref={audioRef}
              controls
              className="iv-audio-player"
              onEnded={() => console.log("Audio terminó")}
            />
          </div>
        )}

        <button
          className={`iv-mic-btn
            ${recording ? "iv-mic-btn--recording" : ""}
            ${phase === "processing" ? "iv-mic-btn--processing" : ""}
            ${micState === MIC_STATE.DENIED ? "iv-mic-btn--disabled" : ""}
            ${isLastQuestion ? "iv-mic-btn--final" : ""}
          `}
          onClick={handleMic}
          disabled={
            phase === "processing" || micState === MIC_STATE.DENIED || isLoading
          }
          aria-label={
            recording
              ? "Detener grabación"
              : isLastQuestion
                ? "Terminar entrevista"
                : "Iniciar grabación"
          }
        >
          {phase === "processing" ? (
            <span className="iv-spinner" />
          ) : recording ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="#fff" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C10.3 2 9 3.3 9 5v6c0 1.7 1.3 3 3 3s3-1.3 3-3V5c0-1.7-1.3-3-3-3z"
                fill="#fff"
              />
              <path
                d="M19 11c0 3.9-3.1 7-7 7s-7-3.1-7-7H3c0 4.9 3.7 8.9 8.5 9.4V22h1V20.4c4.8-.5 8.5-4.5 8.5-9.4h-2z"
                fill="#fff"
              />
            </svg>
          )}
        </button>

        <p className="iv-mic-label">
          {micState === MIC_STATE.DENIED
            ? "MICRÓFONO BLOQUEADO"
            : phase === "listening"
              ? isLastQuestion
                ? "PULSAR PARA TERMINAR"
                : "PULSAR PARA HABLAR"
              : phase === "speaking"
                ? "PULSAR PARA DETENER"
                : "PROCESANDO..."}
        </p>

        {isPaused && (
          <div className="iv-paused-overlay">
            <div className="iv-paused-content">
              <h3 className="iv-paused-title">Entrevista pausada</h3>
              <p className="iv-paused-text">
                Pregunta {current} de {totalQuestions}
              </p>
              <button
                className="iv-continue-btn"
                onClick={() => setIsPaused(false)}
              >
                Continuar entrevista
              </button>
            </div>
          </div>
        )}

        {!isPaused && phase === "listening" && (
          <button
            className="iv-pause-btn"
            onClick={() => setIsPaused(true)}
            title="Pausar entrevista"
          >
            ⏸ Pausar
          </button>
        )}
      </div>
    </div>
  );
}
