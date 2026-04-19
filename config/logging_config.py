"""
Configuração de logging estruturado para Django.
Fornece logs JSON em produção e verbosos em desenvolvimento.
"""

import os
from pathlib import Path

DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"

# Handlers de arquivo apenas em desenvolvimento (Render não tem disco persistente)
if DEBUG:
    LOGS_DIR = Path(__file__).resolve().parent.parent / "logs"
    LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "simple": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
            "datefmt": "%H:%M:%S",
        },
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
        },
    },
    
    "filters": {
        "require_debug_true": {
            "()": "django.utils.log.RequireDebugTrue",
        },
        "require_debug_false": {
            "()": "django.utils.log.RequireDebugFalse",
        },
    },
    
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
}

# Adicionar file handlers apenas em desenvolvimento
if DEBUG:
    LOGGING["handlers"]["file"] = {
        "level": "INFO",
        "class": "logging.handlers.RotatingFileHandler",
        "filename": LOGS_DIR / "django.log",
        "maxBytes": 10_485_760,
        "backupCount": 5,
        "formatter": "verbose",
    }
    LOGGING["handlers"]["api_file"] = {
        "level": "INFO",
        "class": "logging.handlers.RotatingFileHandler",
        "filename": LOGS_DIR / "api.log",
        "maxBytes": 10_485_760,
        "backupCount": 5,
        "formatter": "verbose",
    }
    LOGGING["handlers"]["error_file"] = {
        "level": "ERROR",
        "class": "logging.handlers.RotatingFileHandler",
        "filename": LOGS_DIR / "errors.log",
        "maxBytes": 10_485_760,
        "backupCount": 10,
        "formatter": "verbose",
    }

# Loggers
_dev_handlers = ["console", "file", "error_file"] if DEBUG else ["console"]
_api_handlers = ["console", "api_file", "error_file"] if DEBUG else ["console"]

LOGGING["loggers"] = {
    "django": {
        "handlers": _dev_handlers,
        "level": os.getenv("LOG_LEVEL", "INFO"),
        "propagate": False,
    },
    "django.request": {
        "handlers": ["console", "file"] if DEBUG else ["console"],
        "level": "WARNING",
        "propagate": False,
    },
    "django.db.backends": {
        "handlers": ["console"],
        "level": "WARNING",
        "propagate": False,
    },
    "apps.catalog": {
        "handlers": _api_handlers,
        "level": os.getenv("LOG_LEVEL", "INFO"),
        "propagate": False,
    },
}
