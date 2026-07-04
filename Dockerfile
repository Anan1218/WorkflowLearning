# Stage 1: build the React frontend
FROM node:22-slim AS frontend
WORKDIR /build/apps/web
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web ./
RUN npm run build

# Stage 2: Python API serving the built frontend
FROM python:3.12-slim
WORKDIR /app
COPY packages ./packages
COPY apps/api ./apps/api
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY data ./data-seed
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=frontend /build/apps/web/dist ./apps/web/dist
RUN chmod +x /docker-entrypoint.sh
EXPOSE 8000
CMD ["/docker-entrypoint.sh"]
