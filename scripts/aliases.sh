#!/bin/bash
# Portale Docker Aliases

export PORTALE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Funzione wrapper per docker-compose
pdc() {
    local env="${ENVIRONMENT:-development}"
    local compose_files="-f $PORTALE_DIR/docker-compose.yml"
    
    if [ "$env" = "production" ]; then
        compose_files="$compose_files -f $PORTALE_DIR/docker-compose.prod.yml"
    else
        compose_files="$compose_files -f $PORTALE_DIR/docker-compose.dev.yml"
    fi
    
    (cd "$PORTALE_DIR" && docker-compose $compose_files "$@")
}

# Alias principali
alias dc='pdc'
alias dcup='pdc up -d'
alias dcdown='pdc down'
alias dcps='pdc ps'
alias dclogs='pdc logs -f'
alias dcbuild='pdc build'

# Alias per servizi
alias dcbackend='pdc exec backend'
alias dcfrontend='pdc exec frontend'
alias dcdb='pdc exec db'

# Django shortcuts
alias dcmanage='pdc exec backend python manage.py'
alias dcmigrate='pdc exec backend python manage.py migrate'
alias dcshell='pdc exec backend python manage.py shell'

# Attivazione
echo "✅ Portale aliases loaded! Project: $PORTALE_DIR"