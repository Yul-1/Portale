#!/bin/bash
# Script per debug configurazione nginx

echo "🔍 Debug Configurazione Nginx..."
echo "================================"

export COMPOSE_FILE=docker-compose.secure.yml

# Verifica configurazione nginx
echo -e "\n📄 Configurazione Nginx attuale:"
docker-compose exec nginx cat /etc/nginx/conf.d/secure.conf | grep -A5 "location /"

# Verifica se ci sono file statici montati
echo -e "\n📁 Verifica volumi montati:"
docker-compose exec nginx ls -la /app/build 2>/dev/null || echo "Directory /app/build non trovata"
docker-compose exec nginx ls -la /static 2>/dev/null || echo "Directory /static non trovata"

# Test connettività al frontend
echo -e "\n🔗 Test connessione al frontend:"
docker-compose exec nginx wget -O- http://frontend:3000 2>&1 | head -20

# Verifica logs nginx errori
echo -e "\n❌ Ultimi errori nginx:"
docker-compose logs nginx | grep -E "error|failed" | tail -10

# Verifica routing
echo -e "\n🛣️ Test routing nginx:"
docker-compose exec nginx nginx -T 2>/dev/null | grep -E "location|proxy_pass" | head -20