"""
Testes para API de Peça.
Cobre operações CRUD, filtros, busca, facetas e column_values.
"""

import pytest
from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from apps.catalog.models import Peca, Genero, Assinatura, Instancia, Livro, Midia


@pytest.mark.django_db
class TestPecaAPI(TestCase):
    """Testes de API para Peca"""
    
    @classmethod
    def setUpTestData(cls):
        """Criar dados de teste"""
        # Criar categorias
        cls.genero_conto = Genero.objects.create(id=1, nome="Conto")
        cls.genero_cronica = Genero.objects.create(id=2, nome="Crônica")
        
        cls.assinatura_machado = Assinatura.objects.create(id=1, nome="Machado")
        cls.assinatura_alceu = Assinatura.objects.create(id=2, nome="Alceu")
        
        cls.instancia1 = Instancia.objects.create(id=1, nome="Jornal")
        cls.instancia2 = Instancia.objects.create(id=2, nome="Livro")
        
        cls.midia1 = Midia.objects.create(id=1, nome="Jornal")
        
        cls.livro1 = Livro.objects.create(id=1, titulo="Memórias Póstumas")
        cls.livro2 = Livro.objects.create(id=2, titulo="Dom Casmurro")
        
        # Criar peças
        cls.peca1 = Peca.objects.create(
            id=1001,
            nome_obra="Memórias Póstumas de Brás Cubas",
            nome_obra_simples="Memorias Postumas de Bras Cubas",
            ano_publicacao=1899,
            genero=cls.genero_conto,
            assinatura=cls.assinatura_machado,
            instancia=cls.instancia2,
            livro=cls.livro1,
            midia=cls.midia1,
        )
        
        cls.peca2 = Peca.objects.create(
            id=1002,
            nome_obra="Dom Casmurro",
            ano_publicacao=1899,
            genero=cls.genero_conto,
            assinatura=cls.assinatura_machado,
            instancia=cls.instancia2,
            livro=cls.livro2,
            midia=cls.midia1,
        )
        
        cls.peca3 = Peca.objects.create(
            id=2001,
            nome_obra="&quot;Trivial&nbsp;Notícia&quot;",
            ano_publicacao=1880,
            mes_publicacao=3,
            genero=cls.genero_cronica,
            assinatura=cls.assinatura_alceu,
            instancia=cls.instancia1,
            midia=cls.midia1,
        )
    
    def setUp(self):
        self.client = APIClient()
    
    # ===== TESTES DE LIST =====
    
    def test_list_pecas_returns_200(self):
        """GET /api/v1/pecas/ deve retornar 200"""
        response = self.client.get(reverse('api:v1:peca-list'))
        assert response.status_code == 200
        assert 'results' in response.json()
        assert len(response.json()['results']) >= 1
    
    def test_list_pecas_has_pagination(self):
        """Resposta deve conter informações de paginação"""
        response = self.client.get(reverse('api:v1:peca-list'))
        data = response.json()
        assert 'pagination' in data or 'count' in data
    
    # ===== TESTES DE FILTROS =====
    
    def test_filter_by_ano(self):
        """Filtrar por ?ano=1899 deve retornar 2 peças"""
        response = self.client.get(
            reverse('api:v1:peca-list'),
            {'ano': 1899},
        )
        assert response.status_code == 200
        results = response.json()['results']
        assert len(results) >= 2
        assert all(r['ano_publicacao'] == 1899 for r in results)
    
    def test_filter_by_mes(self):
        """Filtrar por ?mes=3 deve retornar peça específica"""
        response = self.client.get(
            reverse('api:v1:peca-list'),
            {'mes': 3},
        )
        assert response.status_code == 200
        results = response.json()['results']
        assert len(results) >= 1
        assert all(r['mes_publicacao'] == 3 for r in results)
    
    def test_filter_by_genero_id(self):
        """Filtrar por ?genero_id=1 (Conto) deve retornar 2 peças"""
        response = self.client.get(
            reverse('api:v1:peca-list'),
            {'genero_id': 1},
        )
        assert response.status_code == 200
        results = response.json()['results']
        assert len(results) >= 2
    
    def test_filter_by_multiple_ids(self):
        """Filtrar por ?id=1001,1002 deve retornar 2 peças"""
        response = self.client.get(
            reverse('api:v1:peca-list'),
            {'id': '1001,1002'},
        )
        assert response.status_code == 200
        results = response.json()['results']
        ids = [r['id'] for r in results]
        assert 1001 in ids
        assert 1002 in ids
    
    # ===== TESTES DE BUSCA =====
    
    def test_search_by_name(self):
        """Buscar por 'Dom Casmurro' deve encontrar peça"""
        response = self.client.get(
            reverse('api:v1:peca-list'),
            {'search': 'Dom Casmurro'},
        )
        assert response.status_code == 200
        results = response.json()['results']
        assert len(results) >= 1
        assert any('Dom' in r.get('nome_obra', '') for r in results)
    
    def test_search_ignores_html_entities(self):
        """Busca deve ignorar HTML entities"""
        response = self.client.get(
            reverse('api:v1:peca-list'),
            {'search': 'Trivial'},
        )
        assert response.status_code == 200
        results = response.json()['results']
        # Deve encontrar peça com "&quot;Trivial&nbsp;...&quot;"
        assert len(results) >= 1
    
    # ===== TESTES DE FACETAS =====
    
    def test_facetas_returns_categories(self):
        """GET /api/v1/pecas/facetas/ deve retornar categorias"""
        response = self.client.get(reverse('api:v1:peca-facetas'))
        assert response.status_code == 200
        data = response.json()
        assert 'generos' in data
        assert 'assinaturas' in data
        assert 'instancias' in data
        assert 'livros' in data
        assert 'midias' in data
    
    def test_facetas_have_counts(self):
        """Cada faceta deve ter count de peças"""
        response = self.client.get(reverse('api:v1:peca-facetas'))
        data = response.json()
        
        for genero in data['generos']:
            assert 'id' in genero
            assert 'nome' in genero
            assert 'total' in genero
            assert genero['total'] > 0
    
    # ===== TESTES DE COLUMN VALUES =====
    
    def test_column_values_genero(self):
        """GET /api/v1/pecas/column_values/?column=genero"""
        response = self.client.get(
            reverse('api:v1:peca-column-values'),
            {'column': 'genero'},
        )
        assert response.status_code == 200
        data = response.json()
        assert data['column'] == 'genero'
        assert 'values' in data
        assert len(data['values']) >= 2
        
        genre_names = [v['value'] for v in data['values'] if not v.get('isBlank')]
        assert 'Conto' in genre_names
        assert 'Crônica' in genre_names
    
    def test_column_values_with_count(self):
        """Column values deve incluir count"""
        response = self.client.get(
            reverse('api:v1:peca-column-values'),
            {'column': 'genero'},
        )
        data = response.json()
        
        for value in data['values']:
            assert 'count' in value or value.get('isBlank')
    
    def test_column_values_handles_blank(self):
        """Column values deve incluir valores em branco se houver"""
        response = self.client.get(
            reverse('api:v1:peca-column-values'),
            {'column': 'ano_publicacao'},
        )
        data = response.json()
        values = data['values']
        
        # Pode ter ou não valores em branco, mas estrutura está correta
        for value in values:
            assert 'value' in value
            assert 'isBlank' in value
    
    def test_column_values_rejects_invalid_column(self):
        """Column values deve rejeitar colunas não permitidas"""
        response = self.client.get(
            reverse('api:v1:peca-column-values'),
            {'column': 'senha_admin'},  # coluna inválida
        )
        assert response.status_code == 403
    
    def test_column_values_requires_column_param(self):
        """Column values deve exigir parâmetro column"""
        response = self.client.get(
            reverse('api:v1:peca-column-values'),
        )
        assert response.status_code == 400
    
    # ===== TESTES DE DETAIL =====
    
    def test_detail_peca(self):
        """GET /api/v1/pecas/{id}/ deve retornar detalhes"""
        response = self.client.get(
            reverse('api:v1:peca-detail', args=[1001])
        )
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == 1001
        assert data['nome_obra'] == "Memórias Póstumas de Brás Cubas"
    
    def test_detail_missing_peca(self):
        """GET /api/v1/pecas/99999/ deve retornar 404"""
        response = self.client.get(
            reverse('api:v1:peca-detail', args=[99999])
        )
        assert response.status_code == 404
    
    # ===== TESTES DE PERMISSIONS =====
    
    def test_create_not_allowed(self):
        """POST não é suportado em endpoint somente-leitura"""
        response = self.client.post(
            reverse('api:v1:peca-list'),
            {'nome_obra': 'Nova Peça'},
        )
        assert response.status_code == 405  # Method Not Allowed (ReadOnly ViewSet)
    
    def test_list_is_public(self):
        """GET sem autenticação deve funcionar"""
        response = self.client.get(reverse('api:v1:peca-list'))
        assert response.status_code == 200


class TestHealthCheck(TestCase):
    """Testes do health check endpoint"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_health_check_returns_ok(self):
        """Health check deve retornar status ok"""
        response = self.client.get('/api/v1/health/')
        assert response.status_code == 200
        data = response.json()
        assert 'status' in data
        assert data['status'] in ['healthy', 'unhealthy']
    
    def test_health_check_has_checks(self):
        """Health check deve ter checks"""
        response = self.client.get('/api/v1/health/')
        data = response.json()
        assert 'checks' in data
        assert 'database' in data['checks']
