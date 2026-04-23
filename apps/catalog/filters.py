"""
Serviço para filtros, busca e agregações de Peça.
Centraliza lógica de query para evitar duplicação.
"""

from typing import Dict, Any, List, Tuple, Optional
from django.db.models import Q, Count, F, QuerySet
import logging

from apps.catalog.models import Peca, Genero, Assinatura, Instancia, Livro, Midia
from apps.catalog.utils import sanitize_html_value
from apps.catalog.cache_service import CacheService

logger = logging.getLogger(__name__)


class PecaFilterService:
    """
    Serviço para filtros, busca e agregações de Peça.
    Separa lógica complexa de QuerySet da ViewSet.
    """
    
    # Campos permitidos para filtros
    INTEGER_FILTERS = {'id', 'ano_publicacao', 'mes_publicacao'}
    
    FK_FILTERS = {
        'assinatura': 'assinatura__nome',
        'genero': 'genero__nome',
        'instancia': 'instancia__nome',
        'livro': 'livro__titulo',
        'midia': 'midia__nome',
        'local_publicacao': 'local_publicacao__nome',
    }
    
    ALLOWED_COLUMNS = {
        'id', 'nome_obra', 'ano_publicacao', 'mes_publicacao',
        'data_publicacao', 'assinatura', 'genero', 'instancia', 'midia',
        'livro', 'local_publicacao', 'fonte'
    }
    
    @staticmethod
    def apply_filters(
        queryset: QuerySet,
        params: Dict[str, str]
    ) -> Tuple[QuerySet, Dict[str, Any]]:
        """
        Aplica todos os filtros ao queryset baseado em query params.
        
        Suporta:
        - ?ano=1870               → ano_publicacao=1870
        - ?mes=3                  → mes_publicacao=3
        - ?genero_id=5            → genero_id=5
        - ?id=1001,1002,1003      → id IN (1001, 1002, 1003)
        - ?assinatura=Machado     → assinatura__nome IN (...)
        - ?search=crônica         → nome_obra LIKE %cronica% (case-insensitive)
        
        Returns:
            (filtered_queryset, dict_of_applied_filters)
        """
        filters_applied = {}
        
        # Mapeamento de aliases para campos reais
        alias_mapping = {
            'ano': ('ano_publicacao', 'int'),
            'mes': ('mes_publicacao', 'int'),
            'genero_id': ('genero_id', 'int'),
            'assinatura_id': ('assinatura_id', 'int'),
            'instancia_id': ('instancia_id', 'int'),
            'livro_id': ('livro_id', 'int'),
            'midia_id': ('midia_id', 'int'),
            'local_publicacao_id': ('local_publicacao_id', 'int'),
        }
        
        for alias, (field, field_type) in alias_mapping.items():
            if value := params.get(alias):
                try:
                    if field_type == 'int':
                        queryset = queryset.filter(**{field: int(value)})
                        filters_applied[field] = int(value)
                except (ValueError, TypeError):
                    logger.warning(f"Invalid value for {field}: {value}")
        
        # Filtros por IDs (suporta múltiplos: ?id=1001,1002,1003)
        for field in PecaFilterService.INTEGER_FILTERS:
            if value := params.get(field):
                try:
                    raw_values = [v.strip() for v in value.split(',') if v.strip()]
                    include_blank = '__blank__' in raw_values
                    ids = [int(v) for v in raw_values if v != '__blank__']
                    
                    q = Q()
                    if ids:
                        q |= Q(**{f"{field}__in": ids})
                    if include_blank:
                        q |= Q(**{f"{field}__isnull": True})
                    if q:
                        queryset = queryset.filter(q)
                        filters_applied[field] = raw_values
                except (ValueError, TypeError):
                    logger.warning(f"Invalid integer filter for {field}: {value}")
        
        # Filtros por ForeignKey com texto
        for column, lookup_field in PecaFilterService.FK_FILTERS.items():
            if value := params.get(column):
                values = [v.strip() for v in value.split(',') if v.strip()]
                include_blank = '__blank__' in values
                text_values = [v for v in values if v != '__blank__']
                
                q = Q()
                if text_values:
                    q |= Q(**{f"{lookup_field}__in": text_values})
                if include_blank:
                    # FK field name without the lookup suffix (e.g. 'assinatura__nome' -> 'assinatura')
                    fk_field = lookup_field.split('__')[0]
                    q |= Q(**{f"{fk_field}__isnull": True})
                if q:
                    queryset = queryset.filter(q)
                    filters_applied[column] = values
        
        # Busca por texto (search)
        if search := params.get('search'):
            search = search.strip()[:500]
            if search:
                search_query = Q(
                    nome_obra__icontains=search
                ) | Q(
                    nome_obra_simples__icontains=search
                ) | Q(
                    dados_publicacao__icontains=search
                ) | Q(
                    observacoes__icontains=search
                ) | Q(
                    assinatura__nome__icontains=search
                ) | Q(
                    genero__nome__icontains=search
                ) | Q(
                    instancia__nome__icontains=search
                ) | Q(
                    livro__titulo__icontains=search
                ) | Q(
                    midia__nome__icontains=search
                ) | Q(
                    imagens__legenda__icontains=search
                )
                # Busca numérica: id, ano, mês
                try:
                    numeric_val = int(search)
                    search_query |= Q(id=numeric_val)
                    search_query |= Q(ano_publicacao=numeric_val)
                    search_query |= Q(mes_publicacao=numeric_val)
                except (ValueError, TypeError):
                    pass
                # Busca por data (string parcial, ex: "1870-03")
                search_query |= Q(data_publicacao__icontains=search)
                queryset = queryset.filter(search_query).distinct()
                filters_applied['search'] = search
        
        # Filtro por nome_obra (multi-valor): ?nome_obra=valor1&nome_obra=valor2
        # Usa getlist() para suportar repeated params (valores podem conter vírgulas)
        # Usa icontains porque column_values retorna texto sem HTML, mas o DB armazena com HTML
        nome_obra_values = params.getlist('nome_obra')
        if nome_obra_values:
            include_blank = '__blank__' in nome_obra_values
            text_values = [v.strip() for v in nome_obra_values if v.strip() and v != '__blank__']
            
            q = Q()
            if text_values:
                for val in text_values:
                    q |= Q(nome_obra__icontains=val)
            if include_blank:
                q |= Q(nome_obra__isnull=True) | Q(nome_obra='')
            if q:
                queryset = queryset.filter(q)
                filters_applied['nome_obra'] = nome_obra_values
        
        # Filtro por busca textual em nome_obra: ?nome_obra_search=texto
        # Busca em nome_obra_simples (texto puro, sem HTML) com fallback para nome_obra
        if nome_obra_search := params.get('nome_obra_search'):
            nome_obra_search = nome_obra_search.strip()[:500]
            if nome_obra_search:
                queryset = queryset.filter(
                    Q(nome_obra_simples__icontains=nome_obra_search)
                    | Q(nome_obra__icontains=nome_obra_search)
                )
                filters_applied['nome_obra_search'] = nome_obra_search
        
        # Filtros textuais para campos de dados adicionais
        extra_text_filters = {
            'livro_search': 'livro__titulo__icontains',
            'midia_search': 'midia__nome__icontains',
            'local_publicacao_search': 'local_publicacao__nome__icontains',
            'fonte_search': 'fonte__icontains',
            'dados_publicacao_search': 'dados_publicacao__icontains',
            'observacoes_search': 'observacoes__icontains',
            'reproducoes_search': 'reproducoes_texto__icontains',
        }
        for param_name, lookup in extra_text_filters.items():
            if value := params.get(param_name):
                value = value.strip()[:500]
                if value:
                    queryset = queryset.filter(**{lookup: value})
                    filters_applied[param_name] = value
        
        # Filtro por data_publicacao (multi-valor): ?data_publicacao=1870-03-15,...
        if data_pub_raw := params.get('data_publicacao'):
            values = [v.strip() for v in data_pub_raw.split(',') if v.strip()]
            include_blank = '__blank__' in values
            date_values = [v for v in values if v != '__blank__']
            
            # Normalizar: extrair apenas a parte da data (YYYY-MM-DD), sem hora
            from datetime import datetime as dt_parser
            parsed_dates = []
            for dv in date_values:
                # Strip time portion if present (e.g. "1854-10-03 00:00:00" -> "1854-10-03")
                clean = dv.split(' ')[0].split('T')[0]
                try:
                    parsed = dt_parser.strptime(clean, '%Y-%m-%d').date()
                    parsed_dates.append(parsed)
                except (ValueError, TypeError):
                    logger.warning(f"Could not parse date value: {dv}")
            
            q = Q()
            if parsed_dates:
                q |= Q(data_publicacao__date__in=parsed_dates)
            if include_blank:
                q |= Q(data_publicacao__isnull=True)
            if q:
                try:
                    queryset = queryset.filter(q)
                    filters_applied['data_publicacao'] = values
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid date filter values: {date_values}, error: {e}")
        
        # Filtro: ?has_date=true → apenas registros com data_publicacao preenchida
        if has_date := params.get('has_date'):
            if has_date.lower() in ('true', '1', 'yes'):
                queryset = queryset.filter(data_publicacao__isnull=False)
                filters_applied['has_date'] = True
        
        # Filtro: ?has_images=true → apenas registros que possuem imagens
        if has_images := params.get('has_images'):
            if has_images.lower() in ('true', '1', 'yes'):
                queryset = queryset.filter(imagens__isnull=False).distinct()
                filters_applied['has_images'] = True
        
        # Filtro por range de ano: ?ano_min=1850&ano_max=1900
        ano_min = params.get('ano_min')
        ano_max = params.get('ano_max')
        if ano_min:
            try:
                queryset = queryset.filter(ano_publicacao__gte=int(ano_min))
                filters_applied['ano_min'] = int(ano_min)
            except (ValueError, TypeError):
                pass
        if ano_max:
            try:
                queryset = queryset.filter(ano_publicacao__lte=int(ano_max))
                filters_applied['ano_max'] = int(ano_max)
            except (ValueError, TypeError):
                pass
        
        # Filtro por range de data: ?data_min=1850-01-01&data_max=1900-12-31
        # Usa data_ordenacao para incluir registros que só têm ano/mês (sem data_publicacao completa)
        data_min = params.get('data_min')
        data_max = params.get('data_max')
        if data_min:
            try:
                queryset = queryset.filter(data_ordenacao__gte=data_min)
                filters_applied['data_min'] = data_min
            except (ValueError, TypeError):
                pass
        if data_max:
            try:
                queryset = queryset.filter(data_ordenacao__lte=data_max)
                filters_applied['data_max'] = data_max
            except (ValueError, TypeError):
                pass
        
        if filters_applied:
            logger.info(f"Applied filters: {filters_applied}")
        
        return queryset, filters_applied
    
    @staticmethod
    def get_column_values(column: str, queryset: QuerySet = None) -> List[Dict[str, Any]]:
        """
        Retorna valores distintos para uma coluna, de forma eficiente.
        Os resultados são cacheados automaticamente quando não há filtros.
        Usa agregação do banco (Uma única query com COUNT).
        
        Inclui contagem de registros para cada valor.
        
        Args:
            column: Nome da coluna (validado contra ALLOWED_COLUMNS)
            queryset: QuerySet pré-filtrado (opcional). Se None, usa todos os registros.
        
        Returns:
            Lista de dicts com {value, isBlank, count}
        
        Raises:
            ValueError: Se coluna não é permitida
        """
        is_unfiltered = queryset is None
        
        # Verificar cache primeiro (apenas para queries sem filtros)
        if is_unfiltered:
            cached_result = CacheService.get_column_values(column)
            if cached_result is not None:
                logger.debug(f"Column values for {column} loaded from cache")
                return cached_result
        
        if column not in PecaFilterService.ALLOWED_COLUMNS:
            raise ValueError(f"Column '{column}' not allowed")
        
        if queryset is None:
            queryset = Peca.objects.all().select_related(
                'assinatura', 'genero', 'instancia', 'livro', 'midia', 'local_publicacao'
            )
        
        # Mapear coluna para field do model e relacionamento
        column_config = {
            'id': {'field': 'id', 'related': None},
            'nome_obra': {'field': 'nome_obra', 'related': None},
            'ano_publicacao': {'field': 'ano_publicacao', 'related': None},
            'mes_publicacao': {'field': 'mes_publicacao', 'related': None},
            'data_publicacao': {'field': 'data_publicacao', 'related': None},
            'assinatura': {'field': 'assinatura__nome', 'related': 'assinatura'},
            'genero': {'field': 'genero__nome', 'related': 'genero'},
            'instancia': {'field': 'instancia__nome', 'related': 'instancia'},
            'midia': {'field': 'midia__nome', 'related': 'midia'},
            'livro': {'field': 'livro__titulo', 'related': 'livro'},
            'local_publicacao': {'field': 'local_publicacao__nome', 'related': 'local_publicacao'},
            'fonte': {'field': 'fonte', 'related': None},
        }
        
        config = column_config[column]
        field = config['field']
        
        # Usar agregação para uma única query eficiente
        # Excluir valores NULL e contar ocorrências de cada valor
        values_qs = queryset.filter(
            **{f"{field}__isnull": False}
        ).values(field).annotate(
            count=Count('id')
        ).order_by(field)
        
        result = []
        seen = set()
        
        for item in values_qs:
            value = item[field]
            count = item['count']
            
            # Sanitizar valor
            # Para DateTimeField, formatar como ISO date (sem hora)
            if hasattr(value, 'strftime'):
                sanitized = value.strftime('%Y-%m-%d')
            else:
                sanitized = sanitize_html_value(str(value)) if value else None
            
            # Evitar duplicatas
            if (sanitized,) in seen:
                continue
            seen.add((sanitized,))
            
            result.append({
                'value': sanitized,
                'isBlank': False,
                'count': count,
            })
        
        # Adicionar "Em Branco" se houver valores null
        blank_count = queryset.filter(**{f"{field}__isnull": True}).count()
        if blank_count > 0:
            blank_display = '(Em branco)' if column == 'data_publicacao' else '(Em branco)'
            result.append({
                'value': None,
                'isBlank': True,
                'display': blank_display,
                'count': blank_count,
            })
        
        logger.debug(f"Column values for {column}: {len(result)} distinct values")
        
        # Armazenar no cache apenas para queries não filtradas
        if is_unfiltered:
            CacheService.set_column_values(column, result)
        
        return result
    
    @staticmethod
    def get_facetas(queryset: QuerySet) -> Dict[str, List[Dict[str, Any]]]:
        """
        Retorna agregações (facetas) para navegação.
        Os resultados são cacheados automaticamente.
        Mostra contagem de peças por categoria.
        
        Args:
            queryset: QuerySet filtrado (pode ter filtros aplicados)
        
        Returns:
            Dict com generos, assinaturas, instancias, livros, midias
        """
        # Verificar cache para queries sem filtros
        # Para queries com filtros, o cache seria menos efetivo
        is_unfiltered = queryset.query == Peca.objects.all().query
        
        if is_unfiltered:
            cached_result = CacheService.get_facetas()
            if cached_result is not None:
                logger.debug("Facetas loaded from cache")
                return cached_result
        
        def rename_faceta_keys(data_list, mapping):
            """Renomeia chaves de um dict segundo o mapeamento"""
            return [
                {k: v for k, v in row.items() if k not in mapping}
                | {mapping[k]: row[k] for k in mapping if k in row}
                for row in data_list
            ]
        
        result = {
            "generos": rename_faceta_keys(
                list(
                    queryset
                    .filter(genero__isnull=False)
                    .values('genero__id', 'genero__nome')
                    .annotate(total=Count('id', distinct=True))
                    .order_by('genero__nome')
                ),
                {'genero__id': 'id', 'genero__nome': 'nome'}
            ),
            "assinaturas": rename_faceta_keys(
                list(
                    queryset
                    .filter(assinatura__isnull=False)
                    .values('assinatura__id', 'assinatura__nome')
                    .annotate(total=Count('id', distinct=True))
                    .order_by('assinatura__nome')
                ),
                {'assinatura__id': 'id', 'assinatura__nome': 'nome'}
            ),
            "instancias": rename_faceta_keys(
                list(
                    queryset
                    .filter(instancia__isnull=False)
                    .values('instancia__id', 'instancia__nome')
                    .annotate(total=Count('id', distinct=True))
                    .order_by('instancia__nome')
                ),
                {'instancia__id': 'id', 'instancia__nome': 'nome'}
            ),
            "livros": rename_faceta_keys(
                list(
                    queryset
                    .filter(livro__isnull=False)
                    .values('livro__id', 'livro__titulo')
                    .annotate(total=Count('id', distinct=True))
                    .order_by('livro__titulo')
                ),
                {'livro__id': 'id', 'livro__titulo': 'nome'}
            ),
            "midias": rename_faceta_keys(
                list(
                    queryset
                    .filter(midia__isnull=False)
                    .values('midia__id', 'midia__nome')
                    .annotate(total=Count('id', distinct=True))
                    .order_by('midia__nome')
                ),
                {'midia__id': 'id', 'midia__nome': 'nome'}
            ),
        }
        
        # Armazenar no cache se for query não filtrada
        if is_unfiltered:
            CacheService.set_facetas(result)
        
        return result
