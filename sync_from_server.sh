#!/usr/bin/env bash
#
# Synct app.db und output/ vom Server auf das lokale Repo.
# Richtung: Server -> Lokal (lokale Daten werden dabei überschrieben/gelöscht,
# damit sie exakt dem Server-Stand entsprechen).
#
set -euo pipefail

SSH_HOST="jan-server"
REMOTE_DIR="/home/janvogt/dockercontainer/dfb-spesen-generator"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Synce app.db von ${SSH_HOST}..."
rsync -avz --progress \
    "${SSH_HOST}:${REMOTE_DIR}/app.db" \
    "${LOCAL_DIR}/app.db"

echo "Synce output/ von ${SSH_HOST} (lokale Dateien, die remote nicht existieren, werden geloescht)..."
rsync -avz --delete --progress \
    "${SSH_HOST}:${REMOTE_DIR}/output/" \
    "${LOCAL_DIR}/output/"

echo "Fertig."
