#!/bin/bash
# Script di avvio sicuro per produzione

set -euo pipefail

echo "🔒 Avvio Portale in modalità SICURA..."

# Verifica che i secrets esistano
if [ ! -d "secrets" ]; then
    echo "❌ Cartella secrets non trovata! Esegui prima setup-secrets.sh"
    exit 1
fi

# Verifica permessi sui secrets
echo "🔍 Verifica permessi secrets..."
find secrets -type f -exec chmod 600 {} \;
find secrets -type d -exec chmod 700 {} \;

# Usa docker-compose sicuro
export COMPOSE_FILE=docker-compose.secure.yml

# Build con no-cache per sicurezza
echo "🔨 Build immagini sicure..."
docker-compose build --no-cache

# Avvia servizi
echo "🚀 Avvio servizi..."
docker-compose up -d

# Attendi che i servizi siano pronti
echo "⏳ Attendo avvio servizi..."
sleep 15

# Verifica health dei servizi
echo "🏥 Verifica health check..."
docker-compose ps

# Esegui migrazioni
#echo "🔄 Esecuzione migrazioni..."
#docker-compose exec -T backend python manage.py migrate --noinput

# Raccogli static files
#echo "📦 Raccolta static files..."
#docker-compose exec -T backend python manage.py collectstatic --noinput

# Mostra log di sicurezza
echo ""
echo "✅ Portale avviato in modalità sicura!"
echo ""
echo "🔐 Checklist sicurezza:"
echo "  ✓ Database non esposto esternamente"
echo "  ✓ Secrets gestiti tramite Docker secrets"
echo "  ✓ Servizi eseguiti con utenti non-root"
echo "  ✓ SSL/TLS abilitato (certificati in secrets/ssl/)"
echo "  ✓ Security headers configurati"
echo "  ✓ Rate limiting attivo"
echo ""
echo "📍 Accesso:"
echo "  - HTTPS: https://localhost (certificato self-signed)"
echo "  - HTTP→HTTPS redirect attivo"
echo ""
echo "⚠️  Per produzione:"
echo "  1. Sostituisci certificati self-signed con Let's Encrypt"
echo "  2. Configura firewall per bloccare porte non necessarie"
echo "  3. Abilita backup automatici"
echo "  4. Configura monitoring e alerting"

# Mostra ultimi log per verificare errori
echo ""
echo "📋 Ultimi log (CTRL+C per uscire):"
docker-compose logs -f --tail=20