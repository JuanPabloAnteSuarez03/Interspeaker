from __future__ import annotations

import base64
import logging
import threading
from flask import Blueprint, jsonify, request
from google.cloud import firestore
from config.storage_clients import db, s3_client, BUCKET_NAME
from services.gemini_service import generate_interview_questions, evaluate_interview_full
from services.tts_service import synthesize_speech, TTSError
from services.stt_service import transcribe_audio

logger = logging.getLogger(__name__)
interview_bp = Blueprint("interview", __name__)

def validate_user_id(user_id: str) -> bool:
    """Validar que el user_id existe en Firestore"""
    if not user_id or not user_id.strip():
        return False

    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:

        user_ref.set({
            "user_id": user_id,
            "total_interviews": 0
        })
    
    return True

def _upload_audio_to_s3(audio_bytes: bytes, s3_path: str) -> str:
    """Subir audio a S3"""
    s3_client.put_object(
        Bucket=BUCKET_NAME,
        Key=s3_path,
        Body=audio_bytes,
        ContentType="audio/mpeg"
    )
    endpoint = s3_client.meta.endpoint_url
    return f"{endpoint}/{BUCKET_NAME}/{s3_path}"

def _background_tts_processing(user_id: str, session_id: str, questions_data: list, voice: str):
    """Generar audios en segundo plano"""
    try:
        updated_questions = list(questions_data)
        
        for i in range(1, len(updated_questions)):
            text_to_speak = updated_questions[i]["question_text"]
            try:
                audio_bytes = synthesize_speech(text=text_to_speak, voice=voice)
                s3_path = f"Proyecto/AudioUsuarios/{user_id}/{session_id}/question_{i}.mp3"
                audio_url = _upload_audio_to_s3(audio_bytes, s3_path)
                updated_questions[i]["audio_url"] = audio_url
                
            except Exception as e:
                logger.error(f"Error procesando pregunta {i}: {e}")
        
        interview_ref = db.collection("users").document(user_id).collection("interviews").document(session_id)
        interview_ref.update({
            "questions": updated_questions
        })
        
        logger.info(f"TTS completado para sesión {session_id}")
        
    except Exception as e:
        logger.error(f"Error crítico en TTS: {e}")

def _clean_user_audios(user_id: str):
    """Limpiar audios temporales"""
    try:
        prefix = f"Proyecto/AudioUsuarios/{user_id}/"
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
        
        if "Contents" in response:
            objects_to_delete = [{"Key": obj["Key"]} for obj in response["Contents"]]
            s3_client.delete_objects(
                Bucket=BUCKET_NAME,
                Delete={"Objects": objects_to_delete}
            )
            logger.info(f"Audios limpiados para usuario: {user_id}")
    except Exception as e:
        logger.error(f"Error limpiando audios: {e}")


@interview_bp.route("/start", methods=["POST"])
def start_interview():
    """
    Inicia la entrevista - Usa user_id del body
    """
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id", "").strip()
    area = data.get("area", "").strip()
    experience = data.get("experience", "").strip()
    voice = data.get("voice", "aura-2-diana-es")
    
    if not user_id:
        return jsonify({"error": "Se requiere user_id"}), 400
    
    if not validate_user_id(user_id):
        return jsonify({"error": "Usuario no válido"}), 400
    
    if not area or not experience:
        return jsonify({"error": "Faltan campos: area o experience"}), 400
    
    try:
        raw_questions = generate_interview_questions(
            area=area,
            experience=experience
        )
        if isinstance(raw_questions, str):
            raw_questions = [raw_questions]
            
    except Exception as e:
        return jsonify({"error": f"Error al generar preguntas: {str(e)}"}), 500

    questions_list = []
    for idx, q_text in enumerate(raw_questions):
        questions_list.append({
            "index": idx,
            "question_text": q_text,
            "answer_text": None,
            "audio_url": None
        })

    interviews_ref = db.collection("users").document(user_id).collection("interviews")
    session_ref = interviews_ref.document()
    session_id = session_ref.id

    interview_data = {
        "user_id": user_id,
        "area": area,
        "experience": experience,
        "status": "in_progress",
        "current_question_index": 0,
        "questions": questions_list,
        "evaluation_text": None,
        "evaluation_audio_url": None,
        "evaluation_score": None,
        "evaluation_categories": None,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
        "completed_at": None,
        "total_questions": len(questions_list),
        "answered_questions": 0
    }
    
    session_ref.set(interview_data)
    
    user_ref = db.collection("users").document(user_id)
    user_ref.update({
        "total_interviews": firestore.Increment(1),
    })
    
    db.collection("interviews_global").document(session_id).set({
        "user_id": user_id,
        "session_id": session_id,
    })

    first_question_text = questions_list[0]["question_text"]
    first_audio_b64 = ""
    try:
        audio_bytes = synthesize_speech(text=first_question_text, voice=voice)
        first_audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        logger.error(f"Error generando audio: {e}")

    threading.Thread(
        target=_background_tts_processing,
        args=(user_id, session_id, questions_list, voice)
    ).start()

    return jsonify({
        "session_id": session_id,
        "user_id": user_id,
        "current_index": 0,
        "total_questions": len(questions_list),
        "question": first_question_text,
        "audio_base64": first_audio_b64,
        "questions_metadata": [
            {"index": q["index"], "question_text": q["question_text"]} 
            for q in questions_list
        ]
    }), 200


