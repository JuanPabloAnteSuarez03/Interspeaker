import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Setup from './Setup'

jest.mock('../../firebase', () => ({
  auth: { currentUser: { uid: 'uid-123' } },
}))

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const renderSetup = () =>
  render(
    <MemoryRouter>
      <Setup />
    </MemoryRouter>
  )

describe('Setup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
  })

  // ── Renderizado inicial ──────────────────────────────────────────
  describe('Renderizado inicial', () => {
    test('muestra el título de la tarjeta', () => {
      renderSetup()
      expect(screen.getByText('Prepara tu sesión')).toBeInTheDocument()
    })

    test('muestra el subtítulo', () => {
      renderSetup()
      expect(
        screen.getByText(/La IA de Interspeaker adaptará/i)
      ).toBeInTheDocument()
    })

    test('muestra el campo de nombre', () => {
      renderSetup()
      expect(screen.getByPlaceholderText('Ej. Ana García')).toBeInTheDocument()
    })

    test('muestra el valor por defecto del nombre', () => {
      renderSetup()
      expect(screen.getByDisplayValue('Ana García')).toBeInTheDocument()
    })

    test('muestra el selector de área de especialidad', () => {
      renderSetup()
      // El select debería existir con la opción Frontend
      expect(screen.getByText('Frontend')).toBeInTheDocument()
    })

    test('muestra todas las áreas disponibles en el select', () => {
      renderSetup()
      expect(screen.getByText('Backend')).toBeInTheDocument()
      expect(screen.getByText('Full Stack')).toBeInTheDocument()
      expect(screen.getByText('DevOps')).toBeInTheDocument()
      expect(screen.getByText('Data / ML')).toBeInTheDocument()
      expect(screen.getByText('Mobile')).toBeInTheDocument()
    })

    test('muestra los botones de nivel de experiencia', () => {
      renderSetup()
      expect(screen.getByText('Junior')).toBeInTheDocument()
      expect(screen.getByText('Mid-Level')).toBeInTheDocument()
      expect(screen.getByText('Senior')).toBeInTheDocument()
      expect(screen.getByText('Lead / Staff')).toBeInTheDocument()
    })

    test('muestra "Mid-Level" como nivel activo por defecto', () => {
      renderSetup()
      expect(screen.getByText('Mid-Level')).toHaveClass('sp-level-btn--active')
    })

    test('muestra el botón de comenzar entrevista', () => {
      renderSetup()
      expect(
        screen.getByRole('button', { name: /Comenzar Entrevista/i })
      ).toBeInTheDocument()
    })

    test('muestra la etiqueta del divisor', () => {
      renderSetup()
      expect(
        screen.getByText('O COMPLETA MANUALMENTE')
      ).toBeInTheDocument()
    })

    test('muestra el hint de voz', () => {
      renderSetup()
      expect(screen.getByText(/Haz clic para hablar/i)).toBeInTheDocument()
    })
  })

  // ── Interacciones con campos ─────────────────────────────────────
  describe('Interacciones con campos', () => {
    test('permite editar el campo de nombre', () => {
      renderSetup()
      const input = screen.getByPlaceholderText('Ej. Ana García')
      fireEvent.change(input, { target: { value: 'Carlos Rodríguez' } })
      expect(input.value).toBe('Carlos Rodríguez')
    })

    test('permite seleccionar una nueva área', () => {
      renderSetup()
      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'backend' } })
      expect(select.value).toBe('backend')
    })

    test('cambia el nivel activo al hacer clic en otro botón', () => {
      renderSetup()
      const seniorBtn = screen.getByText('Senior')
      fireEvent.click(seniorBtn)
      expect(seniorBtn).toHaveClass('sp-level-btn--active')
    })

    test('desactiva el nivel anterior al elegir uno nuevo', () => {
      renderSetup()
      const seniorBtn = screen.getByText('Senior')
      fireEvent.click(seniorBtn)
      expect(screen.getByText('Mid-Level')).not.toHaveClass('sp-level-btn--active')
    })

    test('activa/desactiva el micrófono al hacer clic en el botón de mic', () => {
      renderSetup()
      const micBtn = screen.getByRole('button', { name: '' })
      // El botón del mic no tiene nombre accesible explícito; buscar por clase
      // Buscar el botón .sp-mic-btn
      const allButtons = screen.getAllByRole('button')
      // sp-mic-btn es el primero (el de la tarjeta izquierda)
      const micBtnEl = allButtons.find((b) => b.className.includes('sp-mic-btn'))
      expect(micBtnEl).toBeTruthy()
      fireEvent.click(micBtnEl)
      expect(micBtnEl).toHaveClass('sp-mic-btn--active')
    })

    test('al hacer clic de nuevo en mic, vuelve al estado inactivo', () => {
      renderSetup()
      const allButtons = screen.getAllByRole('button')
      const micBtnEl = allButtons.find((b) => b.className.includes('sp-mic-btn'))
      fireEvent.click(micBtnEl) // activar
      fireEvent.click(micBtnEl) // desactivar
      expect(micBtnEl).not.toHaveClass('sp-mic-btn--active')
    })
  })

  // ── Envío del formulario ─────────────────────────────────────────
  describe('Envío del formulario', () => {
    test('guarda la configuración en sessionStorage al comenzar', () => {
      renderSetup()
      fireEvent.click(
        screen.getByRole('button', { name: /Comenzar Entrevista/i })
      )
      const stored = JSON.parse(
        sessionStorage.getItem('interview-config') || 'null'
      )
      expect(stored).not.toBeNull()
      expect(stored).toHaveProperty('name')
      expect(stored).toHaveProperty('area')
      expect(stored).toHaveProperty('level')
    })

    test('guarda el nombre correcto en sessionStorage', () => {
      renderSetup()
      fireEvent.click(
        screen.getByRole('button', { name: /Comenzar Entrevista/i })
      )
      const stored = JSON.parse(sessionStorage.getItem('interview-config'))
      expect(stored.name).toBe('Ana García')
    })

    test('guarda el área correcta en sessionStorage', () => {
      renderSetup()
      fireEvent.click(
        screen.getByRole('button', { name: /Comenzar Entrevista/i })
      )
      const stored = JSON.parse(sessionStorage.getItem('interview-config'))
      expect(stored.area).toBe('frontend')
    })

    test('navega a /interview al hacer clic en comenzar', () => {
      renderSetup()
      fireEvent.click(
        screen.getByRole('button', { name: /Comenzar Entrevista/i })
      )
      expect(mockNavigate).toHaveBeenCalledWith('/interview')
    })

    test('guarda el nivel actualizado si se cambia antes de enviar', () => {
      renderSetup()
      fireEvent.click(screen.getByText('Senior'))
      fireEvent.click(
        screen.getByRole('button', { name: /Comenzar Entrevista/i })
      )
      const stored = JSON.parse(sessionStorage.getItem('interview-config'))
      expect(stored.level).toBe('Senior')
    })
  })
})