#!/bin/sh
# backend/entrypoint.sh

# Questo script assicura i permessi corretti sui volumi montati prima di avviare l'applicazione.

# UID e GID per l'utente 'portale' definito in Dockerfilebackend.secure.txt
# Assicurati che questi corrispondano se li modifichi nel Dockerfile
PORTALE_UID=1000
PORTALE_GID=1000

set -e

if [ ! -f "/static/admin/css/base.css" ]; then # Controlla un file statico comune
    echo "Executing Django migrations and collecting static files as root..."
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput
    echo "Django setup complete."
else
    echo "Static files already collected, skipping."
fi

exec "$@"