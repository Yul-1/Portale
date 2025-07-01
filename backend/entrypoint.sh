#!/bin/bash
# backend/entrypoint.sh

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

# Attendi Redis se configurato
if [ ! -z "$REDIS_URL" ]; then
    log "Waiting for Redis..."
    while ! nc -z redis 6379; do
        log "Redis is unavailable - sleeping"
        sleep 1
    done
    log "Redis is up!"
fi

# Esegui migrazioni se necessario
if [ "$RUN_MIGRATIONS" != "false" ] || [ ! -f "/app/static/admin/css/base.css" ]; then
    log "Running Django migrations..."
    python manage.py migrate --noinput
    
    log "Collecting static files..."
    python manage.py collectstatic --noinput
    
    # Crea superuser in development
    if [ "$ENVIRONMENT" = "development" ] && [ "$CREATE_SUPERUSER" = "true" ]; then
        log "Creating superuser..."
        python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'adminpassword')
    print('Superuser created: admin/adminpassword')
else:
    print('Superuser already exists')
END
    fi
else
    log "Migrations and static files already handled, skipping..."
fi

# Verifica directory
for dir in static media logs; do
    if [ ! -d "/app/$dir" ]; then
        log "Creating /app/$dir directory..."
        mkdir -p "/app/$dir"
    fi
done

log "Starting application with command: $@"
exec "$@"