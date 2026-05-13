import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Setup.css'

function Setup() {
  const [area, setArea] = useState('backend')
  const [level, setLevel] = useState('junior')
  const navigate = useNavigate()

  const handleStart = () => {
    sessionStorage.setItem('interview-config', JSON.stringify({ area, level }))
    navigate('/interview')
  }

  return (
    <section className="setup">
      <h2>Configura tu entrevista</h2>

      <label>
        Area tecnica
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="backend">Backend</option>
          <option value="frontend">Frontend</option>
          <option value="devops">DevOps</option>
          <option value="data">Data</option>
          <option value="mobile">Mobile</option>
        </select>
      </label>

      <label>
        Nivel
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
        </select>
      </label>

      <button onClick={handleStart}>Iniciar entrevista</button>
    </section>
  )
}

export default Setup
