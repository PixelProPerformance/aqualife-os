FROM postgres:18-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-boto3 python3-psycopg2 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY ops/backup/backup.py /opt/aqualife/backup.py
USER postgres
ENTRYPOINT ["python3", "/opt/aqualife/backup.py"]
