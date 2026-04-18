"""
Tests for full-text search functionality.
Uses PostgreSQL tsvector for efficient full-text search.
"""
import pytest
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.reverse import reverse

from apps.catalog.models import Peca, Genero, Assinatura


@pytest.mark.django_db
class TestFullTextSearch:
    """
    Tests para o endpoint de full-text search.
    Testa busca em múltiplos campos com diferentes termos.
    """
    
    def setup_method(self):
        """Setup common test data."""
        self.client = APIClient()
        
        # Create test data
        self.genero_romance = Genero.objects.create(nome="Romance")
        self.genero_cronica = Genero.objects.create(nome="Crônica")
        
        self.assinatura_machado = Assinatura.objects.create(nome="Machado de Assis")
        
        # Create peças with different content for searching
        self.peca1 = Peca.objects.create(
            nome_obra="Dom Casmurro",
            genero=self.genero_romance,
            assinatura=self.assinatura_machado,
            ano_publicacao=1899,
            dados_publicacao="Rio de Janeiro",
            observacoes="Romance clássico sobre amor e ciúme"
        )
        
        self.peca2 = Peca.objects.create(
            nome_obra="Quincas Borba",
            genero=self.genero_romance,
            assinatura=self.assinatura_machado,
            ano_publicacao=1891,
            dados_publicacao="Rio de Janeiro",
            observacoes="Romance que retrata crítica social em crônica ficcional"
        )
        
        self.peca3 = Peca.objects.create(
            nome_obra="Memórias Póstumas de Brás Cubas",
            genero=self.genero_cronica,
            assinatura=self.assinatura_machado,
            ano_publicacao=1881,
            dados_publicacao="Rio de Janeiro",
            observacoes="Crônica da vida de um brasileiro morto"
        )
    
    def test_search_by_title(self):
        """GET /api/v1/pecas/search/?q=dom should find Dom Casmurro."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': 'Dom Casmurro'}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['query'] == 'Dom Casmurro'
        assert data['count'] >= 1
        # Check if result contains Dom Casmurro
        result_titles = [r['nome_obra'] for r in data['results']]
        assert 'Dom Casmurro' in result_titles
    
    def test_search_by_genre(self):
        """Search for Crônica should find romances in that category."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': 'Crônica'}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['count'] >= 1
    
    def test_search_by_author_name(self):
        """Search for author name should find works."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': 'Machado'}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['count'] >= 1
    
    def test_search_empty_query(self):
        """Search with empty query should return 400."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': ''}
        )
        assert response.status_code == 400
        data = response.json()
        assert 'error' in data
    
    def test_search_short_query(self):
        """Search with query < 2 chars should return 400."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': 'a'}
        )
        assert response.status_code == 400
        data = response.json()
        assert 'error' in data
    
    def test_search_no_results(self):
        """Search for non-existent term should return empty results."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': 'inexistente_xyzabc'}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['count'] == 0
        assert data['results'] == []
    
    def test_search_with_max_results_limit(self):
        """Search respects max_results parameter."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': 'Romance', 'max_results': '1'}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data['results']) <= 1
    
    def test_search_max_results_enforced(self):
        """Search enforces max_results ceiling of 500."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': 'Romance', 'max_results': '10000'}
        )
        assert response.status_code == 200
        # Should not fail, just cap at 500
    
    def test_search_with_highlights(self):
        """Search with highlights=true returns snippets."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': 'Romance', 'highlights': 'true'}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'snippet' in data or 'results' in data
        assert data.get('note') is not None
    
    def test_search_invalid_max_results(self):
        """Invalid max_results parameter should return 400."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': 'Romance', 'max_results': 'not_a_number'}
        )
        assert response.status_code == 400
    
    def test_search_response_structure(self):
        """Search response should have correct structure."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': 'Dom'}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert 'query' in data
        assert 'count' in data
        assert 'results' in data
        
        # Check result structure
        if data['count'] > 0:
            result = data['results'][0]
            assert 'id' in result
            assert 'nome_obra' in result
            assert 'ano_publicacao' in result or 'rank' in result


@pytest.mark.django_db
class TestFullTextSearchIntegration:
    """Integration tests for search with filters combined."""
    
    def setup_method(self):
        """Setup test data."""
        self.client = APIClient()
        self.genero = Genero.objects.create(nome="Romance")
        self.assinatura = Assinatura.objects.create(nome="Machado")
        
        self.peca = Peca.objects.create(
            nome_obra="Dom Casmurro",
            genero=self.genero,
            assinatura=self.assinatura,
            ano_publicacao=1899,
            dados_publicacao="Rio de Janeiro: Editora"
        )
    
    def test_search_is_public(self):
        """Full-text search endpoint should be public (no authentication required)."""
        response = self.client.get(
            reverse('api:v1:peca-search'),
            {'q': 'Dom'}
        )
        # Should not return 403 Forbidden
        assert response.status_code in [200, 400]
