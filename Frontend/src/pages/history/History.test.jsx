import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import History from './History'
import * as api from '../../services/api'

jest.mock('../../firebase', () => ({
  auth: { currentUser: { uid: 'uid-123' } },
}))

jest.mock('../../services/api', () => ({
  getUserInterviews: jest.fn(),
}))

const mockInterviews = [
  {
    session_id: 'session-1',
    area: 'frontend',
    experience: 'junior',
    status: 'completed',
    score: 85,
    total_questions: 10,
    answered_questions: 10,
    created_at: { seconds: 1700000000 },
    completed_at: { seconds: 1700003600 },
  },
  {
    session_id: 'session-2',
    area: 'backend',
    experience: 'senior',
    status: 'completed',
    score: 60,
    total_questions: 10,
    answered_questions: 8,
    created_at: { seconds: 1700100000 },
    completed_at: null,
  },
]

const renderHistory = () =>
  render(
    <MemoryRouter>
      <History />
    </MemoryRouter>
  )

describe('History', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Carga inicial ────────────────────────────────────────────────
  describe('Estado de carga', () => {
    test('muestra spinner mientras carga', () => {
      api.getUserInterviews.mockReturnValue(new Promise(() => {}))
      renderHistory()
      expect(screen.getByText(/Cargando historial/i)).toBeInTheDocument()
    })
  })

  // ── Con entrevistas ──────────────────────────────────────────────
  describe('Con entrevistas', () => {
    beforeEach(() => {
      api.getUserInterviews.mockResolvedValue({ interviews: mockInterviews })
    })

    test('muestra el título principal', async () => {
      renderHistory()
      await waitFor(() =>
        expect(screen.getByText('Historial de entrevistas')).toBeInTheDocument()
      )
    })

    test('muestra el subtítulo', async () => {
      renderHistory()
      await waitFor(() =>
        expect(screen.getByText(/Revisa tu progreso/i)).toBeInTheDocument()
      )
    })

    test('muestra el total de sesiones en las estadísticas', async () => {
      renderHistory()
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('Sesiones totales')).toBeInTheDocument()
      })
    })

    test('muestra las tarjetas de entrevista', async () => {
      renderHistory()
      await waitFor(() => {
        expect(screen.getByText(/frontend/i)).toBeInTheDocument()
        expect(screen.getByText(/backend/i)).toBeInTheDocument()
      })
    })

    test('muestra el botón de nueva entrevista', async () => {
      renderHistory()
      await waitFor(() =>
        expect(screen.getByText('+ Nueva entrevista')).toBeInTheDocument()
      )
    })

    test('expande una tarjeta al hacer clic', async () => {
      renderHistory()
      await waitFor(() => screen.getByText(/frontend/i))

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      await waitFor(() =>
        expect(screen.getByText(/Estado/i)).toBeInTheDocument()
      )
    })

    test('colapsa la tarjeta al hacer clic de nuevo', async () => {
      renderHistory()
      await waitFor(() => screen.getByText(/frontend/i))

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])
      await waitFor(() => screen.getByText(/Estado/i))

      fireEvent.click(buttons[0])
      await waitFor(() =>
        expect(screen.queryByText(/Estado/i)).not.toBeInTheDocument()
      )
    })

    test('muestra badge de excelente para score alto', async () => {
      renderHistory()
      await waitFor(() =>
        expect(screen.getByText('Excelente')).toBeInTheDocument()
      )
    })

    test('muestra badge "A mejorar" para score medio-bajo', async () => {
      renderHistory()
      await waitFor(() =>
        expect(screen.getByText('A mejorar')).toBeInTheDocument()
      )
    })

    test('muestra enlace a resultados dentro de la tarjeta expandida', async () => {
      renderHistory()
      await waitFor(() => screen.getByText(/frontend/i))
      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      await waitFor(() => {
        const link = screen.getByText('Ver resultados completos')
        expect(link).toBeInTheDocument()
        expect(link.closest('a')).toHaveAttribute('href', '/results/session-1')
      })
    })
  })

  // ── Sin entrevistas ──────────────────────────────────────────────
  describe('Sin entrevistas', () => {
    test('muestra mensaje cuando no hay sesiones', async () => {
      api.getUserInterviews.mockResolvedValue({ interviews: [] })
      renderHistory()
      await waitFor(() =>
        expect(
          screen.getByText('Aún no tienes sesiones registradas.')
        ).toBeInTheDocument()
      )
    })

    test('muestra enlace para empezar primera entrevista', async () => {
      api.getUserInterviews.mockResolvedValue({ interviews: [] })
      renderHistory()
      await waitFor(() =>
        expect(screen.getByText('Comenzar primera entrevista')).toBeInTheDocument()
      )
    })
  })

  // ── Error de carga ───────────────────────────────────────────────
  describe('Error de carga', () => {
    test('muestra mensaje de error si la API falla', async () => {
      api.getUserInterviews.mockRejectedValue(new Error('Network error'))
      renderHistory()
      await waitFor(() =>
        expect(screen.getByText(/Network error/i)).toBeInTheDocument()
      )
    })
  })
})