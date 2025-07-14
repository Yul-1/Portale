# backend/config/settings.py - Adeguato per la Produzione

import os
from pathlib import Path
# Importa config da python-decouple per leggere variabili d'ambiente in modo sicuro
from decouple import config, Csv
import dj_database_url # per configurare il DB da URL

BASE_DIR = Path(__file__).resolve().parent.parent

# DEBUG e SECRET_KEY da variabili d'ambiente (o Docker secrets)
# In produzione, queste variabili dovrebbero essere iniettate nell'ambiente del container
# o lette da file di secrets
SECRET_KEY = config('DJANGO_SECRET_KEY') # Legge la chiave da env var, che Docker Secrets espone da file
DEBUG = config('DEBUG', default=False, cast=bool) # Legge DEBUG da env var, default False

# ALLOWED_HOSTS e CORS_ALLOWED_ORIGINS da variabili d'ambiente
# In produzione, questi dovrebbero essere i tuoi domini reali
ALLOWED_HOSTS_str = config('DJANGO_ALLOWED_HOSTS', default='localhost,127.0.0.1')
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_str.split(',')]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    'api.apps.ApiConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

# Configurazione del database usando dj-database-url e Docker Secrets
# Le credenziali vengono lette dai file dei secrets montati in /run/secrets/
DB_USER = config('DB_USER')
DB_PASSWORD = config('DB_PASSWORD')

DATABASES = {
    'default': dj_database_url.config(
        default=f"postgres://{DB_USER}:{DB_PASSWORD}@{config('DB_HOST')}:{config('DB_PORT')}/{config('DB_NAME')}",
        conn_max_age=600 # Riutilizza connessioni al DB per performance
    )
}

LANGUAGE_CODE = 'it-it'
TIME_ZONE = 'Europe/Rome'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = '/app/staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media' # Percorso /app/media nel container

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        # In produzione, considera di usare TokenAuthentication o JWT
        # 'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        # In produzione, rimuovi BrowsableAPIRenderer per sicurezza
        # 'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# Impostazioni di sicurezza per HTTPS in produzione (basate su .env.production)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True # Permette a Django di vedere l'host reale dietro il proxy Nginx

SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=True, cast=bool)
SESSION_COOKIE_HTTPONLY = config('SESSION_COOKIE_HTTPONLY', default=True, cast=bool) # AGGIUNTO
SESSION_COOKIE_SAMESITE = config('SESSION_COOKIE_SAMESITE', default='Lax', cast=str) # AGGIUNTO (Strict o Lax)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=True, cast=bool)
CSRF_COOKIE_HTTPONLY = config('CSRF_COOKIE_HTTPONLY', default=True, cast=bool) # AGGIUNTO
CSRF_COOKIE_SAMESITE = config('CSRF_COOKIE_SAMESITE', default='Lax', cast=str) # AGGIUNTO (Strict o Lax)
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=True, cast=bool)
SECURE_CONTENT_TYPE_NOSNIFF = config('SECURE_CONTENT_TYPE_NOSNIFF', default=True, cast=bool) # AGGIUNTO
SECURE_BROWSER_XSS_FILTER = config('SECURE_BROWSER_XSS_FILTER', default=True, cast=bool) # AGGIUNTO
X_FRAME_OPTIONS = 'DENY' # AGGIUNTO per sicurezza (sovrascritto da Nginx in caso di SAMEORIGIN)

# CORS settings for production
CORS_ALLOWED_ORIGINS_str = config('CORS_ALLOWED_ORIGINS', default='')
CORS_ALLOWED_ORIGINS = [host.strip() for host in CORS_ALLOWED_ORIGINS_str.split(',')]

CORS_ALLOW_CREDENTIALS = True

# Email settings
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD') # Legge la password da env var, che Docker Secrets espone da file
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@yourdomain.com') # AGGIUNTO

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Impostazioni per il Logging in produzione
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/app/logs/django.log', # Salva su volume
            'maxBytes': 1024 * 1024 * 5,  # 5 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'gunicorn_access': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/app/logs/gunicorn-access.log',
            'maxBytes': 1024 * 1024 * 5,
            'backupCount': 5,
            'formatter': 'simple',
        },
        'gunicorn_error': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/app/logs/gunicorn-error.log',
            'maxBytes': 1024 * 1024 * 5,
            'backupCount': 5,
            'formatter': 'simple',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO', # O WARNING/ERROR in produzione per ridurre il verbosità
            'propagate': False,
        },
        'api': { # Log per la tua app 'api'
            'handlers': ['console', 'file'],
            'level': 'INFO', # O WARNING/ERROR
            'propagate': False,
        },
        'gunicorn.access': {
            'handlers': ['gunicorn_access'],
            'level': 'INFO',
            'propagate': False,
        },
        'gunicorn.error': {
            'handlers': ['gunicorn_error'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
    'root': { # Impostazioni predefinite per altri loggers non specificati
        'handlers': ['console', 'file'],
        'level': 'WARNING',
    }
}