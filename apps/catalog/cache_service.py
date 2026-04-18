"""
Cache Service - Gerencia cache de dados do catálogo

Implementa cache com invalidação automática para:
- column_values: Valores únicos de colunas (nome_obra, data_publicacao, etc)
- facetas: Agregações numéricas (contagens, totais, etc)
- search: Resultados de busca (com ranking)

Cache é invalidado automaticamente quando peças são criadas/atualizadas/deletadas.
"""

import logging
import hashlib
from django.core.cache import cache
from django.conf import settings
from typing import Any, Optional, List, Dict

logger = logging.getLogger(__name__)


class CacheService:
    """Serviço centralizado para gerenciamento de cache do catálogo."""

    # Prefixos de chave para diferentes tipos de cache
    COLUMN_VALUES_PREFIX = "col_vals"
    FACETAS_PREFIX = "facetas"
    SEARCH_PREFIX = "search"

    @staticmethod
    def get_cache_timeout(cache_type: str) -> int:
        """Retorna timeout para tipo de cache específico."""
        timeouts = getattr(settings, "CACHE_TIMEOUTS", {})
        return timeouts.get(cache_type, 3600)  # 1 hora padrão

    @staticmethod
    def make_key(prefix: str, identifier: str) -> str:
        """
        Gera chave de cache com prefixo.
        
        Args:
            prefix: Prefixo do sistema (COLUMN_VALUES_PREFIX, etc)
            identifier: Identificador específico (coluna, filtros, etc)
        
        Returns:
            Chave de cache única
        """
        # Limpar identificador para evitar caracteres problemáticos
        clean_id = hashlib.md5(identifier.encode()).hexdigest()
        return f"{prefix}:{clean_id}"

    @classmethod
    def get_column_values_cache_key(cls, column_name: str, **filters) -> str:
        """Gera chave de cache para column_values."""
        filter_str = "|".join([f"{k}={v}" for k, v in sorted(filters.items())])
        identifier = f"{column_name}:{filter_str}" if filter_str else column_name
        return cls.make_key(cls.COLUMN_VALUES_PREFIX, identifier)

    @classmethod
    def get_facetas_cache_key(cls, **filters) -> str:
        """Gera chave de cache para facetas."""
        filter_str = "|".join([f"{k}={v}" for k, v in sorted(filters.items())])
        return cls.make_key(cls.FACETAS_PREFIX, filter_str or "all")

    @classmethod
    def get_search_cache_key(cls, query: str, **params) -> str:
        """Gera chave de cache para resultados de busca."""
        param_str = "|".join([f"{k}={v}" for k, v in sorted(params.items())])
        identifier = f"{query}:{param_str}" if param_str else query
        return cls.make_key(cls.SEARCH_PREFIX, identifier)

    @classmethod
    def get_column_values(
        cls,
        column_name: str,
        default: Optional[Any] = None,
        **filters
    ) -> Optional[Any]:
        """
        Obtém valores de coluna do cache.
        
        Args:
            column_name: Nome da coluna (ex: 'nome_obra')
            default: Valor padrão se não encontrado
            **filters: Filtros adicionais para a chave
        
        Returns:
            Dados do cache ou None
        """
        key = cls.get_column_values_cache_key(column_name, **filters)
        value = cache.get(key, default)
        
        if value is not None:
            logger.debug(f"Cache HIT: {key}")
        else:
            logger.debug(f"Cache MISS: {key}")
        
        return value

    @classmethod
    def set_column_values(
        cls,
        column_name: str,
        data: Any,
        **filters
    ) -> None:
        """
        Armazena valores de coluna no cache.
        
        Args:
            column_name: Nome da coluna
            data: Dados a armazenar
            **filters: Filtros adicionais para a chave
        """
        key = cls.get_column_values_cache_key(column_name, **filters)
        timeout = cls.get_cache_timeout("column_values")
        cache.set(key, data, timeout)
        logger.debug(f"Cache SET: {key} (timeout={timeout}s)")

    @classmethod
    def get_facetas(
        cls,
        default: Optional[Any] = None,
        **filters
    ) -> Optional[Any]:
        """
        Obtém dados de facetas do cache.
        
        Args:
            default: Valor padrão se não encontrado
            **filters: Filtros para a chave
        
        Returns:
            Dados do cache ou None
        """
        key = cls.get_facetas_cache_key(**filters)
        value = cache.get(key, default)
        
        if value is not None:
            logger.debug(f"Cache HIT: {key}")
        else:
            logger.debug(f"Cache MISS: {key}")
        
        return value

    @classmethod
    def set_facetas(cls, data: Any, **filters) -> None:
        """
        Armazena dados de facetas no cache.
        
        Args:
            data: Dados a armazenar
            **filters: Filtros para a chave
        """
        key = cls.get_facetas_cache_key(**filters)
        timeout = cls.get_cache_timeout("facetas")
        cache.set(key, data, timeout)
        logger.debug(f"Cache SET: {key} (timeout={timeout}s)")

    @classmethod
    def get_search(
        cls,
        query: str,
        default: Optional[Any] = None,
        **params
    ) -> Optional[Any]:
        """
        Obtém resultados de busca do cache.
        
        Args:
            query: Termo de busca
            default: Valor padrão se não encontrado
            **params: Parâmetros de busca (limit, offset, etc)
        
        Returns:
            Dados do cache ou None
        """
        key = cls.get_search_cache_key(query, **params)
        value = cache.get(key, default)
        
        if value is not None:
            logger.debug(f"Cache HIT: {key}")
        else:
            logger.debug(f"Cache MISS: {key}")
        
        return value

    @classmethod
    def set_search(cls, query: str, data: Any, **params) -> None:
        """
        Armazena resultados de busca no cache.
        
        Args:
            query: Termo de busca
            data: Dados a armazenar
            **params: Parâmetros de busca
        """
        key = cls.get_search_cache_key(query, **params)
        timeout = cls.get_cache_timeout("search")
        cache.set(key, data, timeout)
        logger.debug(f"Cache SET: {key} (timeout={timeout}s)")

    @classmethod
    def invalidate_all(cls) -> None:
        """Limpa todo o cache do catálogo."""
        logger.info("Invalidando todo o cache do catálogo")
        try:
            # Tentar usar delete_pattern se disponível (django-redis)
            cache.delete_pattern(f"{cls.COLUMN_VALUES_PREFIX}:*")
            cache.delete_pattern(f"{cls.FACETAS_PREFIX}:*")
            cache.delete_pattern(f"{cls.SEARCH_PREFIX}:*")
        except (AttributeError, NotImplementedError):
            # Fallback: limpar todo cache
            cache.clear()

    @classmethod
    def invalidate_column_values(cls) -> None:
        """Invalida cache de column_values (chamado ao criar/atualizar peça)."""
        logger.info("Invalidando cache de column_values")
        try:
            cache.delete_pattern(f"{cls.COLUMN_VALUES_PREFIX}:*")
        except (AttributeError, NotImplementedError):
            # Fallback: limpar todo cache se esse método não existir
            cache.clear()

    @classmethod
    def invalidate_facetas(cls) -> None:
        """Invalida cache de facetas."""
        logger.info("Invalidando cache de facetas")
        try:
            cache.delete_pattern(f"{cls.FACETAS_PREFIX}:*")
        except (AttributeError, NotImplementedError):
            cache.clear()

    @classmethod
    def invalidate_search(cls) -> None:
        """Invalida cache de busca."""
        logger.info("Invalidando cache de busca")
        try:
            cache.delete_pattern(f"{cls.SEARCH_PREFIX}:*")
        except (AttributeError, NotImplementedError):
            cache.clear()

    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        """
        Retorna estatísticas de cache (informativo apenas).
        
        Returns:
            Dicionário com estatísticas
        """
        try:
            # Tentar obter informações do Redis
            # Nota: A implementação exata depende do backend Redis
            stats = {
                "backend": settings.CACHES["default"]["BACKEND"],
                "location": settings.CACHES["default"]["LOCATION"],
                "status": "operational",
            }
        except Exception as e:
            stats = {
                "status": "unavailable",
                "error": str(e),
            }
        
        return stats
