import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../../../firebase'
import './Login.css'

function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/home')
    } catch (err) {
      console.error('Error al iniciar sesión:', err)
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      {/* Fondo con gradiente y burbujas decorativas */}
      <div className="login-bg">
        <div className="bubble bubble-1" />
        <div className="bubble bubble-2" />
        <div className="bubble bubble-3" />
      </div>

      {/* Header con logo */}
      <header className="login-header">
        <div className="login-logo">
          <span className="login-logo-icon">
            <img src="/logologin.svg" alt="Interspeaker" width="33" height="29" />
          </span>
          <span className="login-logo-text">Interspeaker</span>
        </div>
      </header>

      {/* Card central */}
      <div className="login-center">
        <div className="login-card">
          {/* Icono */}
          <div className="login-icon-wrapper">
            <div className="login-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C10.3 2 9 3.3 9 5v6c0 1.7 1.3 3 3 3s3-1.3 3-3V5c0-1.7-1.3-3-3-3z" fill="#1e3a8a" />
                <path d="M19 11c0 3.9-3.1 7-7 7s-7-3.1-7-7H3c0 4.9 3.7 8.9 8.5 9.4V22h1V20.4c4.8-.5 8.5-4.5 8.5-9.4h-2z" fill="#1e3a8a" />
              </svg>
            </div>
          </div>

          {/* Texto */}
          <h1 className="login-title">Bienvenido a Interspeaker</h1>
          <p className="login-subtitle">
            Domina tus entrevistas técnicas con el poder de la IA.
            Regístrate o inicia sesión para comenzar a practicar.
          </p>

          {/* Error */}
          {error && (
            <p className="login-error">{error}</p>
          )}

          {/* Botón Google */}
          <button
            className={`login-google-btn ${loading ? 'loading' : ''}`}
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {loading ? 'Iniciando sesión...' : 'Continuar con Google'}
          </button>

          {/* Divider */}
          <div className="login-divider"><span /></div>

          {/* Badges */}
          <div className="login-badges">
            <div className="login-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" fill="#1e3a8a" opacity="0.7" />
              </svg>
              <span>SEGURO</span>
            </div>
            <div className="login-badge-divider" />
            <div className="login-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="#1e3a8a" opacity="0.7" />
              </svg>
              <span>POTENCIADO POR IA</span>
            </div>
          </div>
        </div>

        <footer className="login-footer">
          <span>© 2024 Interspeaker AI. All rights reserved.</span>
        </footer>
      </div>
    </div>
  )
}

export default Login