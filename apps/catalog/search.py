"""
Full-text search implementation using Django ORM and SearchVectorField.
Provides efficient searching across Peca records.
"""

from typing import List, Dict, Any
from django.db.models import Q, F, Value, CharField, QuerySet, Count
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank


class FullTextSearchService:
    """
    Serviço para busca full-text em Peças.
    Usa PostgreSQL SearchVector para performance e relevância.
    """
    
    @staticmethod
    def build_search_vector():
        """
        Constrói o search vector combinando múltiplos campos.
        Pesos: A=títulos, B=assinatura/genero, C=outros
        """
        return (
            SearchVector('nome_obra', weight='A') +
            SearchVector('assinatura__nome', weight='B') +
            SearchVector('genero__nome', weight='B') +
            SearchVector('dados_publicacao', weight='C') +
            SearchVector('observacoes', weight='C')
        )
    
    @staticmethod
    def search(query: str, max_results: int = 100) -> QuerySet:
        """
        Realiza busca full-text com ranking de relevância.
        
        Args:
            query: Termo(s) de busca (ex: "crônica Machado")
            max_results: Limite de resultados
        
        Returns:
            QuerySet ordenado por relevância
        """
        if not query or not query.strip():
            return QuerySet().none()
        
        from apps.catalog.models import Peca
        
        # Preparar a query de busca
        search_query = SearchQuery(query, search_type='websearch')
        
        # Construir vector que será usado na query
        search_vector = FullTextSearchService.build_search_vector()
        
        # QuerySet com busca full-text e ranking
        results = (
            Peca.objects
            .annotate(
                search=search_vector,
                rank=SearchRank(search_vector, search_query)
            )
            .filter(search=search_query)
            .order_by('-rank', '-ano_publicacao', 'nome_obra')[:max_results]
            .select_related('assinatura', 'genero', 'instancia', 'livro', 'midia')
        )
        
        return results
    
    @staticmethod
    def search_with_highlights(query: str, max_results: int = 100) -> List[Dict[str, Any]]:
        """
        Busca full-text simples sem destaque (para compatibilidade).
        
        Args:
            query: Termo(s) de busca
            max_results: Limite de resultados
        
        Returns:
            Lista de dicts com resultado
        """
        if not query or not query.strip():
            return []
        
        from apps.catalog.models import Peca
        
        search_query = SearchQuery(query, search_type='websearch')
        search_vector = FullTextSearchService.build_search_vector()
        
        # Buscar resultados com ranking
        results = (
            Peca.objects
            .annotate(
                search=search_vector,
                rank=SearchRank(search_vector, search_query)
            )
            .filter(search=search_query)
            .order_by('-rank', '-ano_publicacao', 'nome_obra')[:max_results]
            .select_related('assinatura', 'genero', 'instancia', 'livro', 'midia')
            .values(
                'id',
                'nome_obra',
                'ano_publicacao',
                'assinatura__nome',
                'genero__nome',
                'rank'
            )
        )
        
        return list(results)
    
    @staticmethod
    def suggest_completions(partial_query: str, max_suggestions: int = 10) -> List[str]:
        """
        Retorna sugestões de completamento para autocomplete.
        Usa nomes de obras mais populares.
        
        Args:
            partial_query: Prefixo para completar (ex: "Cle")
            max_suggestions: Número máximo de sugestões
        
        Returns:
            Lista de strings com sugestões
        """
        if not partial_query or len(partial_query) < 2:
            return []
        
        from apps.catalog.models import Peca
        
        suggestions = (
            Peca.objects
            .filter(nome_obra__istartswith=partial_query)
            .values_list('nome_obra', flat=True)
            .distinct()
            .order_by('nome_obra')[:max_suggestions]
        )
        
        return list(suggestions)

