import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

// Mock de Firebase Auth
const mockSignInWithPopup = jest.fn()
const mockNavigate = jest.fn()

jest.mock('firebase/auth', () => ({
  signInWithPopup: (...args) => mockSignInWithPopup(...args),
}))

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Renderizado ──────────────────────────────────────────────────────────
  describe('Renderizado inicial', () => {
    test('muestra el título de bienvenida', () => {
      renderLogin()
      expect(screen.getByText('Bienvenido a Interspeaker')).toBeInTheDocument()
    })

    test('muestra el subtítulo', () => {
      renderLogin()
      expect(
        screen.getByText(/Domina tus entrevistas técnicas/i)
      ).toBeInTheDocument()
    })

    test('muestra el botón de Google', () => {
      renderLogin()
      expect(
        screen.getByRole('button', { name: /Continuar con Google/i })
      ).toBeInTheDocument()
    })

    test('muestra los badges SEGURO y POTENCIADO POR IA', () => {
      renderLogin()
      expect(screen.getByText('SEGURO')).toBeInTheDocument()
      expect(screen.getByText('POTENCIADO POR IA')).toBeInTheDocument()
    })

    test('muestra el logo Interspeaker en el header', () => {
      renderLogin()
      expect(screen.getByText('Interspeaker')).toBeInTheDocument()
    })

    test('muestra el footer con copyright', () => {
      renderLogin()
      expect(
        screen.getByText(/© 2024 Interspeaker AI/i)
      ).toBeInTheDocument()
    })

    test('NO muestra mensaje de error al arrancar', () => {
      renderLogin()
      expect(
        screen.queryByText(/No se pudo iniciar sesión/i)
      ).not.toBeInTheDocument()
    })
  })

  // ── Estado de carga ──────────────────────────────────────────────────────
  describe('Estado de carga', () => {
    test('deshabilita el botón mientras carga', async () => {
      mockSignInWithPopup.mockReturnValue(new Promise(() => {}))

      renderLogin()
      fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Iniciando sesión/i })
        ).toBeDisabled()
      })
    })

    test('cambia el texto del botón a "Iniciando sesión..." durante la carga', async () => {
      mockSignInWithPopup.mockReturnValue(new Promise(() => {}))

      renderLogin()
      fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }))

      await waitFor(() => {
        expect(screen.getByText('Iniciando sesión...')).toBeInTheDocument()
      })
    })
  })

  // ── Flujo de éxito ───────────────────────────────────────────────────────
  describe('Login exitoso', () => {
    test('llama a signInWithPopup al hacer clic', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: { uid: '123' } })

      renderLogin()
      fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }))

      await waitFor(() => {
        expect(mockSignInWithPopup).toHaveBeenCalledTimes(1)
      })
    })

    test('navega a /home tras login exitoso', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: { uid: '123' } })

      renderLogin()
      fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/home')
      })
    })

    test('no muestra error tras login exitoso', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: { uid: '123' } })

      renderLogin()
      fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }))

      await waitFor(() => expect(mockNavigate).toHaveBeenCalled())

      expect(
        screen.queryByText(/No se pudo iniciar sesión/i)
      ).not.toBeInTheDocument()
    })
  })

  // ── Flujo de error ───────────────────────────────────────────────────────
  describe('Login fallido', () => {
    test('muestra mensaje de error si signInWithPopup falla', async () => {
      mockSignInWithPopup.mockRejectedValue(new Error('popup-closed'))

      renderLogin()
      fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/No se pudo iniciar sesión/i)
        ).toBeInTheDocument()
      })
    })

    test('NO navega a /home si hay error', async () => {
      mockSignInWithPopup.mockRejectedValue(new Error('popup-closed'))

      renderLogin()
      fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/No se pudo iniciar sesión/i)
        ).toBeInTheDocument()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    test('vuelve a habilitar el botón tras el error', async () => {
      mockSignInWithPopup.mockRejectedValue(new Error('popup-closed'))

      renderLogin()
      fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Continuar con Google/i })
        ).not.toBeDisabled()
      })
    })

    test('limpia el error anterior en cada nuevo intento', async () => {
      // 1er intento: falla
      mockSignInWithPopup.mockRejectedValueOnce(new Error('popup-closed'))
      // 2do intento: éxito
      mockSignInWithPopup.mockResolvedValueOnce({ user: { uid: '123' } })

      renderLogin()
      const btn = screen.getByRole('button', { name: /Continuar con Google/i })

      fireEvent.click(btn)
      await waitFor(() =>
        expect(screen.getByText(/No se pudo iniciar sesión/i)).toBeInTheDocument()
      )

      fireEvent.click(btn)
      await waitFor(() =>
        expect(screen.queryByText(/No se pudo iniciar sesión/i)).not.toBeInTheDocument()
      )
    })
  })
})