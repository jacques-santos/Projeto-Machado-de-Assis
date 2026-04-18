"""
Configuração pytest para o projeto.
Fixtures e configurações globais para testes.
"""

import os
import django
from django.conf import settings

# Garantir que Django está configurado
if not settings.configured:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
