from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AssinaturaViewSet,
    GeneroViewSet,
    HealthCheckView,
    InstanciaViewSet,
    LivroViewSet,
    LocalPublicacaoViewSet,
    MidiaViewSet,
    PecaViewSet,
)

app_name = 'v1'

router = DefaultRouter()
router.register(r"pecas", PecaViewSet, basename="peca")
router.register(r"assinaturas", AssinaturaViewSet, basename="assinatura")
router.register(r"generos", GeneroViewSet, basename="genero")
router.register(r"midias", MidiaViewSet, basename="midia")
router.register(r"instancias", InstanciaViewSet, basename="instancia")
router.register(r"locais-publicacao", LocalPublicacaoViewSet, basename="local-publicacao")
router.register(r"livros", LivroViewSet, basename="livro")

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("", include(router.urls)),
]
