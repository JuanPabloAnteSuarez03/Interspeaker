import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Interview from './Interview'
import * as api from '../../services/api'

// ── Mocks globales ───────────────────────────────────────────────
jest.mock('../../firebase', () => ({
  auth: { currentUser: { uid: 'uid-test-123' } },
}))

jest.mock('../../services/api', () => ({
  startInterview: jest.fn(),
  submitAnswer: jest.fn(),
  evaluateInterview: jest.fn(),
}))

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

// MediaDevices stub
const mockStream = {
  getTracks: () => [{ stop: jest.fn() }],
}

const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
}

beforeAll(() => {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue(mockStream),
    },
  })

  global.MediaRecorder = jest.fn(() => mockMediaRecorder)
  global.MediaRecorder.isTypeSupported = jest.fn(() => true)

  global.AudioContext = jest.fn(() => ({
    createMediaStreamSource: jest.fn(() => ({
      connect: jest.fn(),
    })),
    createAnalyser: jest.fn(() => ({
      fftSize: 256,
      frequencyBinCount: 128,
      connect: jest.fn(),
      getByteFrequencyData: jest.fn(),
    })),
  }))

  // jsdom no implementa HTMLMediaElement.play — devuelve undefined y rompe .catch()
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve())
  window.HTMLMediaElement.prototype.pause = jest.fn()
})

const startResponse = {
  session_id: 'sess-abc',
  questions_metadata: [
    { index: 0, question_text: '¿Qué es React?' },
    { index: 1, question_text: '¿Qué es un hook?' },
    { index: 2, question_text: '¿Qué es el virtual DOM?' },
  ],
  audio_base64: 'ZmFrZQ==',
  user_id: 'uid-test-123',
  current_index: 0,
  total_questions: 3,
}

const renderInterview = () =>
  render(
    <MemoryRouter>
      <Interview />
    </MemoryRouter>
  )

