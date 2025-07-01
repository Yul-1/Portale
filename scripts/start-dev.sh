#!/bin/bash
set -e

echo "🚀 Starting development environment..."

# Check .env
if [ ! -f .env ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration"
    exit 1
fi

# Load environment
export $(cat .env | grep -v '^#' | xargs)

# Generate SSL if needed
if [ ! -f nginx/ssl/cert.pem ]; then
    echo "🔐 Generating SSL certificates..."
    mkdir -p nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=IT/ST=Tuscany/L=Florence/O=Portale/CN=localhost"
fi

# Create directories
mkdir -p logs backups

# Start services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

echo "⏳ Waiting for services..."
sleep 10

# Show status
docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps

echo "✅ Development environment ready!"
echo "🌐 Access: https://localhost"
echo "👤 Admin: https://localhost/admin (admin/adminpassword)"
echo "📊 Logs: docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f"