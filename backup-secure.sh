#!/bin/bash
# Script di backup sicuro e crittografato

set -euo pipefail

# Configurazione
BACKUP_DIR="/backup/portale"
BACKUP_RETENTION_DAYS=30
ENCRYPTION_KEY_FILE="/root/.backup-encryption-key"
S3_BUCKET="portale-backups"  # Opzionale: per backup su S3

# Colori output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔐 Backup Sicuro Portale - $(date)"
echo "=================================="

# Crea directory backup se non esiste
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Genera chiave di crittografia se non esiste
if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
    echo "🔑 Generazione chiave di crittografia..."
    openssl rand -base64 32 > "$ENCRYPTION_KEY_FILE"
    chmod 600 "$ENCRYPTION_KEY_FILE"
    echo -e "${YELLOW}⚠️  IMPORTANTE: Fai backup sicuro di $ENCRYPTION_KEY_FILE${NC}"
fi

# Nome file backup con timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="portale_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Funzione per backup database
backup_database() {
    echo "🗄️  Backup database PostgreSQL..."
    
    docker-compose exec -T db pg_dump \
        -U portale_user \
        -d portale_db \
        --verbose \
        --no-owner \
        --no-acl \
        --format=custom \
        --compress=9 \
        > "${BACKUP_PATH}_db.dump"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Database backup completato"
        return 0
    else
        echo -e "${RED}✗${NC} Errore backup database"
        return 1
    fi
}

# Funzione per backup files e media
backup_files() {
    echo "📁 Backup files e media..."
    
    # Crea archivio con files importanti
    docker run --rm \
        -v portale_media_volume:/media:ro \
        -v portale_static_volume:/static:ro \
        -v "${BACKUP_DIR}:/backup" \
        alpine tar -czf "/backup/${BACKUP_NAME}_files.tar.gz" \
        /media /static 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Files backup completato"
        return 0
    else
        echo -e "${RED}✗${NC} Errore backup files"
        return 1
    fi
}

# Funzione per backup configurazioni
backup_configs() {
    echo "⚙️  Backup configurazioni..."
    
    tar -czf "${BACKUP_PATH}_configs.tar.gz" \
        docker-compose*.yml \
        .env* \
        nginx/ \
        backend/requirements.txt \
        frontend/package*.json \
        2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Configurazioni backup completato"
        return 0
    else
        echo -e "${RED}✗${NC} Errore backup configurazioni"
        return 1
    fi
}

# Funzione per backup secrets (extra sicuro)
backup_secrets() {
    echo "🔐 Backup secrets (crittografato)..."
    
    # Crea archivio temporaneo
    tar -czf "${BACKUP_PATH}_secrets_temp.tar.gz" secrets/ 2>/dev/null
    
    # Cripta con chiave AES-256
    openssl enc -aes-256-cbc \
        -salt \
        -in "${BACKUP_PATH}_secrets_temp.tar.gz" \
        -out "${BACKUP_PATH}_secrets.tar.gz.enc" \
        -pass file:"$ENCRYPTION_KEY_FILE"
    
    # Rimuovi file temporaneo
    rm -f "${BACKUP_PATH}_secrets_temp.tar.gz"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Secrets backup completato (crittografato)"
        return 0
    else
        echo -e "${RED}✗${NC} Errore backup secrets"
        return 1
    fi
}

# Funzione per creare backup completo
create_full_backup() {
    echo "📦 Creazione backup completo..."
    
    # Esegui tutti i backup
    backup_database
    backup_files
    backup_configs
    backup_secrets
    
    # Crea archivio finale crittografato
    echo "🔒 Crittografia backup finale..."
    tar -czf - "${BACKUP_PATH}"_* | \
    openssl enc -aes-256-cbc \
        -salt \
        -out "${BACKUP_PATH}_complete.tar.gz.enc" \
        -pass file:"$ENCRYPTION_KEY_FILE"
    
    # Calcola checksum
    sha256sum "${BACKUP_PATH}_complete.tar.gz.enc" > "${BACKUP_PATH}_complete.sha256"
    
    # Rimuovi file temporanei
    rm -f "${BACKUP_PATH}"_*.{dump,tar.gz}
    
    echo -e "${GREEN}✓${NC} Backup completo creato: ${BACKUP_PATH}_complete.tar.gz.enc"
}

