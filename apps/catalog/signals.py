"""
Signal Handlers - Invalida cache automaticamente ao modificar dados

Conectado aos sinais de create/update/delete do modelo Peca para:
- Invalidar column_values cache
- Invalidar facetas cache
- Invalidar resultados de busca
"""

import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.catalog.models import Peca
from apps.catalog.cache_service import CacheService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Peca)
def invalidate_cache_on_peca_save(sender, instance, created, **kwargs):
    """
    Invalida cache quando uma Peca é criada ou atualizada.
    
    Args:
        sender: Modelo que enviou o sinal (Peca)
        instance: Instância do modelo salvo
        created: True se foi create, False se foi update
    """
    action = "criada" if created else "atualizada"
    logger.info(f"Peca {instance.id} {action}. Invalidando cache...")
    
    # Invalidar todos os caches relacionados a Peca
    CacheService.invalidate_column_values()
    CacheService.invalidate_facetas()
    CacheService.invalidate_search()


@receiver(post_delete, sender=Peca)
def invalidate_cache_on_peca_delete(sender, instance, **kwargs):
    """
    Invalida cache quando uma Peca é deletada.
    
    Args:
        sender: Modelo que enviou o sinal (Peca)
        instance: Instância do modelo deletado
    """
    logger.info(f"Peca {instance.id} deletada. Invalidando cache...")
    
    # Invalidar todos os caches relacionados a Peca
    CacheService.invalidate_column_values()
    CacheService.invalidate_facetas()
    CacheService.invalidate_search()
