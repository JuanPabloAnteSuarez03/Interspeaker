const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export async function startInterview(area, level) {
  const res = await fetch(`${API_URL}/api/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ area, level }),
  })
  return res.json()
}

export async function nextQuestion(area, level, history) {
  const res = await fetch(`${API_URL}/api/interview/next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ area, level, history }),
  })
  return res.json()
}

export async function transcribe(audioBlob, { language = 'es-ES', sessionId, questionIndex } = {}) {
  const form = new FormData()
  form.append('audio', audioBlob, 'answer.webm')
  form.append('language', language)
  if (sessionId) form.append('session_id', sessionId)
  if (questionIndex != null) form.append('question_index', String(questionIndex))
  const res = await fetch(`${API_URL}/api/stt/transcribe`, { method: 'POST', body: form })
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
  const res = await fetch(`${API_URL}/api/stt/status`)
  return res.json()
}

export async function getSessionTranscripts(sessionId) {
  const res = await fetch(`${API_URL}/api/stt/transcripts/${sessionId}`)
  return res.json()
}

export async function synthesize(text, voice) {
  const res = await fetch(`${API_URL}/api/tts/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
  return res.blob()
}

export async function getReport(area, level, transcripts) {
  const res = await fetch(`${API_URL}/api/evaluation/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ area, level, transcripts }),
  })
  return res.json()
}
