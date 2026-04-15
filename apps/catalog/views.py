from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

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
    PecaWriteSerializer,
)


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok"})


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


class PecaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = (
        Peca.objects.select_related(
            "assinatura",
            "genero",
            "instancia",
            "local_publicacao",
            "midia",
            "livro",
        )
        .prefetch_related("referencias")
        .all()
    )
    search_fields = [
        "nome_obra",
        "nome_obra_simples",
        "dados_publicacao",
        "observacoes",
        "registro",
    ]
    filterset_fields = [
        "ano_publicacao",
        "mes_publicacao",
        "genero",
        "assinatura",
        "midia",
        "instancia",
        "livro",
        "local_publicacao",
    ]
    ordering_fields = [
        "ano_publicacao",
        "mes_publicacao",
        "data_publicacao",
        "nome_obra",
        "id",
    ]
    ordering = ["-ano_publicacao", "nome_obra"]

    def get_serializer_class(self):
        if self.action == "list":
            return PecaListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return PecaWriteSerializer
        return PecaDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        alias_filters = {
            "ano_publicacao": params.get("ano"),
            "mes_publicacao": params.get("mes"),
            "genero_id": params.get("genero_id"),
            "assinatura_id": params.get("assinatura_id"),
            "midia_id": params.get("midia_id"),
            "instancia_id": params.get("instancia_id"),
            "livro_id": params.get("livro_id"),
            "local_publicacao_id": params.get("local_publicacao_id"),
        }

        for field, value in alias_filters.items():
            if value:
                queryset = queryset.filter(**{field: value})

        return queryset

    @action(detail=False, methods=["get"])
    def facetas(self, request):
        return Response(
            {
                "generos": list(Genero.objects.annotate(total=Count("peca")).values("id", "nome", "total")),
                "assinaturas": list(
                    Assinatura.objects.annotate(total=Count("peca")).values("id", "nome", "total")
                ),
                "midias": list(Midia.objects.annotate(total=Count("peca")).values("id", "nome", "total")),
                "livros": list(Livro.objects.annotate(total=Count("peca")).values("id", "titulo", "total")),
            }
        )
