FROM minio/minio:latest

WORKDIR /app

COPY init.sh /init.sh
RUN chmod +x /init.sh
EXPOSE 9000 9001

ENTRYPOINT ["/init.sh"]