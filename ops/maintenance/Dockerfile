FROM node:22-bookworm-slim AS node
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
FROM postgres:18-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-boto3 python3-psycopg2 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY --from=node /app/node_modules ./node_modules
COPY . .
USER postgres
ENTRYPOINT ["python3", "ops/maintenance/prepare.py"]
