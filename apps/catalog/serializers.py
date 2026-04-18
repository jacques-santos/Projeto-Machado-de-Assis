from rest_framework import serializers

from .models import Assinatura, Genero, ImagemPeca, Instancia, Livro, LocalPublicacao, Midia, Peca, Referencia


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
        fields = ["id", "tipo", "descricao"]


class ImagemPecaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagemPeca
        fields = ["id", "imagem", "legenda", "ordem"]


class PecaListSerializer(serializers.ModelSerializer):
    assinatura = serializers.StringRelatedField()
    genero = serializers.StringRelatedField()
    instancia = serializers.StringRelatedField()
    livro = serializers.StringRelatedField()
    midia = serializers.StringRelatedField()
    local_publicacao = serializers.StringRelatedField()
    imagens = ImagemPecaSerializer(many=True, read_only=True)

    class Meta:
        model = Peca
        fields = [
            "id",
            "ano_publicacao",
            "mes_publicacao",
            "data_publicacao",
            "data_ordenacao",
            "nome_obra",
            "nome_obra_simples",
            "assinatura",
            "instancia",
            "livro",
            "genero",
            "midia",
            "local_publicacao",
            "fonte",
            "dados_publicacao",
            "observacoes",
            "reproducoes_texto",
            "imagens",
        ]


class PecaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Peca
        fields = [
            "id",
            "nome_obra",
            "nome_obra_simples",
            "ano_publicacao",
            "mes_publicacao",
            "data_publicacao",
            "fonte",
            "dados_publicacao",
            "observacoes",
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
    imagens = ImagemPecaSerializer(many=True, read_only=True)

    class Meta:
        model = Peca
        fields = "__all__"
