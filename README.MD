# Portale Web Moderno e Sicuro

Questo repository contiene l'implementazione di un portale web moderno basato su un'architettura a microservizi. Utilizza un backend Django (Python), un frontend React (Node.js), è orchestrato con Docker Compose e servito da Nginx con SSL/TLS. L'intero setup è ottimizzato per ambienti Ubuntu e gestito con l'ausilio di VS Code.

## 🚀 Architettura del Portale

Il portale è composto dai seguenti servizi, orchestrati tramite Docker Compose:

- **db (PostgreSQL)**: Database relazionale per la persistenza dei dati
- **redis (Redis)**: Database in-memory, utilizzato per la caching e come broker di messaggi (se implementato)
- **backend (Django)**: API RESTful sviluppata con Django REST Framework. Gestisce la logica di business e l'interazione con il database
- **frontend (React)**: Interfaccia utente sviluppata con React, che interagisce con il backend tramite API
- **nginx (Nginx)**: Reverse proxy e server web. Gestisce il traffico in entrata, reindirizza HTTP a HTTPS, serve i file statici e media, e instrada le richieste al backend o al frontend
- **db_backup (PostgreSQL)**: Servizio dedicato ai backup automatici del database (solo in produzione)

### Diagramma Architetturale del Portale
*(ipotetico, non fornito ma concettualizzato)*

## 📋 Prerequisiti

Assicurati di avere i seguenti strumenti installati sul tuo sistema Ubuntu:

- **Docker Engine**: Per la gestione dei container
- **Docker Compose Plugin**: Per l'orchestrazione dei servizi Docker
  - Verifica l'installazione: `docker compose version` (nota: senza trattino)
- **Git**: Per la gestione del controllo versione
- **VS Code** (Opzionale): Per un ambiente di sviluppo integrato

## 🛠️ Guida all'Uso

### 1. Clonazione del Repository

Inizia clonando il repository sul tuo sistema locale:

```bash
git clone https://github.com/Yul-1/Portale
cd <NOME_DELLA_CARTELLA_DEL_PROGETTO>
```

### 2. Configurazione Iniziale dei Secrets e Certificati SSL

Questo script genererà i file necessari per i Docker Secrets (password, chiavi segrete) e i certificati SSL self-signed per l'ambiente di sviluppo.

```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

> ⚠️ **IMPORTANTE:**
> - Non committare **MAI** la cartella `secrets/` nel tuo repository Git! È già inclusa nel `.gitignore` per sicurezza.
> - Per l'ambiente di produzione, dovrai sostituire i certificati SSL self-signed con certificati reali (es. Let's Encrypt) e aggiornare i placeholder dei secrets con valori forti e unici.

### 3. Avvio dell'Ambiente di Sviluppo

L'ambiente di sviluppo è ottimizzato per la velocità di iterazione e il debug.

```bash
chmod +x start-dev.sh
./start-dev.sh
```

Dopo l'avvio, i servizi saranno disponibili ai seguenti URL:

- **Portale Frontend**: https://localhost
- **Django Admin**: https://localhost/admin
- **Django API Root**: https://localhost/api
- **Healthcheck API**: https://localhost/api/status/

#### Credenziali di Default (Sviluppo)
- **Django Admin**: username: `admin`, password: `adminpassword` (queste vengono create automaticamente all'avvio del backend in sviluppo)

#### Monitoraggio
- Per visualizzare i log di tutti i servizi: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f`
- Per controllare lo stato dei servizi: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps`

### 4. Avvio dell'Ambiente di Produzione

L'ambiente di produzione è configurato per stabilità, sicurezza e performance.

#### Preparazione per la Produzione (Cruciale!)

##### Certificati SSL Reali
- I certificati self-signed generati da `setup-secrets.sh` **NON** sono adatti per la produzione
- Ottieni certificati SSL validi da un'Autorità di Certificazione (CA) riconosciuta, come Let's Encrypt (gratuito, raccomandato). Puoi usare Certbot per automatizzare il processo
- Posiziona i file del certificato (`fullchain.pem` o `cert.pem`) e della chiave privata (`privkey.pem` o `key.pem`) nella directory `nginx/ssl/`. Assicurati che i nomi dei file corrispondano a quelli referenziati in `nginx/nginx.conf` (di default `cert.pem` e `key.pem`)

Esempio di posizionamento:
```
nginx/
└── ssl/
    ├── cert.pem       # Il tuo certificato reale (o fullchain.pem)
    ├── key.pem        # La tua chiave privata reale
    └── dhparam.pem    # Generato da setup-secrets.sh, riutilizzabile