@interview_bp.route("/answer", methods=["POST"])
def submit_answer():
    """
    Recibe respuesta del usuario - Usa user_id del form
    """
    if "audio" not in request.files:
        return jsonify({"error": "Falta archivo de audio"}), 400
    
    user_id = request.form.get("user_id", "").strip()
    session_id = request.form.get("session_id", "").strip()
    current_index = request.form.get("current_index")
    
    if not user_id or not session_id or current_index is None:
        return jsonify({"error": "Faltan campos: user_id, session_id o current_index"}), 400
    
    current_index = int(current_index)
    
    interview_ref = db.collection("users").document(user_id).collection("interviews").document(session_id)
    doc = interview_ref.get()
    
    if not doc.exists:
        return jsonify({"error": "Entrevista no encontrada o no autorizada"}), 404
    
    interview_data = doc.to_dict()
    questions = interview_data.get("questions", [])
    
    if current_index >= len(questions):
        return jsonify({"error": "Índice de pregunta inválido"}), 400
    
    audio_file = request.files["audio"]
    
    try:
        transcript = transcribe_audio(
            audio_file.read(),
            filename=audio_file.filename or "answer.webm",
            content_type=audio_file.content_type
        )
        
        questions[current_index]["answer_text"] = transcript
        
        next_index = current_index + 1
        answered_count = len([q for q in questions if q.get("answer_text")])
        
        interview_ref.update({
            "questions": questions,
            "current_question_index": next_index,
            "answered_questions": answered_count,
            "updated_at": firestore.SERVER_TIMESTAMP
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
            "next_audio_url": next_audio_url,
            "completed_percentage": (answered_count / len(questions)) * 100
        }), 200
        
    except Exception as e:
        logger.error(f"Error procesando respuesta: {e}")
        return jsonify({"error": f"Error procesando audio: {str(e)}"}), 422

