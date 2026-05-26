from __future__ import annotations

import base64
import logging
import threading
from flask import Blueprint, jsonify, request

from config.storage_clients import db, s3_client, BUCKET_NAME
from services.gemini_service import generate_interview_questions, evaluate_interview_full
from services.tts_service import synthesize_speech, TTSError
from services.stt_service import transcribe_audio

logger = logging.getLogger(__name__)
interview_bp = Blueprint("interview", __name__)

def _upload_audio_to_s3(audio_bytes: bytes, s3_path: str) -> str:
    s3_client.put_object(
        Bucket=BUCKET_NAME,
        Key=s3_path,
        Body=audio_bytes,
        ContentType="audio/mpeg"
    )
    endpoint = s3_client.meta.endpoint_url
    return f"{endpoint}/{BUCKET_NAME}/{s3_path}"

def _background_tts_processing(session_id: str, user_id: str, questions_data: list, voice: str):
    try:
        updated_questions = list(questions_data)
        
        for i in range(1, len(updated_questions)):
            text_to_speak = updated_questions[i]["question_text"]
            try:
                audio_bytes = synthesize_speech(text=text_to_speak, voice=voice)

                audio_id = i
                s3_path = f"Proyecto/AudioUsuarios/{user_id}/{audio_id}.mp3"
                
                audio_url = _upload_audio_to_s3(audio_bytes, s3_path)
                updated_questions[i]["audio_url"] = audio_url
                
            except Exception as e:
                logger.error(f"Error procesando audio de pregunta {i}: {e}")
        
        db.collection("interviews").document(session_id).update({
            "questions": updated_questions
        })
        logger.info(f"TTS completado para sesión {session_id}")
    except Exception as e:
        logger.error(f"Error crítico en hilo TTS: {e}")

def _clean_user_audios(user_id: str):
    try:
        prefix = f"Proyecto/AudioUsuarios/{user_id}/"
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
        
        if "Contents" in response:
            objects_to_delete = [{"Key": obj["Key"]} for obj in response["Contents"]]
            s3_client.delete_objects(
                Bucket=BUCKET_NAME,
                Delete={"Objects": objects_to_delete}
            )
            logger.info(f"Audios temporales eliminados en MinIO para el usuario: {user_id}")
    except Exception as e:
        logger.error(f"No se pudieron eliminar los archivos temporales de audio: {e}")


@interview_bp.route("/start", methods=["POST"])
def start_interview():
    """
    Inicia la entrevista, genera las N preguntas iniciales, guarda el molde en 
    Firestore, despacha el audio 1 en Base64 e inicializa el hilo del resto.
    """
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id", "").strip()
    area = data.get("area", "").strip()
    experience = data.get("experience", "").strip()
    voice = data.get("voice", "aura-2-diana-es")
    
    if not user_id or not area or not experience:
        return jsonify({"error": "Faltan campos requeridos: user_id, area o experience"}), 400
    try:
        raw_questions = generate_interview_questions(
            area=area,
            experience=experience
        )
        if isinstance(raw_questions, str):
            raw_questions = [raw_questions]
    except Exception as e:
        return jsonify({"error": f"Error al generar preguntas con el LLM: {str(e)}"}), 500

    questions_list = []
    for idx, q_text in enumerate(raw_questions):
        questions_list.append({
            "index": idx,
            "question_text": q_text,
            "answer_text": None
        })

    session_ref = db.collection("interviews").document()
    session_id = session_ref.id
    
    session_ref.set({
        "user_id": user_id,
        "area": area,
        "experience": experience,
        "status": "in_progress",
        "current_question_index": 0,
        "questions": questions_list,
        "evaluation_text": None,
        "evaluation_audio_url": None
    })

    first_question_text = questions_list[0]["question_text"]
    first_audio_b64 = ""
    try:
        audio_bytes = synthesize_speech(text=first_question_text, voice=voice)
        first_audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        logger.error(f"Fallo TTS de primera pregunta: {e}")

    threading.Thread(
        target=_background_tts_processing,
        args=(session_id, user_id, questions_list, voice)
    ).start()

    return jsonify({
        "session_id": session_id,
        "current_index": 0,
        "total_questions": len(questions_list),
        "question": first_question_text,
        "audio_base64": first_audio_b64,
        "questions_metadata": [
            {"index": q["index"], "question_text": q["question_text"]} for q in questions_list
        ]
    }), 200


