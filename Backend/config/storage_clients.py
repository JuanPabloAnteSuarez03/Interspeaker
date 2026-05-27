import os
import json
import boto3
from google.cloud import firestore
from botocore.client import Config
from dotenv import load_dotenv
from pathlib import Path
import firebase_admin
from firebase_admin import credentials

load_dotenv()

def get_db():
    try:
        if not firebase_admin._apps:
            service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            google_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

            if service_account_json:
                cred = credentials.Certificate(json.loads(service_account_json))
            elif google_credentials_path:
                cred = credentials.Certificate(google_credentials_path)
            else:
                BASE_DIR = Path(__file__).resolve().parent.parent
                SERVICE_ACCOUNT_FILE = BASE_DIR / "interspeaker.json"
                cred = credentials.Certificate(str(SERVICE_ACCOUNT_FILE))
            
            firebase_admin.initialize_app(cred)
        
        return firestore.Client()
    except Exception as e:
        if os.getenv("TESTING"):
            return None
        else:
            raise

db = get_db()

s3_client = boto3.client(
    "s3",
    endpoint_url=os.getenv("STORAGE_ENDPOINT"),
    aws_access_key_id=os.getenv("STORAGE_ROOT_USER"),
    aws_secret_access_key=os.getenv("STORAGE_ROOT_PASSWORD"),
    config=Config(signature_version="s3v4"),
    region_name="auto"
)

BUCKET_NAME = os.getenv("STORAGE_BUCKET_NAME")
PUBLIC_URL_BASE = os.getenv("STORAGE_PUBLIC_URL")