from django.db.models import Count
from django.utils.timezone import now
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
import logging

from .models import Assinatura, Genero, Instancia, Livro, LocalPublicacao, Midia, Peca
from .permissions import IsAdminOrReadOnly
from .serializers import (
    AssinaturaSerializer,
    GeneroSerializer,
    InstanciaSerializer,
    LivroSerializer,
    LocalPublicacaoSerializer,
    MidiaSerializer,
    PecaDetailSerializer,
    PecaListSerializer,
)
from .filters import PecaFilterService
from .search import FullTextSearchService
from .exceptions import InvalidFilterError, ColumnNotAllowedError
from .utils import sanitize_html_value

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    Health check com verificações de dependências.
    Retorna 503 Service Unavailable se BD não responder.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        from django.db import connection
        
        health = {
            "status": "healthy",
            "checks": {},
            "timestamp": now().isoformat(),
        }
        
        # Check database
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            health["checks"]["database"] = {"status": "ok"}
        except Exception as e:
            logger.error(f"Database health check failed: {e}", exc_info=True)
            health["status"] = "unhealthy"
            health["checks"]["database"] = {
                "status": "error",
                "error": "Database connection failed",
            }
            return Response(health, status=503)
        
        status_code = 200 if health["status"] == "healthy" else 503
        return Response(health, status=status_code)



class ReadOnlyBaseViewSet(viewsets.ReadOnlyModelViewSet):
    search_fields = ["nome"]
    ordering_fields = ["nome"]
    ordering = ["nome"]


class AssinaturaViewSet(ReadOnlyBaseViewSet):
    queryset = Assinatura.objects.all()
    serializer_class = AssinaturaSerializer


class GeneroViewSet(ReadOnlyBaseViewSet):
    queryset = Genero.objects.all()
    serializer_class = GeneroSerializer


class MidiaViewSet(ReadOnlyBaseViewSet):
    queryset = Midia.objects.all()
    serializer_class = MidiaSerializer


class InstanciaViewSet(ReadOnlyBaseViewSet):
    queryset = Instancia.objects.all()
    serializer_class = InstanciaSerializer


class LocalPublicacaoViewSet(ReadOnlyBaseViewSet):
    queryset = LocalPublicacao.objects.all()
    serializer_class = LocalPublicacaoSerializer


class LivroViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Livro.objects.all()
    serializer_class = LivroSerializer
    search_fields = ["titulo"]
    ordering_fields = ["titulo"]
    ordering = ["titulo"]


class PecaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet somente-leitura para Peça com suporte a filtros, busca, facetas e column_values.
    
    Query params suportados:
    - ?ano=1870              → ano_publicacao
    - ?mes=3                 → mes_publicacao
    - ?genero_id=5           → genero_id
    - ?assinatura_id=2       → assinatura_id
    - ?search=crônica        → busca em nome_obra, genero, observações, etc
    - ?page=2                → página (1-indexed)
    - ?page_size=50          → 25-5000 itens por página
    - ?ordering=-ano_publicacao  → ordenação (- para desc)
    """
    queryset = (
        Peca.objects.select_related(
            "assinatura",
            "genero",
            "instancia",
            "local_publicacao",
            "midia",
            "livro",
        )
        .prefetch_related("imagens")
        .all()
    )
    # search is handled by PecaFilterService.apply_filters (supports text + numeric + date)
    search_fields = []
    ordering_fields = [
        "id",
        "ano_publicacao",
        "mes_publicacao",
        "data_publicacao",
        "data_ordenacao",
        "nome_obra",
        "assinatura",
        "genero",
        "instancia",
        "local_publicacao",
        "midia",
    ]
    ordering = ["-data_ordenacao", "nome_obra"]

    def get_serializer_class(self):
        if self.action == "list":
            return PecaListSerializer
        return PecaDetailSerializer

    def get_queryset(self):
        """Aplica filtros ao queryset usando PecaFilterService."""
        queryset = super().get_queryset()
        
        try:
            filtered_qs, applied_filters = PecaFilterService.apply_filters(
                queryset,
                self.request.query_params
            )
            
            if applied_filters:
                logger.debug(f"Filters applied to query: {applied_filters}")
            
            return filtered_qs
            
        except Exception as e:
            logger.error(f"Error applying filters: {e}", exc_info=True)
            # Retornar queryset não filtrado se houver erro
            return queryset

    @action(detail=False, methods=["get"])
    def facetas(self, request):
        """
        Retorna agregações (facetas) para navegação por categorias.
        Mostra contagem de peças em cada categoria.
        
        Se houver filtros aplicados, conta apenas peças que correspondem aos filtros.
        """
        try:
            queryset = self.get_queryset()
            facetas = PecaFilterService.get_facetas(queryset)
            
            logger.debug(f"Facetas calculated: {len(facetas)} categories")
            return Response(facetas)
            
        except Exception as e:
            logger.error(f"Error calculating facetas: {e}", exc_info=True)
            return Response(
                {
                    "error": "Erro ao calcular facetas",
                    "detail": str(e) if request.query_params.get('debug') else None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"])
    def column_values(self, request):
        """
        Retorna valores distintos de uma coluna para uso em filtros de coluna.
        
        Quando outros filtros estão aplicados, retorna apenas os valores disponíveis
        no subconjunto filtrado (filtros em cascata). O filtro da própria coluna
        solicitada é excluído para não restringir os valores dela mesma.
        
        Query params:
        - column: nome da coluna (obrigatório)
        - (todos os demais filtros suportados por apply_filters)
        
        Resposta:
        {
            "column": "nome_obra",
            "values": [
                {"value": "Memórias Póstumas", "isBlank": false, "count": 1},
                {"value": "Dom Casmurro", "isBlank": false, "count": 2},
                {"value": null, "isBlank": true, "display": "(Em Branco)", "count": 5},
            ]
        }
        """
        try:
            column = request.query_params.get('column')
            
            if not column:
                raise InvalidFilterError("Parameter 'column' is required")
            
            if column not in PecaFilterService.ALLOWED_COLUMNS:
                raise ColumnNotAllowedError(f"Column '{column}' not allowed")
            
            # Construir queryset filtrado excluindo o filtro da coluna solicitada
            # para que os valores dessa coluna não sejam restringidos por ela mesma
            from django.http import QueryDict
            params = request.query_params.copy()
            
            # Mapeamento coluna → parâmetros de filtro a excluir
            column_param_mapping = {
                'id': ['id'],
                'ano_publicacao': ['ano_publicacao', 'ano', 'ano_min', 'ano_max'],
                'mes_publicacao': ['mes_publicacao', 'mes'],
                'data_publicacao': ['data_publicacao', 'data_min', 'data_max'],
                'nome_obra': ['nome_obra'],
                'assinatura': ['assinatura', 'assinatura_id'],
                'genero': ['genero', 'genero_id'],
                'instancia': ['instancia', 'instancia_id'],
                'livro': ['livro', 'livro_id'],
                'local_publicacao': ['local_publicacao'],
                'fonte': ['fonte'],
            }
            
            # Remover parâmetros do filtro da própria coluna
            params_to_remove = column_param_mapping.get(column, [column])
            for param in params_to_remove:
                if param in params:
                    del params[param]
            # Remover também o parâmetro 'column' pois não é um filtro
            if 'column' in params:
                del params['column']
            
            # Verificar se há filtros restantes
            has_other_filters = any(
                k not in ('page', 'page_size', 'ordering', 'format', 'debug')
                for k in params.keys()
            )
            
            if has_other_filters:
                base_queryset = super().get_queryset()
                filtered_qs, _ = PecaFilterService.apply_filters(base_queryset, params)
                values = PecaFilterService.get_column_values(column, filtered_qs)
            else:
                values = PecaFilterService.get_column_values(column)
            
            logger.debug(f"Column values retrieved: column={column}, count={len(values)}")
            
            return Response({
                'column': column,
                'values': values,
                'count': len(values),
            })
            
        except (InvalidFilterError, ColumnNotAllowedError) as e:
            logger.warning(f"Invalid column_values request: {e.detail}")
            return Response(
                {"error": e.detail},
                status=e.status_code
            )
        except Exception as e:
            logger.error(f"Error in column_values: {e}", exc_info=True)
            return Response(
                {
                    "error": "Erro ao processar coluna",
                    "detail": str(e) if request.query_params.get('debug') else None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"])
    def autocomplete(self, request):
        """
        Retorna valores distintos para autocomplete de campos de texto.

        Query params:
        - field: nome do campo (obrigatório)
        - q: termo de busca (opcional, filtra com icontains)
        - limit: máximo de resultados (padrão 50, máx 200)
        """
        FIELD_MAP = {
            'nome_obra': 'nome_obra_simples',
            'dados_publicacao': 'dados_publicacao',
            'observacoes': 'observacoes',
            'reproducoes': 'reproducoes_texto',
            'fonte': 'fonte',
            'livro': 'livro__titulo',
            'midia': 'midia__nome',
            'local_publicacao': 'local_publicacao__nome',
        }

        field = request.query_params.get('field', '')
        if field not in FIELD_MAP:
            return Response(
                {"error": f"Campo '{field}' não suportado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db_field = FIELD_MAP[field]
        q = (request.query_params.get('q') or '').strip()[:200]
        limit = min(int(request.query_params.get('limit', 50)), 1000)

        qs = Peca.objects.exclude(**{f'{db_field}__exact': ''}).exclude(**{f'{db_field}__isnull': True})
        if q:
            qs = qs.filter(**{f'{db_field}__icontains': q})

        values = (
            qs.values_list(db_field, flat=True)
            .distinct()
            .order_by(db_field)[:limit]
        )

        # Strip HTML for fields that contain it
        from .utils import sanitize_html_value
        html_fields = {'nome_obra', 'dados_publicacao', 'observacoes', 'reproducoes'}
        if field in html_fields:
            import re
            def strip_tags(val):
                if not val:
                    return ''
                text = re.sub(r'<[^>]*>', '', str(val))
                # Decode common HTML entities
                import html as html_mod
                return html_mod.unescape(text).strip()
            results = sorted(set(strip_tags(v) for v in values if v))
        else:
            results = list(values)

        return Response({"field": field, "values": results})

    @action(detail=False, methods=["get"])
    def search(self, request):
        """
        Full-text search em peças usando PostgreSQL tsvector.
        Busca em título, assinatura, gênero, dados de publicação e observações.
        
        Query params:
        - q: termo(s) de busca (obrigatório)
        - max_results: limite de resultados (padrão: 100, máx: 500)
        - highlights: incluir snippets destacados (padrão: false)
        
        Resposta:
        {
            "query": "crônica Machado",
            "count": 15,
            "results": [
                {
                    "id": 123,
                    "nome_obra": "Quincas Borba",
                    "ano_publicacao": 1891,
                    "rank": 0.28,
                    "snippet": "A história centra-se em <mark>crônica</mark> da vida de..."
                },
                ...
            ]
        }
        """
        try:
            query = request.query_params.get('q', '').strip()
            max_results = min(int(request.query_params.get('max_results', '100')), 500)
            with_highlights = request.query_params.get('highlights', 'false').lower() == 'true'
            
            if not query or len(query) < 2:
                return Response(
                    {
                        "error": "Query must be at least 2 characters long",
                        "query": query,
                        "count": 0,
                        "results": []
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if with_highlights:
                results = FullTextSearchService.search_with_highlights(query, max_results)
                response_data = {
                    "query": query,
                    "count": len(results),
                    "results": results,
                    "note": "Results include snippets with highlighted matches"
                }
            else:
                queryset = FullTextSearchService.search(query, max_results)
                serializer = PecaListSerializer(queryset, many=True)
                response_data = {
                    "query": query,
                    "count": queryset.count(),
                    "results": serializer.data
                }
            
            logger.info(f"Full-text search: query='{query}', results={response_data['count']}")
            return Response(response_data)
            
        except ValueError:
            return Response(
                {"error": "Invalid max_results parameter"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error in full-text search: {e}", exc_info=True)
            return Response(
                {
                    "error": "Erro ao realizar busca",
                    "detail": str(e) if request.query_params.get('debug') else None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="export_csv")
    def export_csv(self, request):
        """Exporta as peças filtradas em formato CSV."""
        import csv
        from django.http import StreamingHttpResponse

        queryset = self.filter_queryset(self.get_queryset())

        class Echo:
            def write(self, value):
                return value

        def csv_rows():
            yield [
                "ID", "Nome da Obra", "Ano", "Mês", "Data de Publicação",
                "Gênero", "Assinatura", "Instância", "Livro", "Mídia",
                "Local de Publicação", "Fonte", "Observações",
            ]
            for peca in queryset.iterator():
                yield [
                    peca.id,
                    peca.nome_obra or "",
                    peca.ano_publicacao or "",
                    peca.mes_publicacao or "",
                    str(peca.data_publicacao or ""),
                    str(peca.genero) if peca.genero else "",
                    str(peca.assinatura) if peca.assinatura else "",
                    str(peca.instancia) if peca.instancia else "",
                    str(peca.livro) if peca.livro else "",
                    str(peca.midia) if peca.midia else "",
                    str(peca.local_publicacao) if peca.local_publicacao else "",
                    peca.fonte or "",
                    peca.observacoes or "",
                ]

        pseudo_buffer = Echo()
        writer = csv.writer(pseudo_buffer)
        response = StreamingHttpResponse(
            (writer.writerow(row) for row in csv_rows()),
            content_type="text/csv",
        )
        response["Content-Disposition"] = (
            'attachment; filename="machado_de_assis_pecas.csv"'
        )
        return response

    @action(detail=False, methods=["get"])
    def estatisticas(self, request):
        """Retorna estatísticas agregadas do acervo."""
        from django.db.models import Min, Max

        try:
            total = Peca.objects.count()

            by_year = list(
                Peca.objects.filter(ano_publicacao__isnull=False)
                .values("ano_publicacao")
                .annotate(total=Count("id"))
                .order_by("ano_publicacao")
            )

            by_genre = list(
                Peca.objects.filter(genero__isnull=False)
                .values("genero__nome")
                .annotate(total=Count("id"))
                .order_by("-total")
            )

            by_signature = list(
                Peca.objects.filter(assinatura__isnull=False)
                .values("assinatura__nome")
                .annotate(total=Count("id"))
                .order_by("-total")[:15]
            )

            date_range = Peca.objects.aggregate(
                primeiro_ano=Min("ano_publicacao"),
                ultimo_ano=Max("ano_publicacao"),
            )

            return Response({
                "total_pecas": total,
                "por_ano": by_year,
                "por_genero": by_genre,
                "por_assinatura": by_signature,
                "periodo": date_range,
            })
        except Exception as e:
            logger.error(f"Error in estatisticas: {e}", exc_info=True)
            return Response(
                {"error": "Erro ao calcular estatísticas"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

