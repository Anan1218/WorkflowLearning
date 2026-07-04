# Stage 1: build the React frontend (used by the local `full` target only;
# in production Vercel owns the frontend and Fly runs the `api` target)
FROM node:22-slim AS frontend
WORKDIR /build/apps/web
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web ./
RUN npm run build

# Stage 2: API only. This is what Fly deploys (fly.toml build-target = "api");
# requests to / redirect to the Vercel frontend.
FROM python:3.12-slim AS api
WORKDIR /app
COPY packages ./packages
COPY apps/api ./apps/api
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY data ./data-seed
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 8000
CMD ["/docker-entrypoint.sh"]

# Stage 3: local docker-compose image - same API also serving the built
# frontend so localhost:8000 is a complete demo (and screenshot target).
FROM api AS full
COPY --from=frontend /build/apps/web/dist ./apps/web/dist
