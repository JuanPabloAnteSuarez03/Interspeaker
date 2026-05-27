import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./Results.css";
import * as api from "../../services/api";

export default function Results() {
  const { sessionId } = useParams();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const BASE = import.meta.env.VITE_STORAGE_BASE_URL;

  const normalizeAudioUrl = (url) => {
    if (!url) return null;

    // caso bug backend
    if (url.startsWith("None/")) {
      url = url.replace("None/", "");
    }

    // si ya es correcta
    if (url.startsWith("http")) return url;

    // fallback (tu servidor MinIO/local)
    return `${BASE}/${url}`;
  };

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const loadInterview = async () => {
      try {
        const data = await api.getUserInterview(sessionId);

        console.log("INTERVIEW DATA:", JSON.stringify(data, null, 2));

        setInterview(data);
      } catch (err) {
        console.error("Error loading interview:", err);

        // Evita romper la vista si aún no hay evaluación
        setInterview({
          answered_questions: 0,
          total_questions: 10,
          area: "-",
          experience: "-",
          evaluation_text: "",
          evaluation_audio_url: null,
        });
      } finally {
        setLoading(false);
      }
    };

    loadInterview();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="rs-wrapper">
        <div className="rs-container">
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div className="iv-spinner" style={{ margin: "0 auto" }} />
            <p style={{ marginTop: "1rem", color: "#94a3b8" }}>
              Cargando resultados...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="rs-wrapper">
        <div className="rs-container">
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              background: "#fff",
              borderRadius: "24px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h2
              style={{
                fontSize: "1.8rem",
                marginBottom: "1rem",
                color: "#0f172a",
              }}
            >
              No hay resultados seleccionados
            </h2>

            <p
              style={{
                color: "#64748b",
                marginBottom: "2rem",
              }}
            >
              Ve a tu historial para revisar entrevistas anteriores.
            </p>

            <Link to="/history" className="rs-history-btn">
              Ver historial
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rs-wrapper">
        <div className="rs-container">
          <div
            style={{ textAlign: "center", padding: "2rem", color: "#dc2626" }}
          >
            <p>Error: {error}</p>
            <Link to="/home" className="rs-btn-back">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = interview?.total_questions ?? 0;
  const answeredQuestions = interview?.answered_questions ?? 0;
  const evaluationText = interview?.evaluation_text || "";
  const audioUrl = normalizeAudioUrl(interview?.evaluation_audio_url);

  const isValidAudioUrl = (url) =>
    url && url.startsWith("http") && !url.includes("None/");

  const progress =
    totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  const circumference = 2 * Math.PI * 52;

  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="rs-wrapper">
      <div className="rs-container">
        {/* Header */}
        <div className="rs-header">
          <div>
            <h1 className="rs-title">Reporte de Evaluación</h1>
            <p className="rs-subtitle">
              Análisis detallado de tu última sesión de práctica técnica.
            </p>
          </div>
          <Link to="/interview" className="rs-repeat-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M1 4v6h6M23 20v-6h-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Repetir Entrevista
          </Link>
        </div>

        {/* Score + Metrics */}
        <div className="rs-top-grid">
          <div className="rs-score-card">
            <h3 className="rs-card-title">Preguntas completadas</h3>
            <div className="rs-score-ring-wrap">
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle
                  cx="65"
                  cy="65"
                  r="52"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                />
                <circle
                  cx="65"
                  cy="65"
                  r="52"
                  fill="none"
                  stroke="url(#scoreGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform="rotate(-90 65 65)"
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
                <defs>
                  <linearGradient
                    id="scoreGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#1e3a8a" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="rs-score-inner">
                <span className="rs-score-num">
                  {interview?.answered_questions ?? 0}
                </span>

                <span className="rs-score-denom">
                  / {interview?.total_questions ?? 0}
                </span>
              </div>
            </div>
            <p className="rs-score-label">Preguntas respondidas</p>
          </div>

          <div className="rs-metrics-card">
            <h3 className="rs-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  stroke="#1e3a8a"
                  strokeWidth="1.8"
                />
                <path
                  d="M8 12h8M8 8h8M8 16h5"
                  stroke="#1e3a8a"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              Información de la sesión
            </h3>
            <div className="rs-metrics-list">
              <div className="rs-metric-item">
                <div className="rs-metric-row">
                  <span className="rs-metric-name">Puesto</span>
                  <span className="rs-metric-pct">{interview?.area}</span>
                </div>
              </div>
              <div className="rs-metric-item">
                <div className="rs-metric-row">
                  <span className="rs-metric-name">Nivel de experiencia</span>
                  <span className="rs-metric-pct">{interview?.experience}</span>
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
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#059669"
                  strokeWidth="1.8"
                />
                <path
                  d="M8 12l3 3 5-5"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Retroalimentación de la IA
            </h3>
            <div
              className="rs-feedback-item"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                width: "100%",
              }}
            >
              {answeredQuestions > 0 && isValidAudioUrl(audioUrl) && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "1rem",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      marginBottom: "0.8rem",
                      fontWeight: "600",
                      color: "#1e3a8a",
                    }}
                  >
                    Escuchar retroalimentación
                  </span>

                  <audio
                    controls
                    style={{
                      width: "100%",
                    }}
                  >
                    <source src={audioUrl} type="audio/mpeg" />
                    Tu navegador no soporta audio.
                  </audio>
                </div>
              )}

              {answeredQuestions > 0 && evaluationText ? (
                <p
                  className="rs-feedback-item-desc"
                  style={{
                    width: "100%",
                    lineHeight: "1.9",
                    textAlign: "justify",
                    whiteSpace: "pre-line",
                  }}
                >
                  {evaluationText}
                </p>
              ) : (
                <div
                  style={{
                    width: "100%",
                    padding: "2rem",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: "0.95rem",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "16px",
                    background: "#f8fafc",
                  }}
                >
                  No hay retroalimentación disponible todavía.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="rs-actions"
          style={{
            marginTop: "2rem",
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
          }}
        >
          <Link to="/interview" className="rs-repeat-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M1 4v6h6M23 20v-6h-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Repetir Entrevista
          </Link>
          <Link
            to="/history"
            className="rs-repeat-btn"
            style={{ background: "#e2e8f0", color: "#1e3a8a" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 6v6l4 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Ver Historial
          </Link>
        </div>
      </div>
    </div>
  );
}
