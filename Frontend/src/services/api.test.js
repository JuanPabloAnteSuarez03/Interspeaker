/* global require, global */
import { startInterview } from './api'

const mockAuth = require('../../firebase').auth

jest.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      uid: 'firebase-uid-123',
    },
  },
}))

describe('startInterview', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
    // Restaurar auth antes de cada test
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