describe('Interview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    api.startInterview.mockResolvedValue(startResponse)
    api.submitAnswer.mockResolvedValue({
      success: true,
      transcript: 'mi respuesta',
      next_index: 1,
      has_more: true,
      next_audio_url: null,
      completed_percentage: 33,
    })
  })

  // ── Setup step ───────────────────────────────────────────────────
  describe('Paso de configuración (setup)', () => {
    test('muestra el título Interspeaker', () => {
      renderInterview()
      expect(screen.getByText('Interspeaker')).toBeInTheDocument()
    })

    test('muestra el subtítulo de la entrevista', () => {
      renderInterview()
      expect(
        screen.getByText('Entrevista técnica simulada con IA')
      ).toBeInTheDocument()
    })

    test('muestra el campo de puesto deseado', () => {
      renderInterview()
      expect(screen.getByPlaceholderText(/Desarrollador Frontend/i)).toBeInTheDocument()
    })

    test('muestra los botones de nivel de experiencia', () => {
      renderInterview()
      expect(screen.getByText('Sin experiencia')).toBeInTheDocument()
      expect(screen.getByText('1 - 2 años')).toBeInTheDocument()
      expect(screen.getByText('3 - 5 años')).toBeInTheDocument()
      expect(screen.getByText('6+ años')).toBeInTheDocument()
    })

    test('muestra el botón de comenzar entrevista', () => {
      renderInterview()
      expect(
        screen.getByRole('button', { name: /Comenzar Entrevista/i })
      ).toBeInTheDocument()
    })

    test('permite cambiar el campo de puesto', () => {
      renderInterview()
      const input = screen.getByPlaceholderText(/Desarrollador Frontend/i)
      fireEvent.change(input, { target: { value: 'backend' } })
      expect(input.value).toBe('backend')
    })

    test('permite seleccionar un nivel de experiencia', () => {
      renderInterview()
      const btn = screen.getByText('3 - 5 años')
      fireEvent.click(btn)
      expect(btn).toHaveClass('sp-level-btn--active')
    })

    test('el nivel seleccionado activo tiene la clase correcta', () => {
      renderInterview()
      // "1 - 2 años" es el nivel por defecto
      expect(screen.getByText('1 - 2 años')).toHaveClass('sp-level-btn--active')
    })
  })

  // ── Inicio de entrevista ─────────────────────────────────────────
  describe('Iniciar entrevista', () => {
    test('llama a startInterview al hacer clic en el botón', async () => {
      renderInterview()
      fireEvent.click(screen.getByRole('button', { name: /Comenzar Entrevista/i }))
      await waitFor(() =>
        expect(api.startInterview).toHaveBeenCalledTimes(1)
      )
    })

    test('pasa área y nivel al llamar startInterview', async () => {
      renderInterview()
      fireEvent.click(screen.getByRole('button', { name: /Comenzar Entrevista/i }))
      await waitFor(() =>
        expect(api.startInterview).toHaveBeenCalledWith(
          'frontend',
          'junior'
        )
      )
    })

    test('muestra estado de carga mientras inicia', async () => {
      api.startInterview.mockReturnValue(new Promise(() => {}))
      renderInterview()
      fireEvent.click(screen.getByRole('button', { name: /Comenzar Entrevista/i }))
      await waitFor(() =>
        expect(screen.getByText('Iniciando...')).toBeInTheDocument()
      )
    })

    test('transiciona al paso de entrevista tras inicio exitoso', async () => {
      renderInterview()
      fireEvent.click(screen.getByRole('button', { name: /Comenzar Entrevista/i }))
      await waitFor(() =>
        expect(screen.getByText(/PREGUNTA 1 DE 3/i)).toBeInTheDocument()
      )
    })

    test('muestra error si startInterview falla', async () => {
      api.startInterview.mockRejectedValue(new Error('API caída'))
      renderInterview()
      fireEvent.click(screen.getByRole('button', { name: /Comenzar Entrevista/i }))
      await waitFor(() =>
        expect(screen.getByText(/API caída/i)).toBeInTheDocument()
      )
    })
  })

  // ── Paso de entrevista ───────────────────────────────────────────
  describe('Paso de entrevista', () => {
    const goToInterview = async () => {
      renderInterview()
      fireEvent.click(screen.getByRole('button', { name: /Comenzar Entrevista/i }))
      await waitFor(() => screen.getByText(/PREGUNTA 1 DE 3/i))
    }

    test('muestra el indicador de progreso', async () => {
      await goToInterview()
      expect(screen.getByText('PREGUNTA 1 DE 3')).toBeInTheDocument()
    })

    test('muestra el título de fase "Escucha la pregunta"', async () => {
      await goToInterview()
      expect(screen.getByText(/Escucha la pregunta/i)).toBeInTheDocument()
    })

    test('muestra el texto de la pregunta actual', async () => {
      await goToInterview()
      expect(screen.getByText(/¿Qué es React\?/i)).toBeInTheDocument()
    })

    test('muestra el botón de micrófono', async () => {
      await goToInterview()
      const micBtn = screen.getByRole('button', { name: /iniciar grabación/i })
      expect(micBtn).toBeInTheDocument()
    })

    test('muestra el botón de pausa', async () => {
      await goToInterview()
      expect(screen.getByText(/Pausar/i)).toBeInTheDocument()
    })

    test('muestra el overlay de pausa al hacer clic en Pausar', async () => {
      await goToInterview()
      fireEvent.click(screen.getByText(/Pausar/i))
      await waitFor(() =>
        expect(screen.getByText('Entrevista pausada')).toBeInTheDocument()
      )
    })

    test('cierra el overlay de pausa al hacer clic en Continuar', async () => {
      await goToInterview()
      fireEvent.click(screen.getByText(/Pausar/i))
      await waitFor(() => screen.getByText('Continuar entrevista'))
      fireEvent.click(screen.getByText('Continuar entrevista'))
      await waitFor(() =>
        expect(screen.queryByText('Entrevista pausada')).not.toBeInTheDocument()
      )
    })
  })

  // ── Recuperación de sesión ───────────────────────────────────────
  describe('Recuperación de sesión guardada', () => {
    test('muestra modal de recuperación si hay sesión guardada', () => {
      const savedSession = {
        sessionId: 'sess-saved',
        userId: 'uid-test-123',
        currentIndex: 2,
        questions: [
          { index: 0, question_text: 'Q1' },
          { index: 1, question_text: 'Q2' },
          { index: 2, question_text: 'Q3' },
        ],
        audioUrls: {},
        area: 'frontend',
        level: '1 - 2 años',
        timestamp: Date.now(),
      }
      localStorage.setItem('interviewSession', JSON.stringify(savedSession))
      renderInterview()
      expect(
        screen.getByText('Entrevista no finalizada')
      ).toBeInTheDocument()
    })

    test('muestra la pregunta en la que se dejó la sesión', () => {
      const savedSession = {
        sessionId: 'sess-saved',
        userId: 'uid-test-123',
        currentIndex: 2,
        questions: [
          { index: 0, question_text: 'Q1' },
          { index: 1, question_text: 'Q2' },
          { index: 2, question_text: 'Q3' },
        ],
        audioUrls: {},
        area: 'frontend',
        level: '1 - 2 años',
        timestamp: Date.now(),
      }
      localStorage.setItem('interviewSession', JSON.stringify(savedSession))
      renderInterview()
      expect(screen.getByText(/pregunta 3 de 3/i)).toBeInTheDocument()
    })

    test('descarta sesión guardada al hacer clic en "Nueva entrevista"', () => {
      const savedSession = {
        sessionId: 'sess-saved',
        userId: 'uid-test-123',
        currentIndex: 1,
        questions: [{ index: 0, question_text: 'Q1' }],
        audioUrls: {},
        area: 'frontend',
        level: '1 - 2 años',
        timestamp: Date.now(),
      }
      localStorage.setItem('interviewSession', JSON.stringify(savedSession))
      renderInterview()
      fireEvent.click(screen.getByText('➕ Nueva entrevista'))
      expect(
        screen.queryByText('Entrevista no finalizada')
      ).not.toBeInTheDocument()
      expect(localStorage.getItem('interviewSession')).toBeNull()
    })

    test('reanuda sesión guardada al hacer clic en "Continuar entrevista"', async () => {
      const savedSession = {
        sessionId: 'sess-saved',
        userId: 'uid-test-123',
        currentIndex: 1,
        questions: [
          { index: 0, question_text: 'Q1' },
          { index: 1, question_text: 'Q2 recuperada' },
        ],
        audioUrls: {},
        area: 'frontend',
        level: '1 - 2 años',
        timestamp: Date.now(),
      }
      localStorage.setItem('interviewSession', JSON.stringify(savedSession))
      renderInterview()
      fireEvent.click(screen.getByText('▶️ Continuar entrevista'))
      await waitFor(() =>
        expect(screen.getByText(/PREGUNTA 2 DE 2/i)).toBeInTheDocument()
      )
    })
  })
})