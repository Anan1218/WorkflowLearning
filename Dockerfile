# Stage 1: build the React frontend
FROM node:22-slim AS frontend
WORKDIR /app/web/frontend
COPY web/frontend/package*.json ./
RUN npm ci
COPY web/frontend ./
RUN npm run build

# Stage 2: Python API serving the built frontend
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
COPY evals ./evals
COPY web/api ./web/api
COPY web/__init__.py ./web/__init__.py
COPY data ./data-seed
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=frontend /app/web/frontend/dist ./web/frontend/dist
RUN chmod +x /docker-entrypoint.sh
EXPOSE 8000
CMD ["/docker-entrypoint.sh"]
