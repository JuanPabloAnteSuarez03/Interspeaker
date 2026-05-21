# Google Cloud Speech-to-Text (IN-61)

## Pasos

1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Activar la API **Cloud Speech-to-Text**.
3. Crear cuenta de servicio con rol **Cloud Speech Client** (o Editor en entorno de prueba).
4. Descargar JSON y guardarlo como `Backend/google-credentials.json` (no subir a Git).
5. En `.env`:

```env
GOOGLE_APPLICATION_CREDENTIALS=Backend/google-credentials.json
STT_LANGUAGE_CODE=es-ES
```

6. Verificar: `GET http://localhost:5100/api/stt/status` → `"mode": "live"`.

### Si ves 404 en `/api/stt/status`

La imagen Docker del backend se construye **al hacer build**: si añadiste rutas nuevas, hay que **reconstruir**:

```bash
docker compose build backend --no-cache
docker compose up -d
```

Comprueba que responde el contenedor correcto: `GET http://localhost:5100/` debe devolver
`{"message":"Interspeaker backend funcionando"}`.

En modo stub, en `.env` (raíz del repo) deja `SKIP_STT=1`.
Docker Compose lee ese `.env` para sustituir variables en `docker-compose.yml` (por ejemplo `SKIP_STT`).

## Endpoints

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/stt/status` | ¿Está configurado STT? |
| POST | `/api/stt/transcribe` | `audio` (file), `language`, `session_id`, `question_index` |
| GET | `/api/stt/transcripts/<session_id>` | Transcripciones guardadas en memoria |

## Frontend

`Frontend/src/services/api.js` ya envía `POST /api/stt/transcribe` con `answer.webm`. Falta conectar `MediaRecorder` en `Interview.jsx`.
