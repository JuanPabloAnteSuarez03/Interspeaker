from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

load_dotenv()

from routes.interview import interview_bp
from routes.stt import stt_bp
from routes.tts import tts_bp
from routes.evaluation import evaluation_bp


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
                "version": "1.0.0",
                "description": "API para simulacion de entrevistas tecnicas con STT, LLM (Gemini 2.5 Flash) y TTS."
            },
            "servers": [
                {"url": "http://127.0.0.1:5000"},
                {"url": "http://localhost:5000"}
            ],
            "paths": {
                "/": {
                    "get": {
                        "summary": "Health check del backend",
                        "responses": {"200": {"description": "Backend activo"}}
                    }
                },
                "/api/interview/start": {
                    "post": {"summary": "Inicia una sesion de entrevista y genera la primera pregunta"}
                },
                "/api/interview/next": {
                    "post": {"summary": "Genera la siguiente pregunta segun el contexto"}
                },
                "/api/stt/status": {
                    "get": {"summary": "Estado de la integracion Google Cloud STT"}
                },
                "/api/stt/transcribe": {
                    "post": {"summary": "Transcribe audio del usuario a texto"}
                },
                "/api/stt/transcripts/{session_id}": {
                    "get": {"summary": "Lista transcripciones temporales de la sesion"}
                },
                "/api/tts/synthesize": {
                    "post": {"summary": "Convierte texto en audio (voz del entrevistador)"}
                },
                "/api/evaluation/report": {
                    "post": {"summary": "Genera reporte final con metricas y feedback"}
                }
            }
        }
        return jsonify(spec)

    app.register_blueprint(interview_bp, url_prefix="/api/interview")
    app.register_blueprint(stt_bp, url_prefix="/api/stt")
    app.register_blueprint(tts_bp, url_prefix="/api/tts")
    app.register_blueprint(evaluation_bp, url_prefix="/api/evaluation")

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
