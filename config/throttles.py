"""
Rate Limiting Throttles - Controla requisições por usuário/IP

Implementa:
- AnonUserThrottle: 100 requisições por minuto para usuários anônimos
- AuthenticatedUserThrottle: 1000 requisições por minuto para usuários autenticados
"""

from rest_framework.throttling import SimpleRateThrottle


class AnonUserThrottle(SimpleRateThrottle):
    """
    Throttle para usuários anônimos (não autenticados).
    
    Limite: 100 requisições por minuto por IP.
    """
    scope = "anon"
    THROTTLE_RATES = {"anon": "100/min"}

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return None  # Não aplicar throttle a usuários autenticados
        
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class AuthenticatedUserThrottle(SimpleRateThrottle):
    """
    Throttle para usuários autenticados.
    
    Limite: 1000 requisições por minuto por usuário.
    """
    scope = "authenticated"
    THROTTLE_RATES = {"authenticated": "1000/min"}

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return self.cache_format % {
                "scope": self.scope,
                "ident": request.user.id,
            }
        
        return None  # Não aplicar throttle a usuários anônimos (usa AnonUserThrottle)
