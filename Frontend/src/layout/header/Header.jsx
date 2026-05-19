import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../../../firebase'
import './Header.css'

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user] = useAuthState(auth)

  const isActive = (path) => location.pathname === path

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login', { replace: true })
  }

  const navLinks = [
    { to: '/home',      label: 'Home' },
    { to: '/interview', label: 'Práctica' },
    { to: '/results',   label: 'Resultados' },
    { to: '/history',   label: 'Historial' },
  ]

  return (
    <header className="app-header">
      {/* Logo → home */}
      <Link to="/home" className="brand">
        <img src="/logologin.svg" alt="Interspeaker logo" width="28" height="24" />
        <span>Interspeaker</span>
      </Link>

      {/* Nav central */}
      <nav className="nav">
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`nav-link${isActive(to) ? ' nav-link--active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Acciones derecha */}
      <div className="header-actions">
        <Link
          to="/setup"
          className={`nav-link${isActive('/setup') ? ' nav-link--active' : ''}`}
        >
          Perfil
        </Link>
        {user && (
          <button className="btn-signout" onClick={handleSignOut}>
            Cerrar sesión
          </button>
        )}
      </div>
    </header>
  )
}

export default Header