@interview_bp.route("/evaluate", methods=["POST"])
def evaluate_and_finish():
    """
    Evalúa la entrevista completa
    """
    user_id = request.form.get("user_id", "").strip()
    session_id = request.form.get("session_id", "").strip()
    current_index = request.form.get("current_index")
    voice = request.form.get("voice", "aura-2-diana-es")
    
    if not user_id or not session_id or current_index is None:
        return jsonify({"error": "Faltan campos: user_id, session_id o current_index"}), 400
    
    if "audio" not in request.files:
        return jsonify({"error": "Falta archivo de audio"}), 400
    
    current_index = int(current_index)
    
    interview_ref = db.collection("users").document(user_id).collection("interviews").document(session_id)
    doc = interview_ref.get()
    
    if not doc.exists:
        return jsonify({"error": "Entrevista no encontrada"}), 404
    
    interview_data = doc.to_dict()
    questions = interview_data.get("questions", [])
    
    audio_file = request.files["audio"]
    
    try:
        last_transcript = transcribe_audio(
            audio_file.read(),
            filename=audio_file.filename or "answer.webm",
            content_type=audio_file.content_type
        )
        
        questions[current_index]["answer_text"] = last_transcript
        answered_count = len([q for q in questions if q.get("answer_text")])
        
        interview_ref.update({
            "questions": questions,
            "answered_questions": answered_count
        })
        
    except Exception as e:
        return jsonify({"error": f"Error procesando audio: {str(e)}"}), 422
    
    try:
        evaluation_result = evaluate_interview_full(
            area=interview_data["area"],
            experience=interview_data["experience"],
            qa_pairs=questions
        )
        
        if isinstance(evaluation_result, dict):
            evaluation_text = evaluation_result.get("text", str(evaluation_result))
            evaluation_score = evaluation_result.get("score")
            evaluation_categories = evaluation_result.get("categories")
        else:
            evaluation_text = str(evaluation_result)
            evaluation_score = None
            evaluation_categories = None
            
    except Exception as e:
        return jsonify({"error": f"Error generando evaluación: {str(e)}"}), 500

    feedback_audio_url = None
    try:
        feedback_bytes = synthesize_speech(text=evaluation_text, voice=voice)
        feedback_s3_path = f"Proyecto/Evaluaciones/{user_id}/{session_id}_feedback.mp3"
        feedback_audio_url = _upload_audio_to_s3(feedback_bytes, feedback_s3_path)
    except Exception as e:
        logger.error(f"Error generando audio feedback: {e}")

    interview_ref.update({
        "status": "completed",
        "evaluation_text": evaluation_text,
        "evaluation_audio_url": feedback_audio_url,
        "evaluation_score": evaluation_score,
        "evaluation_categories": evaluation_categories,
        "completed_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    
    _clean_user_audios(user_id)
    
    return jsonify({
        "status": "completed",
        "evaluation_text": evaluation_text,
        "evaluation_audio_url": feedback_audio_url,
        "evaluation_score": evaluation_score
    }), 200

@interview_bp.route("/user/<user_id>/interviews", methods=["GET"])
def get_user_interviews(user_id):
    """
    Obtener historial de entrevistas de un usuario
    """
    if not user_id:
        return jsonify({"error": "Se requiere user_id"}), 400

    user_ref = db.collection("users").document(user_id)
    if not user_ref.get().exists:
        return jsonify({"error": "Usuario no encontrado"}), 404
    
    interviews_ref = db.collection("users").document(user_id).collection("interviews")
    interviews = interviews_ref.order_by("created_at", direction=firestore.Query.DESCENDING).get()
    
    result = []
    for interview in interviews:
        data = interview.to_dict()
        result.append({
            "session_id": interview.id,
            "area": data.get("area"),
            "experience": data.get("experience"),
            "status": data.get("status"),
            "score": data.get("evaluation_score"),
            "total_questions": data.get("total_questions"),
            "answered_questions": data.get("answered_questions", 0),
            "completed_at": data.get("completed_at"),
            "created_at": data.get("created_at")
        })
    
    return jsonify({
        "user_id": user_id,
        "total_interviews": len(result),
        "interviews": result
    }), 200

@interview_bp.route("/user/<user_id>/interviews/<session_id>", methods=["GET"])
def get_user_interview_by_session(user_id, session_id):
    """
    Obtener una entrevista específica de un usuario por session_id
    """
    if not user_id:
        return jsonify({"error": "Se requiere user_id"}), 400
    
    if not session_id:
        return jsonify({"error": "Se requiere session_id"}), 400

    user_ref = db.collection("users").document(user_id)
    if not user_ref.get().exists:
        return jsonify({"error": "Usuario no encontrado"}), 404
    
    interview_ref = db.collection("users").document(user_id).collection("interviews").document(session_id)
    interview_doc = interview_ref.get()
    
    if not interview_doc.exists:
        return jsonify({"error": "Entrevista no encontrada para este usuario"}), 404
    
    data = interview_doc.to_dict()

    questions_list = []
    if data.get("questions"):
        for q in data.get("questions", []):
            question_data = {
                "index": q.get("index"),
                "question_text": q.get("question_text"),
                "answer_text": q.get("answer_text"),
                "audio_url": q.get("audio_url")
            }
            questions_list.append(question_data)
    
    response = {
        "session_id": session_id,
        "user_id": data.get("user_id"),
        "area": data.get("area"),
        "experience": data.get("experience"),
        "status": data.get("status"),
        "score": data.get("evaluation_score"),
        "total_questions": data.get("total_questions"),
        "answered_questions": data.get("answered_questions", 0),
        "current_question_index": data.get("current_question_index", 0),
        "questions": questions_list,
        "started_at": data.get("started_at"),
        "completed_at": data.get("completed_at"),
        "created_at": data.get("created_at"),
        "updated_at": data.get("updated_at")
    }
    
    if data.get("evaluation_audio_url"):
        response["evaluation_audio_url"] = data.get("evaluation_audio_url")
    
    if data.get("evaluation_categories"):
        response["evaluation_categories"] = data.get("evaluation_categories")
    
    if data.get("evaluation_text"):
        response["evaluation_text"] = data.get("evaluation_text")
    
    return jsonify(response), 200
