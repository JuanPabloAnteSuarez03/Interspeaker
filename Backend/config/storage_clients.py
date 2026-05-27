import os
import boto3
from google.cloud import firestore
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

iniciaFirestore = os.getenv("FLASK_ENV") == "production"

if iniciaFirestore:
    db = firestore.Client()
else:
    db = "No existe"

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