import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

// Mock Firebase
jest.mock('../firebase', () => ({
  auth: {},
  googleProvider: {},
}))

jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: () => [null, false],
}))

jest.mock('../services/api', () => ({
  startInterview: jest.fn(),
  submitAnswer: jest.fn(),
  evaluateInterview: jest.fn(),
  getUserInterview: jest.fn(),
  getUserInterviews: jest.fn(),
}))

test('muestra la marca en el encabezado', () => {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByText('Interspeaker')).toBeInTheDocument()
})