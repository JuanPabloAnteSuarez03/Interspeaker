import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layout/Layout'
import Home from './pages/home/Home'
import Setup from './pages/setup/Setup'
import Interview from './pages/interview/Interview'
import Results from './pages/results/Results'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/results" element={<Results />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
