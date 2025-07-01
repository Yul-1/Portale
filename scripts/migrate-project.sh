#!/bin/bash
# Script per migrare dalla vecchia struttura alla nuova

set -e

echo "🔄 Migrating project structure..."

# Backup current docker state
docker-compose -f docker-compose.secure.yml down || true
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down || true

# Rename Dockerfiles
[ -f backend/Dockerfile.secure ] && mv backend/Dockerfile.secure backend/Dockerfile
[ -f frontend/Dockerfile.secure ] && mv frontend/Dockerfile.secure frontend/Dockerfile
[ -f nginx/nginx.secure.conf ] && mv nginx/nginx.secure.conf nginx/nginx.conf

# Mark old files as obsolete
[ -f docker-compose.secure.yml ] && mv docker-compose.secure.yml docker-compose.secure.yml.obsolete
[ -f start-secure.sh ] && mv start-secure.sh start-secure.sh.obsolete
[ -f restart-secure.sh ] && mv restart-secure.sh restart-secure.sh.obsolete
[ -f backup-secure.sh ] && mv backup-secure.sh backup-secure.sh.obsolete
[ -f dc-secure ] && mv dc-secure dc-secure.obsolete

echo "✅ Migration complete!"