# Interspeaker

![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue)
![Backend](https://img.shields.io/badge/Backend-Flask%203.0-green)
![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-blueviolet)
![LLM](https://img.shields.io/badge/LLM-Gemini%202.5%20Flash-orange)

Aplicación inteligente para practicar entrevistas técnicas mediante voz, integrando Speech-to-Text, un Modelo de Lenguaje Grande (Gemini 2.5 Flash) y Text-to-Speech.

## Descripción

Interspeaker simula entrevistas técnicas reales en tiempo real:

- **STT** captura y transcribe la voz del usuario.
- **LLM (Gemini 2.5 Flash)** genera preguntas contextualizadas según área y nivel del candidato, y evalúa las respuestas.
- **TTS** convierte la respuesta del entrevistador en audio natural.

**Stack:**

- **Backend**: Flask + Python 3.11 + `google-genai` (Gemini 2.5 Flash) + `google-cloud-speech` + `google-cloud-texttospeech`
- **Frontend**: React 19 + Vite + React Router
- **Infra**: Docker, Docker Compose, Nginx, GitHub Actions (CI/CD)

## Inicio rápido con Docker

```bash
git clone <tu-repo>
cd Interspeaker

cp .env.example .env
# Edita .env con tu GEMINI_API_KEY

docker-compose up -d
docker-compose logs -f
```

- Frontend: <http://localhost:3100>
- Backend:  <http://localhost:5100>

### Comandos útiles (Makefile)

```bash
make help      # Lista de comandos
make up        # Levantar servicios (producción)
make up-dev    # Hot-reload (desarrollo)
make down      # Detener servicios
make logs      # Logs en vivo
make rebuild   # Reconstruir imágenes
```

## Desarrollo local (sin Docker)

### Backend

```bash
cd Backend
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt
flask run
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

## Estructura del proyecto

```
Interspeaker/
├── Backend/
│   ├── app.py                  # Flask app + blueprints
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── pytest.ini
│   ├── routes/                 # Endpoints HTTP
│   │   ├── interview.py        # /api/interview/* (Gemini)
│   │   ├── stt.py              # /api/stt/*       (Speech-to-Text)
│   │   ├── tts.py              # /api/tts/*       (Text-to-Speech)
│   │   └── evaluation.py       # /api/evaluation/* (reporte final)
│   ├── services/               # Integraciones externas
│   │   ├── gemini_service.py
│   │   ├── stt_service.py
│   │   └── tts_service.py
│   └── tests/                  # pytest + cobertura
├── Frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── layout/             # Layout + Header
│   │   ├── pages/              # home, setup, interview, results
│   │   ├── services/api.js     # cliente HTTP
│   │   └── __tests__/          # Jest + Testing Library
│   ├── public/
│   ├── Dockerfile              # build + nginx
│   ├── Dockerfile.dev          # hot-reload con Vite
│   ├── nginx.conf
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── jest.config.js
│   └── package.json
├── .github/workflows/
│   └── docker-ci.yml           # Pipeline CI/CD
├── docker-compose.yml
├── docker-compose.dev.yml
├── Makefile
├── .env.example
└── README.md
```

## Endpoints principales

| Método | Endpoint                  | Descripción                                  |
| ------ | ------------------------- | -------------------------------------------- |
| GET    | `/`                       | Health check                                 |
| GET    | `/api/openapi.json`       | Especificación OpenAPI                       |
| POST   | `/api/interview/start`    | Inicia entrevista y genera 1ª pregunta       |
| POST   | `/api/interview/next`     | Siguiente pregunta usando historial          |
| POST   | `/api/stt/transcribe`     | Transcribe audio del usuario (multipart)     |
| POST   | `/api/tts/synthesize`     | Genera audio MP3 de una pregunta             |
| POST   | `/api/evaluation/report`  | Reporte final con métricas y feedback        |

## Configuración

### 1. Variables de entorno

Copia `.env.example` a `.env` y completa:

- `GEMINI_API_KEY`: clave de Google AI Studio para Gemini 2.5 Flash.
- `GOOGLE_APPLICATION_CREDENTIALS`: ruta al service account JSON (para STT/TTS).
- `VITE_API_URL`: URL del backend que consume el frontend.

### 2. Credenciales de Google Cloud

Coloca el service account JSON en `Backend/google-credentials.json`. **No subir al repositorio** (ya excluido en `.gitignore`).

## CI/CD (GitHub Actions)

El pipeline `.github/workflows/docker-ci.yml` ejecuta:

1. **Backend** — lint con `flake8`, tests con `pytest`, cobertura a Codecov.
2. **Frontend** — lint con `eslint`, tests con `jest`, build con `vite`.
3. **Docker build** — construye imágenes del backend y frontend.
4. **Docker push** — publica en Docker Hub al hacer push a `main`.

Secrets requeridos en GitHub:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- (opcional) `CODECOV_TOKEN`

## Testing

```bash
# Backend
cd Backend && pytest

# Frontend
cd Frontend && npm test
```

## Equipo

| Nombre                  | Rol                                |
| ----------------------- | ---------------------------------- |
| Miguel Angel Escobar    | Product Owner / Scrum Master       |
| Alejandro Guerrero Cano | Desarrollador Frontend             |
| Cesar Alejandro Muñoz   | Desarrollador Backend              |
| Jean Paul Davalos       | Desarrollador Integración IA/APIs  |
| Juan Pablo Ante         | Desarrollador DevOps / Cloud       |
| Yenny Margot Rivas      | Documentación Técnica              |

## Licencia

Proyecto académico — Universidad.