```

**Sicurezza**: Assicurati che i permessi di questi file siano 600 (leggibile solo dal proprietario) e che la directory `nginx/ssl/` abbia permessi restrittivi.

##### Dominio Reale in Nginx
- Modifica il file `nginx/nginx.conf` (non `nginx.dev.conf`!) e sostituisci `server_name _;` con il tuo dominio reale (es. `server_name portale.example.com;`)
- Se hai più domini o sottodomini, puoi elencarli: `server_name portale.example.com www.portale.example.com;`

##### Aggiornamento dei Docker Secrets
- I file in `secrets/` generati da `setup-secrets.sh` contengono valori placeholder
- Sostituisci manualmente il contenuto di `secrets/db_password.txt`, `secrets/db_user.txt`, `secrets/django_secret_key.txt`, `secrets/redis_password.txt` e `secrets/email_host_password.txt` con valori forti, unici e sicuri che userai in produzione
- Non condividere **MAI** questi file

##### File .env.production
- Questo file contiene variabili d'ambiente non sensibili specifiche per la produzione (es. `DEBUG=False`, `NODE_ENV=production`)
- Verifica che `ALLOWED_HOSTS` e `CORS_ALLOWED_ORIGINS` in questo file (o nelle variabili d'ambiente del `docker-compose.prod.yml`) siano configurati con il tuo dominio reale

##### Configurazione del Firewall (UFW)
Assicurati che le porte 80 (HTTP) e 443 (HTTPS) siano aperte sul firewall del tuo server Ubuntu.

Esempio con UFW:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

##### Configurazione DNS
Punta il tuo dominio (es. `portale.example.com`) all'indirizzo IP pubblico del tuo server tramite i record DNS (Record A).

#### Avvio

```bash
chmod +x start-prod.sh
./start-prod.sh
```

Dopo l'avvio, il portale sarà accessibile tramite il tuo dominio reale (es. https://portale.example.com).

#### Monitoraggio
- Per visualizzare i log di tutti i servizi: `docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f`
- Per controllare lo stato dei servizi: `docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps`
- **Backup Database**: Il servizio `db_backup` creerà backup compressi del tuo database nella directory `./backups/` ogni 24 ore e rimuoverà quelli più vecchi di 7 giorni

### 5. Cambio Ambiente (Sviluppo <-> Produzione)

Usa lo script `switch-env.sh` per passare da un ambiente all'altro. Questo script fermerà e rimuoverà tutti i servizi Docker attivi prima di avviare il nuovo ambiente, garantendo una pulizia completa.

```bash
chmod +x switch-env.sh

# Per passare all'ambiente di sviluppo:
./switch-env.sh dev

# Per passare all'ambiente di produzione:
./switch-env.sh prod
```

## 🐛 Troubleshooting e Debugging

### Contenitori non si avviano / Errori all'avvio
- Controlla i log del servizio specifico: `docker-compose logs <nome_servizio>` (es. `docker-compose logs backend`)
- Forza una ricostruzione pulita: `docker-compose build --no-cache <nome_servizio>` o `docker-compose up --build`
- Assicurati che le porte non siano già in uso sull'host

### Problemi di connessione (es. 502 Bad Gateway da Nginx)
- Controlla i log di Nginx (`docker-compose logs nginx`)
- Verifica che i servizi backend e frontend siano healthy (`docker-compose ps`)
- Assicurati che le definizioni upstream in `nginx/nginx.conf` puntino ai nomi corretti dei servizi Docker (es. `backend:8000`, `frontend:3000`)

### Problemi SSL (certificati, HTTPS non funziona)
- Controlla i log di Nginx
- Verifica che i percorsi dei certificati in `nginx/nginx.conf` siano corretti e che i file esistano e abbiano i permessi giusti (`chmod 600`)
- Assicurati che i certificati non siano scaduti

### Problemi di permessi
- Assicurati che le directory mappate come volumi (es. `static_volume`, `media_volume`, `logs`, `backups`, `secrets`) abbiano i permessi corretti per l'utente non-root all'interno del container (es. `chown -R 1000:1000 <cartella>`)

## 🔒 Note sulla Sicurezza

- **Docker Secrets**: Utilizza sempre Docker Secrets per le informazioni sensibili in produzione
- **Utenti Non-Root**: I Dockerfile sono configurati per eseguire i processi all'interno dei container con utenti non-root, limitando i potenziali danni in caso di compromissione
- **Content Security Policy (CSP)**: Nginx è configurato con una CSP per mitigare attacchi XSS e altre vulnerabilità lato client. Personalizzala ulteriormente per la massima sicurezza
- **HSTS (HTTP Strict Transport Security)**: Nginx imposta HSTS per forzare i browser a usare solo connessioni HTTPS
- **Rate Limiting**: Nginx include configurazioni di base per il rate limiting per proteggere da attacchi DoS/DDoS
- **Aggiornamenti**: Mantieni Docker, Docker Compose, le immagini base (Python, Node, Postgres, Redis, Nginx) e le dipendenze delle applicazioni (Django, React) sempre aggiornate per beneficiare delle ultime patch di sicurezza
- **Backup**: Il servizio di backup automatico del database è essenziale per il ripristino in caso di perdita di dati. Assicurati che i backup siano archiviati in una posizione sicura e esterna al server principale
- **Firewall**: Configura un firewall (es. UFW) sul tuo server per limitare l'accesso alle sole porte necessarie (80, 443)