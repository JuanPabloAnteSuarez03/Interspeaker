import { Link } from 'react-router-dom'
import './Header.css'

function Header() {
  return (
    <header className="app-header">
      <Link to="/" className="brand">Interspeaker</Link>
      <nav className="nav">
        <Link to="/setup">Configurar</Link>
        <Link to="/interview">Entrevista</Link>
        <Link to="/results">Resultados</Link>
      </nav>
    </header>
  )
}

export default Header
