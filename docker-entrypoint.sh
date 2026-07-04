#!/bin/sh
# Seed the data volume on first boot (Fly volume mounts empty over /app/data),
# then start the API. No-op when data already exists (compose/local).
set -e

if [ -d /app/data-seed ] && [ ! -d /app/data/synthetic ]; then
  mkdir -p /app/data
  cp -r /app/data-seed/. /app/data/
fi

exec uvicorn api.main:app --host 0.0.0.0 --port 8000
