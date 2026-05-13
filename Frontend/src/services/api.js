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

export async function transcribe(audioBlob, language = 'es-ES') {
  const form = new FormData()
  form.append('audio', audioBlob, 'answer.webm')
  form.append('language', language)
  const res = await fetch(`${API_URL}/api/stt/transcribe`, { method: 'POST', body: form })
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
