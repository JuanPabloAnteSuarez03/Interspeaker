import os
import boto3
from google.cloud import firestore
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

# Initialize Firestore with error handling for test environments
try:
    db = firestore.Client()
except Exception as e:
    # In testing environments without credentials, use a None placeholder
    if os.getenv("TESTING"):
        db = None
    else:
        raise

s3_client = boto3.client(
    "s3",
    endpoint_url=os.getenv("STORAGE_ENDPOINT"),
    aws_access_key_id=os.getenv("STORAGE_ROOT_USER"),
    aws_secret_access_key=os.getenv("STORAGE_ROOT_PASSWORD"),
    config=Config(signature_version="s3v4"),
    region_name="us-east-1"
)

BUCKET_NAME = os.getenv("STORAGE_BUCKET_NAME")