import { auth } from '../../firebase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function getFirebaseUid() {
  return auth.currentUser?.uid || null
}

function withUidHeader(headers = {}) {
  const uid = getFirebaseUid()
  if (!uid) return headers

  return {
    ...headers,
    'X-Firebase-UID': uid,
  }
}

function resolveSessionId(sessionId) {
  return sessionId || getFirebaseUid()
}

export async function startInterview(area, level) {
  const res = await fetch(`${API_URL}/api/interview/start`, {
    method: 'POST',
    headers: withUidHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ area, level, user_id: getFirebaseUid() }),
  })
  return res.json()
}

export async function nextQuestion(area, level, history) {
  const res = await fetch(`${API_URL}/api/interview/next`, {
    method: 'POST',
    headers: withUidHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ area, level, history, user_id: getFirebaseUid() }),
  })
  return res.json()
}

export async function transcribe(audioBlob, { language = 'es-ES', sessionId, questionIndex } = {}) {
  const form = new FormData()
  form.append('audio', audioBlob, 'answer.webm')
  form.append('language', language)
  const resolvedSessionId = resolveSessionId(sessionId)
  if (resolvedSessionId) form.append('user_id', resolvedSessionId)
  if (questionIndex != null) form.append('question_index', String(questionIndex))
  const res = await fetch(`${API_URL}/api/stt/transcribe`, { method: 'POST', headers: withUidHeader(), body: form })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || 'Error al transcribir')
    err.code = data.code
    err.status = res.status
    throw err
  }
  return data
}

export async function getSttStatus() {
  const res = await fetch(`${API_URL}/api/stt/status`, { headers: withUidHeader() })
  return res.json()
}

export async function getSessionTranscripts(sessionId = getFirebaseUid()) {
  const res = await fetch(`${API_URL}/api/stt/transcripts/${sessionId}`, { headers: withUidHeader() })
  return res.json()
}

export async function synthesize(text, voice) {
  const res = await fetch(`${API_URL}/api/tts/synthesize`, {
    method: 'POST',
    headers: withUidHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text, voice, user_id: getFirebaseUid() }),
  })
  return res.blob()
}

export async function getReport(area, level, transcripts) {
  const res = await fetch(`${API_URL}/api/evaluation/report`, {
    method: 'POST',
    headers: withUidHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ area, level, transcripts, user_id: getFirebaseUid() }),
  })
  return res.json()
}
