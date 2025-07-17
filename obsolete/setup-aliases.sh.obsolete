#!/bin/bash
# Script per configurare alias utili per il progetto

echo "🔧 Configurazione alias per il Portale..."

# Crea script helper
cat > dc-secure << 'EOF'
#!/bin/bash
export COMPOSE_FILE=docker-compose.secure.yml
docker-compose "$@"
EOF

chmod +x dc-secure

# Aggiungi alias al .bashrc locale del progetto
cat > .project-aliases << 'EOF'
# Alias per il Portale Prenotazioni
alias dc='./dc-secure'
alias dc-up='./dc-secure up -d'
alias dc-down='./dc-secure down'
alias dc-logs='./dc-secure logs -f'
alias dc-ps='./dc-secure ps'
alias dc-restart='./dc-secure restart'
alias dc-build='./dc-secure build'

# Alias per comandi frequenti
alias portale-status='./dc-secure ps'
alias portale-logs='./dc-secure logs -f --tail=100'
alias portale-restart='./restart-secure.sh'
alias portale-backup='./backup-secure.sh'
alias portale-monitor='./security-monitor.sh'

# Alias per accesso ai container
alias portale-backend='./dc-secure exec backend bash'
alias portale-frontend='./dc-secure exec frontend sh'
alias portale-db='./dc-secure exec db psql -U portale_user -d portale_db'
alias portale-redis='./dc-secure exec redis redis-cli'
EOF

echo ""
echo "✅ Helper script creato: ./dc-secure"
echo ""
echo "📌 Per usare gli alias, esegui:"
echo "   source .project-aliases"
echo ""
echo "🚀 Comandi disponibili:"
echo "   dc ps                 - Mostra stato servizi"
echo "   dc-up                 - Avvia tutti i servizi"
echo "   dc-down               - Ferma tutti i servizi"
echo "   dc-logs               - Mostra log in tempo reale"
echo "   portale-status        - Status del portale"
echo "   portale-restart       - Riavvia il portale"
echo "   portale-backend       - Accedi al container backend"
echo "   portale-frontend      - Accedi al container frontend"
echo "   portale-db           - Accedi al database"
echo ""
echo "💡 Suggerimento: aggiungi 'source $(pwd)/.project-aliases' al tuo ~/.bashrc"