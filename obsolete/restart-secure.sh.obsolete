#!/bin/bash
# Script per riavviare il portale in modo pulito

set -euo pipefail

echo "🔄 Riavvio pulito del Portale..."

# Usa docker-compose sicuro
export COMPOSE_FILE=docker-compose.secure.yml

# Ferma tutti i servizi
echo "⏹️  Arresto servizi..."
docker-compose down

# Rimuovi volumi orfani (opzionale - commentare se si vogliono preservare i dati)
# docker volume prune -f

# Pulisci cache build
echo "🧹 Pulizia cache..."
docker-compose rm -f

# Ricostruisci immagini
echo "🔨 Ricostruzione immagini..."
docker-compose build --no-cache frontend nginx

# Avvia servizi
echo "🚀 Avvio servizi..."
docker-compose up -d

# Attendi che i servizi siano pronti
echo "⏳ Attendo avvio servizi..."
sleep 15

# Verifica health dei servizi
echo "🏥 Verifica health check..."
docker-compose ps

# Mostra logs
echo ""
echo "📋 Ultimi log:"
docker-compose logs --tail=50

echo ""
echo "✅ Riavvio completato!"
echo ""
echo "📍 Accesso:"
echo "  - HTTPS: https://localhost"
echo "  - Admin: https://localhost/admin"
echo ""
echo "Per vedere i log in tempo reale: docker-compose logs -f"