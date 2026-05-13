import { Link } from 'react-router-dom'
import './Home.css'

function Home() {
  return (
    <section className="home">
      <h1>Practica entrevistas tecnicas por voz</h1>
      <p>Interspeaker simula entrevistas reales usando IA (Gemini 2.5 Flash) y voz bidireccional.</p>
      <Link to="/setup" className="cta">Comenzar</Link>
    </section>
  )
}

export default Home
