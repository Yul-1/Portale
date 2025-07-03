#!/bin/bash
# Script di monitoraggio sicurezza per il portale

set -euo pipefail

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Monitoraggio Sicurezza Portale - $(date)"
echo "================================================"

# Funzione per verificare stato servizi
check_service_health() {
    local service=$1
    if docker-compose ps | grep -q "${service}.*Up"; then
        echo -e "${GREEN}✓${NC} ${service}: Running"
    else
        echo -e "${RED}✗${NC} ${service}: Down"
        return 1
    fi
}

# Verifica stato servizi
echo -e "\n📊 Stato Servizi:"
check_service_health "portale_db"
check_service_health "portale_backend"
check_service_health "portale_frontend"
check_service_health "portale_nginx"
check_service_health "portale_redis"

# Verifica utilizzo risorse
echo -e "\n💻 Utilizzo Risorse:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep portale || true

# Verifica tentativi di accesso sospetti
echo -e "\n🚨 Tentativi di Accesso Sospetti (ultimi 100 log):"
echo "   403 Forbidden:"
docker-compose logs nginx 2>/dev/null | grep " 403 " | tail -5 | wc -l

echo "   401 Unauthorized:"
docker-compose logs nginx 2>/dev/null | grep " 401 " | tail -5 | wc -l

echo "   Tentativi su admin:"
docker-compose logs nginx 2>/dev/null | grep "/admin" | grep -v " 200 " | tail -5 | wc -l

# Verifica rate limiting
echo -e "\n⚡ Rate Limiting (ultimi 10 minuti):"
docker-compose logs nginx 2>/dev/null | grep "limiting requests" | tail -10 | wc -l

# Verifica certificati SSL
echo -e "\n🔐 Stato Certificati SSL:"
if [ -f "secrets/ssl/cert.pem" ]; then
    expiry=$(openssl x509 -enddate -noout -in secrets/ssl/cert.pem | cut -d= -f2)
    echo "   Scadenza: $expiry"
    
    # Verifica se scade entro 30 giorni
    if openssl x509 -checkend 2592000 -noout -in secrets/ssl/cert.pem; then
        echo -e "   ${GREEN}✓${NC} Certificato valido per più di 30 giorni"
    else
        echo -e "   ${YELLOW}⚠${NC} Certificato scade entro 30 giorni!"
    fi
else
    echo -e "   ${RED}✗${NC} Certificato non trovato!"
fi

# Verifica permessi secrets
echo -e "\n🔑 Permessi Secrets:"
insecure_files=$(find secrets -type f ! -perm 600 2>/dev/null || true)
if [ -z "$insecure_files" ]; then
    echo -e "   ${GREEN}✓${NC} Tutti i secrets hanno permessi corretti (600)"
else
    echo -e "   ${RED}✗${NC} File con permessi non sicuri:"
    echo "$insecure_files"
fi

# Verifica volumi Docker
echo -e "\n📦 Volumi Docker:"
docker volume ls | grep portale | awk '{print "   - " $2}'

# Verifica integrità container
echo -e "\n🛡️ Integrità Container:"
for container in portale_db portale_backend portale_frontend portale_nginx portale_redis; do
    if docker inspect $container >/dev/null 2>&1; then
        user=$(docker inspect $container --format='{{.Config.User}}')
        if [ "$user" != "root" ] && [ -n "$user" ]; then
            echo -e "   ${GREEN}✓${NC} $container: eseguito come user $user"
        else
            echo -e "   ${YELLOW}⚠${NC} $container: eseguito come root"
        fi
    fi
done

# Verifica connessioni database
echo -e "\n🗄️ Connessioni Database:"
docker-compose exec -T db psql -U portale_user -d portale_db -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo "   Impossibile connettersi al database"

# Genera report
echo -e "\n📄 Generazione Report..."
report_file="security-report-$(date +%Y%m%d-%H%M%S).txt"
{
    echo "SECURITY REPORT - $(date)"
    echo "========================"
    echo ""
    docker-compose ps
    echo ""
    echo "ULTIMI ERROR LOG:"
    docker-compose logs --tail=50 | grep -i error || true
    echo ""
    echo "CONNESSIONI ATTIVE:"
    netstat -tuln 2>/dev/null | grep LISTEN | grep -E ":(80|443|8000|3000|5432)" || true
} > "$report_file"

echo -e "${GREEN}✓${NC} Report salvato in: $report_file"

# Alert se ci sono problemi critici
critical_issues=0

# Controlla se ci sono servizi down
if ! docker-compose ps | grep -q "Up.*portale"; then
    ((critical_issues++))
fi

# Controlla tentativi di accesso eccessivi
suspicious_attempts=$(docker-compose logs nginx 2>/dev/null | grep -E " 403 | 401 " | tail -100 | wc -l)
if [ $suspicious_attempts -gt 50 ]; then
    ((critical_issues++))
    echo -e "\n${RED}⚠️  ALERT: Rilevati $suspicious_attempts tentativi di accesso sospetti!${NC}"
fi

if [ $critical_issues -gt 0 ]; then
    echo -e "\n${RED}🚨 ATTENZIONE: Rilevati $critical_issues problemi critici!${NC}"
    exit 1
else
    echo -e "\n${GREEN}✅ Nessun problema critico rilevato${NC}"
fi