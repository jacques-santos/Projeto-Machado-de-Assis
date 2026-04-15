from rest_framework import serializers

from .models import Assinatura, Genero, Instancia, Livro, LocalPublicacao, Midia, Peca, Referencia


class AssinaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assinatura
        fields = ["id", "nome"]


class GeneroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genero
        fields = ["id", "nome"]


class MidiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Midia
        fields = ["id", "nome"]


class InstanciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instancia
        fields = ["id", "nome"]


class LocalPublicacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocalPublicacao
        fields = ["id", "nome"]


class LivroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Livro
        fields = ["id", "titulo"]


class ReferenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referencia
        fields = ["id", "tipo", "url", "descricao"]


class PecaListSerializer(serializers.ModelSerializer):
    assinatura = serializers.StringRelatedField()
    genero = serializers.StringRelatedField()
    instancia = serializers.StringRelatedField()
    livro = serializers.StringRelatedField()

    class Meta:
        model = Peca
        fields = [
            "id",
            "codigo_exibicao",
            "ano_publicacao",
            "mes_publicacao",
            "data_publicacao",
            "nome_obra",
            "assinatura",
            "instancia",
            "livro",
            "genero",
            "slug",
        ]


class PecaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Peca
        fields = [
            "id",
            "codigo_exibicao",
            "nome_obra",
            "nome_obra_simples",
            "ano_publicacao",
            "mes_publicacao",
            "data_publicacao",
            "fonte",
            "dados_publicacao",
            "observacoes",
            "registro",
            "reproducoes_texto",
            "assinatura",
            "genero",
            "instancia",
            "local_publicacao",
            "midia",
            "livro",
        ]


class PecaDetailSerializer(serializers.ModelSerializer):
    assinatura = AssinaturaSerializer(read_only=True)
    genero = GeneroSerializer(read_only=True)
    instancia = InstanciaSerializer(read_only=True)
    local_publicacao = LocalPublicacaoSerializer(read_only=True)
    midia = MidiaSerializer(read_only=True)
    livro = LivroSerializer(read_only=True)
    referencias = ReferenciaSerializer(many=True, read_only=True)

    class Meta:
        model = Peca
        fields = "__all__"
