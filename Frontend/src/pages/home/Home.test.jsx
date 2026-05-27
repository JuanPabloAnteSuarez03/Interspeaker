import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

jest.mock('../../firebase', () => ({
  auth: { currentUser: { uid: 'uid-123' } },
}))

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

describe('Home', () => {
  // ── Renderizado básico ───────────────────────────────────────────
  describe('Renderizado inicial', () => {
    test('muestra el título principal del hero', () => {
      renderHome()
      expect(
        screen.getByText(/Domina tus entrevistas técnicas/i)
      ).toBeInTheDocument()
    })

    test('muestra la palabra "voz" en el título como acento', () => {
      renderHome()
      expect(screen.getByText('voz')).toBeInTheDocument()
    })

    test('muestra el subtítulo del hero', () => {
      renderHome()
      expect(
        screen.getByText(/Practica con IA, recibe feedback/i)
      ).toBeInTheDocument()
    })

    test('muestra el botón CTA "Empezar ahora"', () => {
      renderHome()
      const cta = screen.getByText('Empezar ahora →')
      expect(cta).toBeInTheDocument()
    })

    test('el botón CTA enlaza a /interview', () => {
      renderHome()
      const cta = screen.getByText('Empezar ahora →')
      expect(cta.closest('a')).toHaveAttribute('href', '/interview')
    })
  })

  // ── Sección de características ───────────────────────────────────
  describe('Sección de características', () => {
    test('muestra el título de la sección de características', () => {
      renderHome()
      expect(screen.getByText('Características Principales')).toBeInTheDocument()
    })

    test('muestra el subtítulo de la sección', () => {
      renderHome()
      expect(
        screen.getByText(/Tecnología de vanguardia/i)
      ).toBeInTheDocument()
    })

    test('muestra la característica de IA Dinámica', () => {
      renderHome()
      expect(screen.getByText(/IA Dinámica/i)).toBeInTheDocument()
    })

    test('muestra la característica de interacción por voz', () => {
      renderHome()
      expect(screen.getByText('Interacción por voz')).toBeInTheDocument()
    })

    test('muestra la característica de reportes detallados', () => {
      renderHome()
      expect(screen.getByText('Reportes detallados')).toBeInTheDocument()
    })

    test('muestra descripción de la IA', () => {
      renderHome()
      expect(
        screen.getByText(/Respuestas adaptativas y contextuales/i)
      ).toBeInTheDocument()
    })

    test('muestra descripción de STT/TTS', () => {
      renderHome()
      expect(
        screen.getByText(/Tecnología STT\/TTS/i)
      ).toBeInTheDocument()
    })

    test('muestra pill de Claridad', () => {
      renderHome()
      expect(screen.getByText(/Claridad: 92%/i)).toBeInTheDocument()
    })

    test('muestra pill de Estructura', () => {
      renderHome()
      expect(screen.getByText(/Estructura: 85%/i)).toBeInTheDocument()
    })
  })

  // ── Sección waveform ────────────────────────────────────────────
  describe('Sección de waveform', () => {
    test('muestra el análisis de tono', () => {
      renderHome()
      expect(screen.getByText('Análisis de Tono')).toBeInTheDocument()
    })

    test('muestra el valor de tono', () => {
      renderHome()
      expect(screen.getByText('Confiado y Claro')).toBeInTheDocument()
    })
  })

  // ── Métricas de ejemplo ─────────────────────────────────────────
  describe('Métricas de ejemplo', () => {
    test('muestra la métrica de Confianza Vocal', () => {
      renderHome()
      expect(screen.getByText('Confianza Vocal')).toBeInTheDocument()
    })

    test('muestra la métrica de Uso de Muletillas', () => {
      renderHome()
      expect(screen.getByText('Uso de Muletillas')).toBeInTheDocument()
    })

    test('muestra el tag Excelente para confianza', () => {
      renderHome()
      expect(screen.getByText('Excelente')).toBeInTheDocument()
    })

    test('muestra el tag "A mejorar" para muletillas', () => {
      renderHome()
      expect(screen.getByText('A mejorar')).toBeInTheDocument()
    })
  })
})