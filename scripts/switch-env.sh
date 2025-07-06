#!/bin/bash
set -e

# Funzione per mostrare l'uso dello script
show_usage() {
    echo "Uso: $0 [dev|prod]"
    echo "  dev  : Passa all'ambiente di sviluppo."
    echo "  prod : Passa all'ambiente di produzione."
    exit 1
}

# Verifica che sia stato fornito un argomento
if [ -z "$1" ]; then
    echo "Errore: Nessun ambiente specificato."
    show_usage
fi

TARGET_ENV="$1"

# Convalida l'argomento
if [ "$TARGET_ENV" != "dev" ] && [ "$TARGET_ENV" != "prod" ]; then
    echo "Errore: Ambiente non valido. Scegli 'dev' o 'prod'."
    show_usage
fi

echo "🚀 Tentativo di passare all'ambiente: $TARGET_ENV"

# --- 1. Verifica ambiente attivo e conferma ---
CURRENT_ENV="sconosciuto"
# Tenta di determinare l'ambiente attivo ispezionando il container backend
if docker ps -f name=portale_backend --format "{{.Names}}" | grep -q "portale_backend"; then
    BACKEND_DEBUG_STATUS=$(docker inspect portale_backend --format '{{range .Config.Env}}{{if eq (index (split . "=") 0) "DEBUG"}}{{index (split . "=") 1}}{{end}}{{end}}')
    if [ "$BACKEND_DEBUG_STATUS" == "False" ]; then
        CURRENT_ENV="prod"
    elif [ "$BACKEND_DEBUG_STATUS" == "True" ]; then
        CURRENT_ENV="dev"
    fi
fi

if [ "$CURRENT_ENV" == "$TARGET_ENV" ]; then
    echo "Sei già nell'ambiente '$TARGET_ENV'. Nessuna azione richiesta."
    exit 0
fi

echo "Ambiente corrente rilevato: $CURRENT_ENV"
read -p "Questo comando fermerà e rimuoverà TUTTI i contenitori, le reti e i volumi anonimi. Sei sicuro di voler procedere? (s/N) " -n 1 -r
echo # (nuova riga)
if [[ ! $REPLY =~ ^[sS]$ ]]; then
    echo "Operazione annullata."
    exit 0
fi

# --- 2. Ferma e rimuovi tutti i servizi e volumi anonimi ---
echo "🗑️  Arresto e rimozione di tutti i servizi Docker e volumi anonimi..."
docker-compose down -v

# --- 3. Avvia il nuovo ambiente ---
if [ "$TARGET_ENV" == "dev" ]; then
    echo "Starting development environment..."
    ./scripts/start-dev.sh
elif [ "$TARGET_ENV" == "prod" ]; then
    echo "Starting production environment..."
    ./scripts/start-prod.sh
fi

echo "✅ Cambio ambiente completato a: $TARGET_ENV"
