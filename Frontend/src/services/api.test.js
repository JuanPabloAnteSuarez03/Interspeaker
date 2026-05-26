import { startInterview } from './api'
import { auth } from '../../firebase'

jest.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      uid: 'firebase-uid-123',
    },
  },
}))

describe('api session identity', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('sends Firebase UID as user_id and request header', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ question: 'ok' }),
    })

    await startInterview('frontend', 'senior')

    expect(auth.currentUser.uid).toBe('firebase-uid-123')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/interview/start'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-UID': 'firebase-uid-123',
        },
        body: JSON.stringify({
          area: 'frontend',
          level: 'senior',
          user_id: 'firebase-uid-123',
        }),
      }),
    )
  })
})