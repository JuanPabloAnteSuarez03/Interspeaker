import { auth } from '../../firebase'

function getApiUrl() {
  // En Jest/Node, process.env estará disponible
  if (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) {
    return process.env.VITE_API_URL
  }
  return 'http://localhost:5001'
}

const API_URL = getApiUrl()

function getFirebaseUid() {
  return auth.currentUser?.uid || null
}

// ──────────────────────────────────────────────────────────
// INTERVIEW ENDPOINTS
// ──────────────────────────────────────────────────────────

export async function startInterview(area, experience, voice = 'aura-2-diana-es') {
  const userId = getFirebaseUid()
  if (!userId) throw new Error('Usuario no autenticado')

  const res = await fetch(`${API_URL}/api/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      area,
      experience,
      voice,
    }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error iniciando entrevista')
  }

  return res.json()
}

export async function submitAnswer(sessionId, currentIndex, audioBlob) {
  const userId = getFirebaseUid()
  if (!userId) throw new Error('Usuario no autenticado')

  const form = new FormData()
  form.append('audio', audioBlob, 'answer.webm')
  form.append('user_id', userId)
  form.append('session_id', sessionId)
  form.append('current_index', String(currentIndex))

  const res = await fetch(`${API_URL}/api/interview/answer`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error enviando respuesta')
  }

  return res.json()
}

export async function evaluateInterview(sessionId, voice = 'aura-2-diana-es') {
  const userId = getFirebaseUid()
  if (!userId) throw new Error('Usuario no autenticado')

  console.log('📊 INICIANDO EVALUACIÓN:', {
    sessionId,
    userId,
    endpoint: `${API_URL}/api/interview/evaluate`,
  })

  const form = new FormData()
  form.append('user_id', userId)
  form.append('session_id', sessionId)
  form.append('voice', voice)

  const res = await fetch(`${API_URL}/api/interview/evaluate`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const error = await res.json()
    console.error('❌ EVALUACIÓN ERROR:', error)
    throw new Error(error.error || 'Error finalizando entrevista')
  }

  const result = await res.json()
  console.log('✅ EVALUACIÓN EXITOSA:', result)
  return result
}

export async function getUserInterviews() {
  const userId = getFirebaseUid()
  if (!userId) throw new Error('Usuario no autenticado')

  const res = await fetch(`${API_URL}/api/interview/user/${userId}/interviews`)

  if (!res.ok) {
    throw new Error('Error obteniendo historial')
  }

  return res.json()
}

export async function getUserInterview(sessionId) {
  const userId = getFirebaseUid()
  if (!userId) throw new Error('Usuario no autenticado')

  const res = await fetch(`${API_URL}/api/interview/user/${userId}/interviews/${sessionId}`)

  if (!res.ok) {
    throw new Error('Error obteniendo entrevista')
  }

  return res.json()
}

// ──────────────────────────────────────────────────────────
// STT (TRANSCRIPTION)
// ──────────────────────────────────────────────────────────

export async function getSttStatus() {
  const res = await fetch(`${API_URL}/api/stt/status`)

  if (!res.ok) {
    throw new Error('Error verificando STT')
  }

  return res.json()
}

export async function transcribe(audioBlob, language = 'es-ES') {
  const form = new FormData()
  form.append('audio', audioBlob, 'answer.webm')
  form.append('language', language)

  const res = await fetch(`${API_URL}/api/stt/transcribe`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al transcribir')
  }

  return res.json()
}

export async function getSessionTranscripts(sessionId) {
  const userId = getFirebaseUid()
  if (!userId) throw new Error('Usuario no autenticado')

  const res = await fetch(`${API_URL}/api/stt/transcripts/${sessionId}`)

  if (!res.ok) {
    throw new Error('Error obteniendo transcripciones')
  }

  return res.json()
}

// ──────────────────────────────────────────────────────────
// TTS (TEXT-TO-SPEECH)
// ──────────────────────────────────────────────────────────

export async function synthesize(text, voice = 'aura-2-diana-es') {
  const res = await fetch(`${API_URL}/api/tts/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })

  if (!res.ok) {
    throw new Error('Error sintetizando audio')
  }

  return res.blob()
}

// ──────────────────────────────────────────────────────────
// LLM STATUS
// ──────────────────────────────────────────────────────────

export async function getLlmStatus() {
  const res = await fetch(`${API_URL}/api/llm/status`)

  if (!res.ok) {
    throw new Error('Error verificando LLM')
  }

  return res.json()
}
