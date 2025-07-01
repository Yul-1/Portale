#!/bin/bash
# backend/entrypoint.sh - VERSIONE SEMPLIFICATA PER SVILUPPO

set -e

# Funzione per logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Attendi che il database sia pronto
log "Waiting for PostgreSQL..."
while ! nc -z ${DB_HOST:-db} ${DB_PORT:-5432}; do
    log "PostgreSQL is unavailable - sleeping"
    sleep 1
done
log "PostgreSQL is up!"

# Esegui il comando passato come argomento allo script (es. "python manage.py runserver...")
log "Executing command: $@"
exec "$@"