#!/bin/bash
set -e

echo "🚀 Avvio dell'ambiente di produzione..."

# --- 1. Verifica e Carica Variabili d'Ambiente ---
# In produzione, è cruciale che le variabili d'ambiente siano definite
# o caricate da un sistema sicuro (es. Vault, Kubernetes secrets, variabili CI/CD).
# Per semplicità, qui carichiamo da .env, ma in un vero ambiente prod
# questo file NON dovrebbe essere presente o dovrebbe contenere solo variabili non sensibili.
# Le variabili sensibili (DB_PASSWORD, DJANGO_SECRET_KEY, REDIS_PASSWORD)
# DEVONO essere gestite tramite Docker Secrets come definito in docker-compose.prod.yml.

# Verifica l'esistenza del file .env (per variabili non sensibili come COMPOSE_PROJECT_NAME, DB_NAME, DB_USER)
if [ ! -f .env ]; then
    echo "⚠️  Attenzione: Il file .env non trovato. Assicurati che le variabili d'ambiente non sensibili siano impostate."
    # Non uscire, le variabili sensibili sono gestite dai secrets
fi

# Carica le variabili d'ambiente dal file .env (se esiste)
# Questo è utile per COMPOSE_PROJECT_NAME, DB_NAME, DB_USER, ecc.
# Le password e chiavi segrete sono gestite dai Docker Secrets.
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# --- 2. Gestione dei Docker Secrets ---
# Assicurati che i file dei secrets esistano. In un ambiente di produzione reale,
# questi file verrebbero iniettati in modo sicuro (es. da un CI/CD pipeline o un sistema di gestione secrets).
# Qui li creiamo come placeholder se non esistono.
echo "🔐 Verifica e creazione dei files per i Docker Secrets..."
mkdir -p secrets
if [ ! -f secrets/db_password.txt ]; then
    echo "Generazione placeholder per secrets/db_password.txt"
    head /dev/urandom | tr -dc A-Za-z0-9_.- | head -c 32 > secrets/db_password.txt
    echo "⚠️  IMPORTANTE: Sostituisci il contenuto di secrets/db_password.txt con una password forte e sicura per il DB."
fi
if [ ! -f secrets/db_user.txt ]; then
    echo "Generazione placeholder per secrets/db_user.txt"
    echo "portale_user_prod" > secrets/db_user.txt # Nome utente di esempio
    echo "⚠️  IMPORTANTE: Sostituisci il contenuto di secrets/db_user.txt con un utente sicuro per il DB."
fi
if [ ! -f secrets/django_secret_key.txt ]; then
    echo "Generazione placeholder per secrets/django_secret_key.txt"
    head /dev/urandom | tr -dc A-Za-z0-9_.- | head -c 50 > secrets/django_secret_key.txt
    echo "⚠️  IMPORTANTE: Sostituisci il contenuto di secrets/django_secret_key.txt con una chiave segreta Django forte e sicura."
fi
if [ ! -f secrets/redis_password.txt ]; then
    echo "Generazione placeholder per secrets/redis_password.txt"
    head /dev/urandom | tr -dc A-Za-z0-9_.- | head -c 32 > secrets/redis_password.txt
    echo "⚠️  IMPORTANTE: Sostituisci il contenuto di secrets/redis_password.txt con una password forte e sicura per Redis."
fi

# --- 3. Verifica Certificati SSL ---
# In produzione, i certificati SSL DEVONO essere validi e firmati da una CA.
# Questo script si aspetta che siano già presenti.
echo "🔐 Verifica dei certificati SSL per Nginx..."
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo "❌ Errore: Certificati SSL (cert.pem e key.pem) non trovati in nginx/ssl/."
    echo "Per la produzione, è necessario fornire certificati validi firmati da un'autorità di certificazione (es. Let's Encrypt)."
    exit 1
fi

# --- 4. Creazione Directory di Log e Backup ---
echo "📂 Creazione delle directory per logs e backups..."
mkdir -p logs backups

# --- 5. Build delle Immagini Docker ---
# Forza la ricostruzione delle immagini per assicurare che siano aggiornate con la configurazione di produzione.
echo "🏗️  Costruzione delle immagini Docker per la produzione..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

# --- 6. Avvio dei Servizi Docker Compose ---
echo "🚀 Avvio dei servizi Docker Compose in modalità produzione..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# --- 7. Attesa e Stato dei Servizi ---
echo "⏳ Attesa che i servizi siano operativi (potrebbe richiedere del tempo)..."
sleep 20 # Aumentato il tempo di attesa per i servizi di produzione

# Mostra lo stato dei servizi
echo "✅ Stato dei servizi di produzione:"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

echo "🎉 Ambiente di produzione avviato con successo!"
echo "🌐 Accesso: https://localhost (o il tuo dominio configurato)"
echo "📊 Logs: docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo "💾 Backup: I backup del database saranno salvati in ./backups"
echo "🔧 Per gestire i segreti, usa Docker Secrets come definito in docker-compose.prod.yml
e assicurati che siano configurati correttamente nel tuo ambiente di produzione."
echo "👤 Admin: https://localhost/admin (admin/adminpassword)
echo "📖 Documentazione: Consulta la documentazione per ulteriori dettagli sulla configurazione e gestione dell'ambiente di produzione."
echo "⚠️  Ricorda: In un ambiente di produzione, non dovresti mai esporre le password o le chiavi segrete nel codice sorgente o nei file di configurazione."
echo "Per la sicurezza, gestisci sempre le credenziali sensibili tramite Docker Secrets o un sistema di gestione dei segreti sicuro."
