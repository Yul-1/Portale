# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a modern containerized web portal built with a microservices architecture using Docker Compose. The system consists of:

- **Backend**: Django REST API with PostgreSQL database
- **Frontend**: React TypeScript application with Material-UI
- **Infrastructure**: Nginx reverse proxy, Redis cache, automated backups
- **Deployment**: Docker Compose orchestration with separate dev/prod configurations

## Development Commands

### Environment Management
```bash
# Setup initial secrets and SSL certificates
./setup-secrets.sh

# Start development environment
./start-dev.sh

# Start production environment  
./start-prod.sh

# Switch between environments
./switch-env.sh dev    # Switch to development
./switch-env.sh prod   # Switch to production
```

### Frontend Development
```bash
# Navigate to frontend directory
cd frontend/

# Install dependencies
npm install

# Start development server (inside container)
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Backend Development
```bash
# Navigate to backend directory
cd backend/

# Run Django management commands
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic
python manage.py createsuperuser

# Run tests (framework not specified - check for test runner)
python manage.py test
```

### Docker Operations
```bash
# View logs for all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# View logs for specific service
docker-compose logs <service_name>

# Check service status
docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps

# Rebuild specific service
docker-compose build --no-cache <service_name>

# Force clean rebuild
docker-compose up --build
```

## Code Structure

### Backend (`/backend`)
- `api/` - Main Django app with models, serializers, views
- `config/` - Django project configuration and settings
- `manage.py` - Django management script
- `requirements/` - Python dependencies (base.txt, dev.txt, prod.txt)

### Frontend (`/frontend`)
- `src/pages/` - React page components
- `src/services/` - API service layer (api.ts)
- `package.json` - React app using TypeScript with Material-UI

### Infrastructure
- `nginx/` - Nginx configuration files
- `scripts/` - Environment management scripts
- `secrets/` - Docker secrets (excluded from git)
- `database/init/` - PostgreSQL initialization

## Configuration Files

### Environment-Specific Docker Compose
- `docker-compose.yml` - Base configuration
- `docker-compose.dev.yml` - Development overrides
- `docker-compose.prod.yml` - Production overrides

### Key Settings
- **Backend**: Django settings in `backend/config/settings.py`
- **Frontend**: React environment variables in Docker Compose
- **Database**: PostgreSQL with health checks
- **Cache**: Redis for session storage and caching
- **Proxy**: Nginx with SSL termination

## Image Management

### Current Implementation
- **Static Images**: Served from `/frontend/public/images/alloggi/`
- **Circular Display**: CSS handles automatic cropping with `object-fit: cover`
- **Fallback**: Placeholder images on error via `onError` handler
- **Location**: `HomePage.tsx:17-23` shows image path structure

### Image Storage Pattern
```
frontend/public/images/alloggi/
├── casa-iperione.jpg
├── villa-aurora.jpg
└── [alloggio-name].jpg
```

### Database Models
- `Alloggio` model with basic accommodation info
- `FotoAlloggio` model for multiple images per accommodation
- Serializers support both URL-based and media file approaches

## Development Workflow

1. Use `./start-dev.sh` to start development environment
2. Frontend available at `https://localhost`
3. Django admin at `https://localhost/admin`
4. API root at `https://localhost/api`
5. Default admin credentials: admin/adminpassword (dev only)

## Security Considerations

- SSL certificates in `nginx/ssl/` (self-signed for dev)
- Docker secrets for sensitive data
- Non-root users in containers
- CORS configuration for frontend-backend communication
- Rate limiting and CSP headers in Nginx

## Testing

- Frontend: `npm test` (React Testing Library)
- Backend: Django test framework via `python manage.py test`
- Check specific test commands in application code

## Backup & Monitoring

- Automated PostgreSQL backups to `./backups/` (production)
- Log aggregation in `logs/` directory
- Health checks for all services
- 24-hour backup retention with 7-day cleanup