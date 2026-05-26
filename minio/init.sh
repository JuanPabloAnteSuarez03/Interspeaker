#!/bin/sh

echo "=== Iniciando MinIO Server ==="
/usr/bin/minio server /data --console-address ":9001" &
MINIO_PID=$!

echo "Esperando a que MinIO inicie..."
sleep 5

echo "=== Configurando MinIO Client ==="
mc alias set local http://localhost:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

echo "=== Creando bucket 'interspeaker' ==="
mc mb local/interspeaker --ignore-existing

echo "=== Configurando bucket público ==="
mc anonymous set public local/interspeaker

echo "=== Configurando CORS ==="
mc admin config set local api cors_allow_origin="*"

echo "=== Listo ==="

# Esperar a MinIO
wait $MINIO_PID