@interview_bp.route("/answer", methods=["POST"])
def submit_answer():
    """
    Recibe el archivo de audio de la respuesta actual paso a paso, 
    lo traduce a STT y lo guarda en su respectivo bloque de Firestore.
    """
    if "audio" not in request.files:
        return jsonify({"error": "Falta archivo de audio"}), 400
        
    session_id = request.form.get("session_id")
    current_index = int(request.form.get("current_index", 0))
    audio_file = request.files["audio"]
    
    if not session_id:
        return jsonify({"error": "Falta session_id"}), 400

    doc_ref = db.collection("interviews").document(session_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "Sesión no encontrada"}), 404
        
    interview_data = doc.to_dict()
    questions = interview_data["questions"]

    try:
        transcript = transcribe_audio(
            audio_file.read(),
            filename=audio_file.filename or "answer.webm",
            content_type=audio_file.content_type
        )
    except Exception as e:
        return jsonify({"error": f"Error en procesamiento de audio (STT): {str(e)}"}), 422

    questions[current_index]["answer_text"] = transcript

    next_index = current_index + 1
    doc_ref.update({
        "questions": questions,
        "current_question_index": next_index
    })

    has_more = next_index < len(questions)
    next_audio_url = None
    if has_more:
        next_audio_url = questions[next_index].get("audio_url")

    return jsonify({
        "success": True,
        "transcript": transcript,
        "next_index": next_index,
        "has_more": has_more,
        "next_audio_url": next_audio_url
    }), 200


@interview_bp.route("/evaluate", methods=["POST"])
def evaluate_and_finish():
    """
    Acción final: Procesa la última respuesta, evalúa todo, genera feedback TTS, limpia audios.
    """
    session_id = request.form.get("session_id")
    current_index = request.form.get("current_index")
    voice = request.form.get("voice", "aura-2-diana-es")
    
    if not session_id or current_index is None:
        return jsonify({"error": "Faltan parámetros: session_id o current_index"}), 400
    
    if "audio" not in request.files:
        return jsonify({"error": "Falta archivo de audio"}), 400

    current_index = int(current_index)
    doc_ref = db.collection("interviews").document(session_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return jsonify({"error": "Sesión inválida"}), 404

    interview_data = doc.to_dict()
    user_id = interview_data["user_id"]
    questions = interview_data["questions"]

    audio_file = request.files["audio"]
    try:
        last_transcript = transcribe_audio(
            audio_file.read(),
            filename=audio_file.filename or "answer.webm",
            content_type=audio_file.content_type
        )
        questions[current_index]["answer_text"] = last_transcript
        
        doc_ref.update({
            "questions": questions,
            "current_question_index": current_index + 1
        })

        interview_data = doc_ref.get().to_dict()
        questions = interview_data["questions"]
        
    except Exception as e:
        return jsonify({"error": f"Error al procesar último audio: {str(e)}"}), 422

    try:
        evaluation_feedback = evaluate_interview_full(
            area=interview_data["area"],
            experience=interview_data["experience"],
            qa_pairs=questions
        )
    except Exception as e:
        return jsonify({"error": f"Error al generar evaluación: {str(e)}"}), 500

    feedback_audio_url = None
    try:
        feedback_bytes = synthesize_speech(text=evaluation_feedback, voice=voice)
        feedback_s3_path = f"Proyecto/Evaluaciones/{user_id}/{session_id}_feedback.mp3"
        feedback_audio_url = _upload_audio_to_s3(feedback_bytes, feedback_s3_path)
    except Exception as e:
        logger.error(f"Error generando audio de feedback: {e}")

    doc_ref.update({
        "status": "completed",
        "evaluation_text": evaluation_feedback,
        "evaluation_audio_url": feedback_audio_url
    })

    _clean_user_audios(user_id)

    return jsonify({
        "status": "completed",
        "evaluation_text": evaluation_feedback,
        "evaluation_audio_url": feedback_audio_url
    }), 200