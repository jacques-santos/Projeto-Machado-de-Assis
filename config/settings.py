import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# SECRET_KEY: usar variável de ambiente ou gerar automaticamente em dev
_env_secret = os.getenv("DJANGO_SECRET_KEY", "")
if _env_secret:
    SECRET_KEY = _env_secret
else:
    import secrets as _secrets
    SECRET_KEY = "".join(
        _secrets.choice("abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)")
        for _ in range(50)
    )

# Permitir qualquer subdomínio do ngrok automaticamente
if DEBUG:
    ALLOWED_HOSTS += [".ngrok-free.app", ".ngrok.io"]

# Validar configuração em produção
if not DEBUG and not _env_secret:
    raise ValueError(
        "DJANGO_SECRET_KEY não foi configurada! "
        "Configure em variável de ambiente para produção."
    )

# DATABASE_URL é obrigatório
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL não configurada! "
        "Configure em variável de ambiente ou arquivo .env"
    )


def database_config_from_url(database_url: str) -> dict:
    parsed = urlparse(database_url)
    query = parse_qs(parsed.query)

    engine_map = {
        "postgres": "django.db.backends.postgresql",
        "postgresql": "django.db.backends.postgresql",
    }
    engine = engine_map.get(parsed.scheme)
    if not engine:
        raise ValueError(f"Esquema de banco não suportado: {parsed.scheme}")

    return {
        "ENGINE": engine,
        "NAME": parsed.path.lstrip("/"),
        "USER": parsed.username or "",
        "PASSWORD": parsed.password or "",
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or 5432),
        "OPTIONS": {
            "sslmode": query.get("sslmode", [os.getenv("POSTGRES_SSLMODE", "require")])[0],
        },
    }


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "django_filters",
    "tinymce",
    "apps.catalog",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "config.middleware.SecurityHeadersMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": database_config_from_url(DATABASE_URL),
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [
    BASE_DIR / "static",
]

# Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ===== TINYMCE =====
TINYMCE_DEFAULT_CONFIG = {
    "height": 300,
    "width": "100%",
    "menubar": "edit format",
    "plugins": "advlist autolink lists link charmap preview anchor searchreplace "
               "visualblocks code fullscreen insertdatetime table wordcount",
    "toolbar": "undo redo | bold italic underline strikethrough | "
               "forecolor backcolor | fontselect fontsizeselect | "
               "alignleft aligncenter alignright alignjustify | "
               "bullist numlist outdent indent | link | "
               "removeformat | code",
    "language": "pt_BR",
}

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "config.pagination.StandardPagination",
    "PAGE_SIZE": int(os.getenv("API_PAGE_SIZE", "25")),
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "config.throttles.AnonUserThrottle",
        "config.throttles.AuthenticatedUserThrottle",
    ],
}

# ===== OPENAPI / SWAGGER =====
SPECTACULAR_SETTINGS = {
    "TITLE": "Projeto Machado de Assis API",
    "DESCRIPTION": "API para acesso ao catálogo de obras de Machado de Assis",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": "/api/v1/",
    "PREPROCESSING_HOOKS": [
        "config.openapi.preprocess_filter_parameters",
    ],
}

# ===== CACHING =====
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

# Usar Redis se disponível (produção), senão usar LocMemCache (desenvolvimento/testes)
if os.getenv("USE_REDIS_CACHE", "false").lower() == "true" or not DEBUG:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "SOCKET_CONNECT_TIMEOUT": 5,
                "SOCKET_TIMEOUT": 5,
                "COMPRESSOR": "django_redis.compressors.zlib.ZlibCompressor",
                "IGNORE_EXCEPTIONS": True,  # Não quebrar se Redis indisponível
            },
            "KEY_PREFIX": "machado",
            "TIMEOUT": 3600,  # 1 hora padrão
        }
    }
else:
    # Usar cache em memória para desenvolvimento/testes
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "machado-cache",
            "TIMEOUT": 3600,
        }
    }

# Configurações específicas de cache por tipo
CACHE_TIMEOUTS = {
    "column_values": int(os.getenv("CACHE_TIMEOUT_COLUMN_VALUES", "3600")),  # 1 hora
    "facetas": int(os.getenv("CACHE_TIMEOUT_FACETAS", "7200")),  # 2 horas
    "search": int(os.getenv("CACHE_TIMEOUT_SEARCH", "1800")),  # 30 minutos
}

# ===== LOGGING =====
from config.logging_config import LOGGING

# ===== SECURITY =====
if not DEBUG:
    # HTTPS e headers de segurança
    SECURE_HSTS_SECONDS = 31536000  # 1 ano
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    
    # Content Security Policy básica
    SECURE_CONTENT_SECURITY_POLICY = {
        "default-src": ("'self'",),
        "script-src": ("'self'", "'unsafe-inline'"),  # TODO: remover unsafe-inline
        "style-src": ("'self'", "'unsafe-inline'"),
        "img-src": ("'self'", "data:", "https:"),
        "font-src": ("'self'",),
    }
