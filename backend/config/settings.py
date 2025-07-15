# backend/config/settings.py - CORREZIONI CRITICHE PER EMAIL_HOST_PASSWORD E VARIABILI AMBIENTE

import os
from pathlib import Path
from decouple import config, Csv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

ENVIRONMENT = config('ENVIRONMENT', default='development')

# Funzione per leggere i secrets o le variabili d'ambiente (SENZA 'default' nella chiamata interna a config)
def get_env_var_or_secret(key): # Rimosso 'default_value=None' dalla firma
    try:
        if ENVIRONMENT == 'production':
            secret_path = f'/run/secrets/{key.lower()}' # Docker secrets sono in lowercase
            if os.path.exists(secret_path):
                with open(secret_path, 'r') as secret_file:
                    return secret_file.read().strip()
        # Se non è in produzione o il secret non esiste, prova come variabile d'ambiente standard
        # Qui NON passiamo default, sarà gestito dalla chiamata esterna alla funzione get_env_var_or_secret
        return config(key)
    except Exception as e:
        # Questo blocco viene raggiunto solo se config(key) fallisce senza un default
        print(f"Warning: Could not load {key} from Docker secret or environment variable: {e}")
        # Rilancia l'eccezione o gestisci diversamente se necessario.
        # Per ora, rilanciamo per forzare la definizione, o usiamo un default nella chiamata esterna.
        raise # Rilancia l'errore per UndefinedValueError se non c'è default esterno

SECRET_KEY = get_env_var_or_secret('DJANGO_SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)

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
DB_USER = get_env_var_or_secret('DB_USER')
DB_PASSWORD = get_env_var_or_secret('DB_PASSWORD')
DB_HOST = config('DB_HOST', default='db')
DB_PORT = config('DB_PORT', default='5432')
DB_NAME = config('DB_NAME', default='portale_db')

DATABASES = {
    'default': dj_database_url.config(
        default=f"postgres://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
        conn_max_age=600
    )
}

LANGUAGE_CODE = 'it-it'
TIME_ZONE = 'Europe/Rome'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = '/app/staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=True, cast=bool)
SESSION_COOKIE_HTTPONLY = config('SESSION_COOKIE_HTTPONLY', default=True, cast=bool)
SESSION_COOKIE_SAMESITE = config('SESSION_COOKIE_SAMESITE', default='Lax', cast=str)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=True, cast=bool)
CSRF_COOKIE_HTTPONLY = config('CSRF_COOKIE_HTTPONLY', default=True, cast=bool)
CSRF_COOKIE_SAMESITE = config('CSRF_COOKIE_SAMESITE', default='Lax', cast=str)
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=True, cast=bool)
SECURE_CONTENT_TYPE_NOSNIFF = config('SECURE_CONTENT_TYPE_NOSNIFF', default=True, cast=bool)
SECURE_BROWSER_XSS_FILTER = config('SECURE_BROWSER_XSS_FILTER', default=True, cast=bool)
X_FRAME_OPTIONS = 'DENY'

CORS_ALLOWED_ORIGINS_str = config('CORS_ALLOWED_ORIGINS', default='')
CORS_ALLOWED_ORIGINS = [host.strip() for host in CORS_ALLOWED_ORIGINS_str.split(',')]

CORS_ALLOW_CREDENTIALS = True

# Email settings - AGGIUNTO default values per evitare UndefinedValueError
# ORA GESTIAMO I DEFAULT FUORI dalla funzione get_env_var_or_secret
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='localhost') # <--- AGGIUNTO DEFAULT (importante per avvio)
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='user@example.com') # <--- AGGIUNTO DEFAULT
EMAIL_HOST_PASSWORD = get_env_var_or_secret('EMAIL_HOST_PASSWORD') # <--- Chiamata senza 'default' qui
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@yourdomain.com')

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
            'filename': '/app/logs/django.log',
            'maxBytes': 1024 * 1024 * 5,
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
            'level': 'INFO',
            'propagate': False,
        },
        'api': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
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
    'root': {
        'handlers': ['console', 'file'],
        'level': 'WARNING',
    }
}