from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

load_dotenv()

from routes.interview import interview_bp
from routes.stt import stt_bp
from routes.tts import tts_bp
from routes.evaluation import evaluation_bp
from routes.llm import llm_bp


def create_app():
    app = Flask(__name__)
    CORS(app)

    @app.route("/")
    def home():
        return {"message": "Interspeaker backend funcionando"}

    @app.route("/api/openapi.json")
    def openapi_spec():
        spec = {
            "openapi": "3.0.3",
            "info": {
                "title": "Interspeaker Backend API",
                "version": "1.2.0",
                "description": "API para simulacion de entrevistas tecnicas con Deepgram (STT/TTS) y Gemini 2.5 Flash (LLM). HU16 integrada."
            },
            "servers": [
                {"url": "http://localhost:5100", "description": "Local environment"},
                {"url": "http://127.0.0.1:5000", "description": "Local direct Flask"}
            ],
            "paths": {
                "/api/llm/status": {
                    "get": {
                        "summary": "Verifica conexion con el LLM",
                        "responses": {
                            "200": {"description": "LLM conectado correctamente"},
                            "503": {"description": "Error de conexion con el LLM"}
                        }
                    }
                },
                "/api/llm/metrics/{session_id}": {
                    "get": {
                        "summary": "Metricas de consumo y latencia del LLM por sesion",
                        "parameters": [{"name": "session_id", "in": "path", "required": True, "schema": {"type": "string"}}],
                        "responses": {"200": {"description": "Resumen de metricas"}}
                    }
                },
                "/api/interview/start": {
                    "post": {
                        "summary": "Inicia una sesion de entrevista",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "area": {"type": "string"},
                                            "level": {"type": "string"},
                                            "session_id": {"type": "string"},
                                            "include_audio": {"type": "boolean"},
                                            "voice": {"type": "string"}
                                        },
                                        "required": ["area"]
                                    }
                                }
                            }
                        },
                        "responses": {"200": {"description": "Primera pregunta generada"}}
                    }
                },
                "/api/interview/next": {
                    "post": {
                        "summary": "Genera la siguiente pregunta con historial",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "area": {"type": "string"},
                                            "level": {"type": "string"},
                                            "history": {"type": "array"},
                                            "session_id": {"type": "string"},
                                            "include_audio": {"type": "boolean"}
                                        },
                                        "required": ["area"]
                                    }
                                }
                            }
                        },
                        "responses": {"200": {"description": "Siguiente pregunta generada"}}
                    }
                },
                "/api/evaluation/report": {
                    "post": {
                        "summary": "Genera reporte de evaluacion con retroalimentacion estructurada",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "area": {"type": "string"},
                                            "level": {"type": "string"},
                                            "transcripts": {"type": "array"},
                                            "session_id": {"type": "string"}
                                        },
                                        "required": ["area", "transcripts"]
                                    }
                                }
                            }
                        },
                        "responses": {"200": {"description": "Reporte con score y feedback"}}
                    }
                },
                "/api/stt/transcribe": {
                    "post": {
                        "summary": "Transcribe audio usando Deepgram",
                        "requestBody": {
                            "content": {
                                "multipart/form-data": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "audio": {"type": "string", "format": "binary"},
                                            "language": {"type": "string"},
                                            "session_id": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        },
                        "responses": {"200": {"description": "Texto transcrito"}}
                    }
                },
                "/api/tts/synthesize": {
                    "post": {
                        "summary": "Convierte texto a audio usando Deepgram Aura",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "text": {"type": "string"},
                                            "voice": {"type": "string", "default": "aura-2-diana-es"}
                                        }
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "Audio MP3",
                                "content": {"audio/mpeg": {"schema": {"type": "string", "format": "binary"}}}
                            }
                        }
                    }
                }
            }
        }
        return jsonify(spec)

    @app.route("/api/docs")
    def swagger_ui():
        html = """
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>API Docs - Interspeaker</title>
            <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css">
            <style>body { margin: 0; padding: 0; background-color: #fafafa; }</style>
        </head>
        <body>
            <div id="swagger-ui"></div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js"></script>
            <script>
                window.onload = function() {
                    SwaggerUIBundle({
                        url: "/api/openapi.json",
                        dom_id: '#swagger-ui',
                        deepLinking: true,
                        presets: [
                            SwaggerUIBundle.presets.apis,
                            SwaggerUIBundle.SwaggerUIStandalonePreset
                        ],
                    });
                }
            </script>
        </body>
        </html>
        """
        return html

    app.register_blueprint(interview_bp, url_prefix="/api/interview")
    app.register_blueprint(stt_bp, url_prefix="/api/stt")
    app.register_blueprint(tts_bp, url_prefix="/api/tts")
    app.register_blueprint(evaluation_bp, url_prefix="/api/evaluation")
    app.register_blueprint(llm_bp, url_prefix="/api/llm")

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
