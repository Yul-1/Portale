#!/bin/bash
# Portale Docker Aliases

# Esporta la variabile PORTALE_DIR per renderla disponibile alle funzioni
export PORTALE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Funzione wrapper per docker compose (senza trattino)
pdc() {
    local env="${ENVIRONMENT:-development}" # ENVIRONMENT è settato da start-dev.sh o switch-env.sh
    local compose_files="-f $PORTALE_DIR/docker-compose.yml" # File di base

    # Aggiungi il file compose specifico per l'ambiente
    if [ "$env" = "production" ]; then
        compose_files="$compose_files -f $PORTALE_DIR/docker-compose.prod.yml"
    else # Default a development se ENVIRONMENT non è 'production'
        compose_files="$compose_files -f $PORTALE_DIR/docker-compose.dev.yml"
    fi

    # Esegui il comando docker compose con i file specifici e gli argomenti passati
    # Usa 'docker compose' con lo spazio invece di 'docker-compose' con il trattino
    (cd "$PORTALE_DIR" && docker compose $compose_files "$@")
}

# Alias principali aggiornati per 'docker compose'
alias dc='pdc'
alias dcup='pdc up -d'
alias dcdown='pdc down'
alias dcps='pdc ps'
alias dclogs='pdc logs -f'
alias dcbuild='pdc build'

# Alias per servizi specifici
alias dcbackend='pdc exec backend'
alias dcfrontend='pdc exec frontend'
alias dcdb='pdc exec db'

# Django shortcuts
alias dcmanage='pdc exec backend python manage.py'
alias dcmigrate='pdc exec backend python manage.py migrate'
alias dcshell='pdc exec backend python manage.py shell'

# Attivazione e messaggio all'utente
echo "✅ Portale aliases loaded! Project: $PORTALE_DIR"
echo "   Ora puoi usare 'dc' seguito dai comandi (es. 'dc up -d', 'dc ps', 'dc backend bash')."
echo "   L'ambiente corrente è: ${ENVIRONMENT:-development}"