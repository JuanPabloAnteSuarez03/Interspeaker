import { useEffect, useState } from 'react'
import './Interview.css'

function Interview() {
  const [question, _setQuestion] = useState('Cargando primera pregunta...')
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    // TODO: integrar con /api/interview/start
  }, [])

  return (
    <section className="interview">
      <h2>Entrevista en curso</h2>
      <div className="question-card">{question}</div>
      <button onClick={() => setRecording((r) => !r)}>
        {recording ? 'Detener' : 'Grabar respuesta'}
      </button>
    </section>
  )
}

export default Interview
