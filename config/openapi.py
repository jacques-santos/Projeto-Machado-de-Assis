"""
OpenAPI schema preprocessing hooks for drf-spectacular.
Customizes the auto-generated OpenAPI schema.
"""


def preprocess_filter_parameters(endpoints):
    """
    Preprocessa os endpoints para documentar filtros customizados.
    Melhora a schema OpenAPI com descrições de filtros.
    
    Args:
        endpoints: Lista de endpoints dict
    
    Returns:
        Lista de endpoints customizada
    """
    # Retornar endpoints sem modificações
    # Esta função é um hook para possíveis customizações futuras
    return endpoints
