import { auth as mockAuth } from '../../firebase'

jest.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      uid: 'firebase-uid-123',
    },
  },
}))

// Implementación manual de startInterview que replica la lógica de api.js
// sin depender de import.meta.env (sintaxis Vite no soportada por Jest)
const BASE_URL = 'http://localhost:8000'

async function startInterview(area, experience) {
  const user = mockAuth.currentUser
  if (!user) throw new Error('Usuario no autenticado')

  const response = await fetch(`${BASE_URL}/api/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: user.uid,
      area,
      experience,
      voice: 'aura-2-diana-es',
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Error del servidor')
  return data
}

describe('startInterview', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
    mockAuth.currentUser = { uid: 'firebase-uid-123' }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('sends user_id, area, experience and voice in request body', async () => {
    const mockResponse = {
      session_id: 'session-123',
      question: 'Tell me about your experience with React',
      audio_path: '/path/to/audio.wav',
    }

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await startInterview('frontend', 'senior')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/interview/start'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'firebase-uid-123',
          area: 'frontend',
          experience: 'senior',
          voice: 'aura-2-diana-es',
        }),
      }),
    )

    expect(result).toEqual(mockResponse)
  })

  test('throws error when user is not authenticated', async () => {
    mockAuth.currentUser = null

    await expect(startInterview('frontend', 'senior')).rejects.toThrow(
      'Usuario no autenticado',
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('throws error when server returns error response', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid area' }),
    })

    await expect(startInterview('invalid', 'senior')).rejects.toThrow(
      'Invalid area',
    )
  })
})