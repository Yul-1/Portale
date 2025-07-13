FROM python:3.11-slim

# Aggiungi ARG per UID/GID personalizzabili
ARG USER_ID=1000
ARG GROUP_ID=1000

# Imposta variabili d'ambiente
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100

# Installa dipendenze di sistema - MODIFICATO
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client gcc python3-dev libpq-dev \
    libpango-1.0-0 libharfbuzz0b libpangoft2-1.0-0 libgdk-pixbuf2.0-0 libcairo2 \
    curl \
    netcat-openbsd \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Crea utente non-root con ID parametrizzabili - MODIFICATO
RUN groupadd -r portale -g ${GROUP_ID} && \
    useradd -r -u ${USER_ID} -g portale -m -d /home/portale -s /bin/bash -c "Portale user" portale

# Crea directory di lavoro
WORKDIR /app

# Copia solo requirements per cache Docker layer
COPY ./requirements /app/requirements

# Installa dipendenze Python come root
ARG REQUIREMENTS_FILE=prod.txt
RUN pip install --upgrade pip && \
    pip install -r /app/requirements/${REQUIREMENTS_FILE}

# Crea le directory necessarie - MODIFICATO
RUN mkdir -p /app/static /app/media /app/logs /app/staticfiles && \
    chown -R portale:portale /app

# Copia il codice come utente portale
COPY --chown=portale:portale . /app/

# Rimuovi file non necessari e imposta permessi
RUN find /app -type f -name "*.pyc" -delete && \
    find /app -type d -name "__pycache__" -delete && \
    chmod +x /app/manage.py && \
    chmod +x /app/entrypoint.sh && \
    chmod -R 777 /media

# Cambia a utente non-root
USER portale

# Espone la porta
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Comando di default - MODIFICATO
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "2", "--worker-class", "gthread", "--worker-tmp-dir", "/dev/shm", "--log-level", "info", "--access-logfile", "-", "--error-logfile", "-", "--timeout", "120", "config.wsgi:application"]