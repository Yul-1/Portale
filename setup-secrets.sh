#!/bin/bash
# Script per configurare Docker secrets in modo sicuro

set -euo pipefail

echo "🔐 Configurazione Docker Secrets per il Portale..."

# Crea directory per secrets
mkdir -p secrets/ssl
chmod 700 secrets

# Funzione per generare password sicure
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Genera secrets se non esistono
if [ ! -f secrets/db_password.txt ]; then
    echo "Generazione password database..."
    generate_password > secrets/db_password.txt
    chmod 600 secrets/db_password.txt
fi

if [ ! -f secrets/db_user.txt ]; then
    echo "Creazione utente database..."
    echo "portale_user" > secrets/db_user.txt
    chmod 600 secrets/db_user.txt
fi

if [ ! -f secrets/django_secret_key.txt ]; then
    echo "Generazione Django secret key..."
    python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())' > secrets/django_secret_key.txt 2>/dev/null || \
    generate_password > secrets/django_secret_key.txt
    chmod 600 secrets/django_secret_key.txt
fi

# Genera certificati SSL self-signed per sviluppo
if [ ! -f secrets/ssl/cert.pem ]; then
    echo "Generazione certificati SSL self-signed..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout secrets/ssl/key.pem \
        -out secrets/ssl/cert.pem \
        -subj "/C=IT/ST=Tuscany/L=Lucca/O=Portale/CN=localhost"
    chmod 600 secrets/ssl/*.pem
fi

# Genera DH parameters per SSL (questo richiede tempo)
if [ ! -f secrets/ssl/dhparam.pem ]; then
    echo "Generazione DH parameters (potrebbe richiedere qualche minuto)..."
    openssl dhparam -out secrets/ssl/dhparam.pem 2048
    chmod 600 secrets/ssl/dhparam.pem
fi

# Crea file .env.production con riferimenti ai secrets
cat > .env.production << EOF
# Produzione - usa Docker secrets
NODE_ENV=production
DEBUG=False

# Database - valori letti da secrets
DB_NAME=portale_db
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$(generate_password)

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=hitmoncrob@gmail.com
EMAIL_HOST_PASSWORD=tazza95

# Domini permessi
ALLOWED_HOSTS=portale.example.com,localhost
CORS_ALLOWED_ORIGINS=https://portale.example.com

# Sicurezza
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
EOF

chmod 600 .env.production

# Crea anche .env.example come template
cat > .env.example << EOF
# Template configurazione - copia in .env e modifica i valori

# Database
DB_NAME=portale_db
DB_USER=portale_user
DB_PASSWORD=tazza95
DB_HOST=db
DB_PORT=5432

# Django
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=tazza95

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=hitmoncrob@gmail.com
EMAIL_HOST_PASSWORD=tazza95

# API
API_URL=http://localhost:8000/api

# Timezone
TZ=Europe/Rome
EOF

echo "✅ Secrets configurati con successo!"
echo ""
echo "📁 Struttura secrets creata:"
tree secrets/

echo ""
echo "⚠️  IMPORTANTE:"
echo "1. Per produzione, sostituisci i certificati self-signed con certificati reali (Let's Encrypt)"
echo "2. Cambia le password di default nel file .env.production"
echo "3. Fai backup sicuro della cartella secrets/"
echo "4. Non committare MAI la cartella secrets/ in git!"

# Aggiungi secrets a .gitignore se non presente
if [ ! -f .gitignore ]; then
    touch .gitignore
fi

if ! grep -q "secrets/" .gitignore 2>/dev/null; then
    echo -e "\n# Docker secrets\nsecrets/\n*.pem\n*.key\n*.crt" >> .gitignore
    echo "✅ Aggiunto secrets/ a .gitignore"
fi

if [ ! -f secrets/redis_password.txt ]; then
    echo "Generazione password Redis..."
    generate_password > secrets/redis_password.txt
    chmod 600 secrets/redis_password.txt
fi

# Mostra le password generate per riferimento
echo ""
echo "📋 Password generate (salvale in un posto sicuro!):"
echo "   DB Password: $(cat secrets/db_password.txt)"
echo "   Redis Password: $(grep REDIS_PASSWORD .env.production | cut -d= -f2)"
echo ""
echo "🔑 Django Secret Key salvata in: secrets/django_secret_key.txt"
echo ""
echo "🔐 Certificati SSL self-signed generati in: secrets/ssl/"
echo "   - Per produzione, sostituisci con certificati reali"
echo ""
echo "✅ Setup secrets completato!"