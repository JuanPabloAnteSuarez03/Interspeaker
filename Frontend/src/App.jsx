import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../firebase'
import Layout from './layout/Layout'
import Home from './pages/home/Home'
import Setup from './pages/setup/Setup'
import Interview from './pages/interview/Interview'
import Results from './pages/results/Results'
import Login from './pages/login/Login'
import './App.css'

// Placeholder para History hasta que se implemente
function History() {
  return (
    <section style={{ maxWidth: 720, margin: '48px auto', padding: '0 24px' }}>
      <h2 style={{ fontFamily: 'Georgia, serif', color: '#0f172a', marginBottom: 8 }}>
        Historial de entrevistas
      </h2>
      <p style={{ color: '#64748b' }}>Aquí aparecerán tus sesiones anteriores.</p>
    </section>
  )
}

function ProtectedRoute({ children }) {
  const [user, loading] = useAuthState(auth)

  if (loading) return null

  return user ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/home"      element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/setup"     element={<ProtectedRoute><Setup /></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
        <Route path="/results"   element={<ProtectedRoute><Results /></ProtectedRoute>} />
        <Route path="/history"   element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Route>
    </Routes>
  )
}

export default App