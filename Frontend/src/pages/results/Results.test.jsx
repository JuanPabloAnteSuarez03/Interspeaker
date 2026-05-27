import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Results from './Results'

jest.mock('../../firebase', () => ({
  auth: { currentUser: { uid: 'uid-123' } },
}))

jest.mock('../../services/api', () => ({
  getUserInterview: jest.fn(),
}))

// Se obtiene el módulo mockeado DESPUÉS del jest.mock
const api = require('../../services/api')

const mockInterview = {
  session_id: 'sess-xyz',
  user_id: 'uid-123',
  area: 'backend',
  experience: 'senior',
  status: 'completed',
  total_questions: 10,
  answered_questions: 10,
  current_question_index: 10,
  evaluation_text:
    'Excelente desempeño. Demostraste sólido conocimiento en backend con respuestas claras.',
  evaluation_audio_url:
    'https://pub-7ab91183bd8847ea812388b1bdb788d4.r2.dev/interspeaker/Evaluaciones/uid-123/sess-xyz_feedback.mp3',
  evaluation_score: 88,
  questions: [],
}

// Render con sessionId en params
const renderWithSession = (sessionId = 'sess-xyz') =>
  render(
    <MemoryRouter initialEntries={[`/results/${sessionId}`]}>
      <Routes>
        <Route path="/results/:sessionId" element={<Results />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </MemoryRouter>
  )

// Render sin sessionId
const renderWithoutSession = () =>
  render(
    <MemoryRouter initialEntries={['/results']}>
      <Routes>
        <Route path="/results" element={<Results />} />
      </Routes>
    </MemoryRouter>
  )

describe('Results', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Estado de carga ──────────────────────────────────────────────
  describe('Estado de carga', () => {
    test('muestra el spinner mientras carga', () => {
      api.getUserInterview.mockReturnValue(new Promise(() => {}))
      renderWithSession()
      expect(screen.getByText(/Cargando resultados/i)).toBeInTheDocument()
    })
  })

  // ── Sin sessionId ────────────────────────────────────────────────
  describe('Sin sessionId', () => {
    test('muestra mensaje cuando no hay sesión seleccionada', () => {
      renderWithoutSession()
      expect(
        screen.getByText('No hay resultados seleccionados')
      ).toBeInTheDocument()
    })

    test('muestra enlace al historial', () => {
      renderWithoutSession()
      const link = screen.getByText('Ver historial')
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute('href', '/history')
    })
  })

  // ── Con datos completos ──────────────────────────────────────────
  describe('Con datos de entrevista completada', () => {
    beforeEach(() => {
      api.getUserInterview.mockResolvedValue(mockInterview)
    })

    test('muestra el título del reporte', async () => {
      renderWithSession()
      await waitFor(() =>
        expect(screen.getByText('Reporte de Evaluación')).toBeInTheDocument()
      )
    })

    test('muestra el subtítulo', async () => {
      renderWithSession()
      await waitFor(() =>
        expect(
          screen.getByText(/Análisis detallado de tu última sesión/i)
        ).toBeInTheDocument()
      )
    })

    test('muestra el número de preguntas respondidas', async () => {
      renderWithSession()
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument()
      })
    })

    test('muestra el total de preguntas', async () => {
      renderWithSession()
      await waitFor(() =>
        expect(screen.getByText('/ 10')).toBeInTheDocument()
      )
    })

    test('muestra el área de la sesión', async () => {
      renderWithSession()
      await waitFor(() =>
        expect(screen.getByText('backend')).toBeInTheDocument()
      )
    })

    test('muestra el nivel de experiencia', async () => {
      renderWithSession()
      await waitFor(() =>
        expect(screen.getByText('senior')).toBeInTheDocument()
      )
    })

    test('muestra el texto de retroalimentación de la IA', async () => {
      renderWithSession()
      await waitFor(() =>
        expect(
          screen.getByText(/Excelente desempeño/i)
        ).toBeInTheDocument()
      )
    })

    test('muestra el título de retroalimentación de la IA', async () => {
      renderWithSession()
      await waitFor(() =>
        expect(
          screen.getByText('Retroalimentación de la IA')
        ).toBeInTheDocument()
      )
    })

    test('muestra el reproductor de audio cuando hay URL válida', async () => {
      renderWithSession()
      await waitFor(() => {
        expect(
          screen.getByText('Escuchar retroalimentación')
        ).toBeInTheDocument()
      })
    })

    test('muestra el botón de repetir entrevista', async () => {
      renderWithSession()
      await waitFor(() => {
        const btns = screen.getAllByText('Repetir Entrevista')
        expect(btns.length).toBeGreaterThan(0)
      })
    })

    test('muestra el botón de ver historial', async () => {
      renderWithSession()
      await waitFor(() =>
        expect(screen.getByText('Ver Historial')).toBeInTheDocument()
      )
    })

    test('el enlace de repetir entrevista apunta a /interview', async () => {
      renderWithSession()
      await waitFor(() => {
        const links = screen.getAllByText('Repetir Entrevista')
        expect(links[0].closest('a')).toHaveAttribute('href', '/interview')
      })
    })

    test('el enlace de ver historial apunta a /history', async () => {
      renderWithSession()
      await waitFor(() => {
        const link = screen.getByText('Ver Historial')
        expect(link.closest('a')).toHaveAttribute('href', '/history')
      })
    })
  })

  // ── Sin evaluación todavía ───────────────────────────────────────
  describe('Sin evaluación disponible', () => {
    test('muestra mensaje cuando no hay retroalimentación', async () => {
      api.getUserInterview.mockResolvedValue({
        ...mockInterview,
        answered_questions: 0,
        evaluation_text: '',
        evaluation_audio_url: null,
      })
      renderWithSession()
      await waitFor(() =>
        expect(
          screen.getByText('No hay retroalimentación disponible todavía.')
        ).toBeInTheDocument()
      )
    })
  })

  // ── Error de API ─────────────────────────────────────────────────
  describe('Error de API', () => {
    test('muestra fallback seguro cuando la API falla', async () => {
      api.getUserInterview.mockRejectedValue(new Error('server error'))
      renderWithSession()
      // Carga fallback sin romper la vista
      await waitFor(() =>
        expect(screen.getByText('Reporte de Evaluación')).toBeInTheDocument()
      )
    })
  })
})