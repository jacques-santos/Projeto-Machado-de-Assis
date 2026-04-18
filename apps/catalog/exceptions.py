"""
Exceções customizadas para a API.
Fornece mensagens de erro consistentes e códigos de status apropriados.
"""

from rest_framework.exceptions import APIException


class InvalidFilterError(APIException):
    """Filtro inválido ou parâmetro ausente."""
    status_code = 400
    default_detail = "Filtro inválido"
    default_code = "invalid_filter"


class ColumnNotAllowedError(APIException):
    """Coluna solicitada não é permitida para filtro."""
    status_code = 403
    default_detail = "Coluna não permitida"
    default_code = "column_not_allowed"


class ImportError(APIException):
    """Erro durante importação de dados."""
    status_code = 400
    default_detail = "Erro na importação"
    default_code = "import_error"


class DatabaseError(APIException):
    """Erro ao acessar banco de dados."""
    status_code = 503
    default_detail = "Banco de dados indisponível"
    default_code = "database_error"
