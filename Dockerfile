# Multi-stage Build: Frontend bauen, dann Backend
FROM node:20-slim AS frontend-builder

WORKDIR /frontend

# Frontend Dependencies installieren
COPY frontend/package*.json ./
RUN npm ci

# Frontend Code kopieren und bauen
COPY frontend/ ./
RUN npm run build

# ===== Backend Stage =====
FROM python:3.13-slim

WORKDIR /app

# System-Dependencies für Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Python Dependencies installieren
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright Browser installieren
RUN playwright install chromium

# Backend Code kopieren
COPY src/ ./src/

# Frontend Build kopieren
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Persistente Daten-Verzeichnisse erstellen
RUN mkdir -p /app/output

# Port exposieren
EXPOSE 8001

# Umgebungsvariablen
ENV PYTHONUNBUFFERED=1

# Start Command
CMD ["python", "src/main.py"]
