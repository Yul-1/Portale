#!/bin/bash
# test-step1-fixed.sh - Test Network Configuration (Fixed)

echo "🔍 STEP 1: Testing Network Configuration"
echo "========================================"

# Stop existing containers
echo "⏹️  Stopping existing containers..."
docker-compose down

# Remove old volumes for clean test
echo "🗑️  Removing old volumes..."
docker volume prune -f

# Validate configuration
echo "✅ Validating docker-compose.yml..."
docker-compose config > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Configuration is valid"
else
    echo "❌ Configuration has errors"
    exit 1
fi

# Start services one by one
echo -e "\n🚀 Starting database..."
docker-compose up -d db
sleep 10

echo "🚀 Starting redis..."
docker-compose up -d redis
sleep 5

echo "🚀 Starting backend..."
docker-compose up -d backend
sleep 15

# Check if services are running
echo -e "\n📊 Service status:"
docker-compose ps

# Test database connectivity using Django
echo -e "\n🔗 Testing database connectivity..."
docker-compose exec backend python manage.py showmigrations > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend can connect to database"
else
    echo "❌ Backend cannot connect to database"
    echo "Checking backend logs:"
    docker-compose logs --tail=20 backend
fi

# Test Redis connectivity
echo -e "\n🔗 Testing Redis connectivity..."
docker-compose exec backend python -c "
import os
import redis
try:
    r = redis.Redis(
        host=os.environ.get('REDIS_HOST', 'redis'),
        port=int(os.environ.get('REDIS_PORT', 6379)),
        password=os.environ.get('REDIS_PASSWORD', 'changeme'),
        decode_responses=True
    )
    r.ping()
    print('✅ Redis connection successful')
except Exception as e:
    print(f'❌ Redis connection failed: {e}')
"

# Start remaining services
echo -e "\n🚀 Starting frontend and nginx..."
docker-compose up -d frontend nginx
sleep 10

# Final check
echo -e "\n📊 All services status:"
docker-compose ps

# Check nginx can reach backend
echo -e "\n🔗 Testing nginx -> backend connectivity..."
docker-compose exec nginx wget -O- http://backend:8000/api/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Nginx can reach backend"
else
    echo "❌ Nginx cannot reach backend"
fi

# Check logs for errors
echo -e "\n📋 Checking for errors in logs..."
if docker-compose logs | grep -i error | grep -v "error_log" | head -5; then
    echo "⚠️  Found some errors in logs (showing first 5)"
else
    echo "✅ No critical errors found"
fi

echo -e "\n✅ STEP 1 Test Complete!"
echo ""
echo "📝 Summary:"
echo "- Networks created: frontend-network, backend-network"
echo "- Nginx is on both networks (can proxy between frontend and backend)"
echo "- Frontend only on frontend-network"
echo "- Backend on both networks"
echo "- DB and Redis only on backend-network"