# Funzione per upload su S3 (opzionale)
upload_to_s3() {
    if command -v aws &> /dev/null; then
        echo "☁️  Upload backup su S3..."
        aws s3 cp "${BACKUP_PATH}_complete.tar.gz.enc" "s3://${S3_BUCKET}/" --storage-class GLACIER
        aws s3 cp "${BACKUP_PATH}_complete.sha256" "s3://${S3_BUCKET}/"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Backup caricato su S3"
        else
            echo -e "${RED}✗${NC} Errore upload S3"
        fi
    fi
}

# Funzione per pulizia backup vecchi
cleanup_old_backups() {
    echo "🧹 Pulizia backup vecchi (> $BACKUP_RETENTION_DAYS giorni)..."
    
    find "$BACKUP_DIR" -name "portale_backup_*.enc" -mtime +$BACKUP_RETENTION_DAYS -exec rm {} \;
    find "$BACKUP_DIR" -name "portale_backup_*.sha256" -mtime +$BACKUP_RETENTION_DAYS -exec rm {} \;
    
    echo -e "${GREEN}✓${NC} Pulizia completata"
}

# Funzione per verificare backup
verify_backup() {
    local backup_file="$1"
    echo "🔍 Verifica integrità backup..."
    
    if sha256sum -c "${backup_file%.enc}.sha256" &>/dev/null; then
        echo -e "${GREEN}✓${NC} Backup verificato con successo"
        return 0
    else
        echo -e "${RED}✗${NC} ERRORE: Backup corrotto!"
        return 1
    fi
}

# Funzione per restore test
test_restore() {
    echo "🧪 Test restore (opzionale)..."
    read -p "Vuoi eseguire un test di restore? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Crea directory test
        TEST_DIR="/tmp/restore_test_$$"
        mkdir -p "$TEST_DIR"
        
        # Decripta backup
        openssl enc -aes-256-cbc -d \
            -in "${BACKUP_PATH}_complete.tar.gz.enc" \
            -out "$TEST_DIR/test.tar.gz" \
            -pass file:"$ENCRYPTION_KEY_FILE"
        
        # Estrai e verifica
        cd "$TEST_DIR"
        tar -xzf test.tar.gz
        
        echo -e "${GREEN}✓${NC} Test restore completato. Files in: $TEST_DIR"
    fi
}

# Main execution
main() {
    # Verifica permessi
    if [ "$EUID" -ne 0 ]; then 
        echo -e "${RED}❌ Esegui come root: sudo $0${NC}"
        exit 1
    fi
    
    # Lock file per evitare backup concorrenti
    LOCKFILE="/var/run/portale_backup.lock"
    exec 200>"$LOCKFILE"
    flock -n 200 || { echo "❌ Backup già in esecuzione"; exit 1; }
    
    # Esegui backup
    create_full_backup
    
    # Upload su S3 se configurato
    upload_to_s3
    
    # Pulizia vecchi backup
    cleanup_old_backups
    
    # Verifica backup
    verify_backup "${BACKUP_PATH}_complete.tar.gz.enc"
    
    # Test restore opzionale
    test_restore
    
    # Report finale
    echo ""
    echo "📊 Report Backup:"
    echo "   - File: ${BACKUP_PATH}_complete.tar.gz.enc"
    echo "   - Dimensione: $(du -h ${BACKUP_PATH}_complete.tar.gz.enc | cut -f1)"
    echo "   - Checksum: $(cat ${BACKUP_PATH}_complete.sha256 | cut -d' ' -f1)"
    echo ""
    echo -e "${GREEN}✅ Backup completato con successo!${NC}"
    
    # Rimuovi lock
    rm -f "$LOCKFILE"
}

# Esegui
main "$@"