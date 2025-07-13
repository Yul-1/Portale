#!/bin/bash
# backend/entrypoint.sh - VERSIONE AGGIORNATA PER COMANDI INIZIALI

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

# Esegui le migrazioni di Django
log "Applying Django migrations..."
python manage.py migrate --noinput

# Crea il superuser se non esiste (solo in sviluppo)

if [ "$CREATE_SUPERUSER" = "true" ]; then
    log "Creating superuser if it does not exist..."
    python manage.py create_superuser || true # '|| true' per non far fallire lo script se l'utente esiste già
fi

# Raccogli i file statici
log "Collecting static files..."
python manage.py collectstatic --noinput

# Esegui il comando passato come argomento allo script (es. "gunicorn config.wsgi:application...")
log "Starting Django application..."
exec "$@"