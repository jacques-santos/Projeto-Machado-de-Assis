from django.db import models
from django.utils.text import slugify


class BaseNomeModel(models.Model):
    nome = models.CharField(max_length=255, unique=True)

    class Meta:
        abstract = True
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Assinatura(BaseNomeModel):
    class Meta(BaseNomeModel.Meta):
        verbose_name = "Assinatura"
        verbose_name_plural = "Assinaturas"


class Genero(BaseNomeModel):
    class Meta(BaseNomeModel.Meta):
        verbose_name = "Gênero"
        verbose_name_plural = "Gêneros"


class Midia(BaseNomeModel):
    class Meta(BaseNomeModel.Meta):
        verbose_name = "Mídia"
        verbose_name_plural = "Mídias"


class Instancia(BaseNomeModel):
    class Meta(BaseNomeModel.Meta):
        verbose_name = "Instância"
        verbose_name_plural = "Instâncias"


class LocalPublicacao(BaseNomeModel):
    class Meta(BaseNomeModel.Meta):
        verbose_name = "Local de publicação"
        verbose_name_plural = "Locais de publicação"


class Livro(models.Model):
    titulo = models.CharField(max_length=255)

    class Meta:
        verbose_name = "Livro"
        verbose_name_plural = "Livros"
        ordering = ["titulo"]

    def __str__(self) -> str:
        return self.titulo


class Peca(models.Model):
    codigo_exibicao = models.CharField(max_length=50, blank=True)
    nome_obra = models.CharField(max_length=255)
    nome_obra_simples = models.CharField(max_length=255, blank=True)
    ano_publicacao = models.PositiveIntegerField(null=True, blank=True)
    mes_publicacao = models.PositiveSmallIntegerField(null=True, blank=True)
    data_publicacao = models.DateField(null=True, blank=True)
    fonte = models.TextField(blank=True)
    dados_publicacao = models.TextField(blank=True)
    observacoes = models.TextField(blank=True)
    registro = models.TextField(blank=True)
    reproducoes_texto = models.TextField(blank=True)
    assinatura = models.ForeignKey(Assinatura, null=True, blank=True, on_delete=models.SET_NULL)
    genero = models.ForeignKey(Genero, null=True, blank=True, on_delete=models.SET_NULL)
    instancia = models.ForeignKey(Instancia, null=True, blank=True, on_delete=models.SET_NULL)
    local_publicacao = models.ForeignKey(LocalPublicacao, null=True, blank=True, on_delete=models.SET_NULL)
    midia = models.ForeignKey(Midia, null=True, blank=True, on_delete=models.SET_NULL)
    livro = models.ForeignKey(Livro, null=True, blank=True, on_delete=models.SET_NULL)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Peça"
        verbose_name_plural = "Peças"
        ordering = ["-ano_publicacao", "nome_obra"]
        indexes = [
            models.Index(fields=["ano_publicacao"]),
            models.Index(fields=["mes_publicacao"]),
            models.Index(fields=["data_publicacao"]),
            models.Index(fields=["nome_obra"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = self.nome_obra_simples or self.nome_obra
            self.slug = slugify(base)[:260]
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.nome_obra


class Referencia(models.Model):
    peca = models.ForeignKey(Peca, on_delete=models.CASCADE, related_name="referencias")
    tipo = models.CharField(max_length=120, blank=True)
    url = models.URLField(max_length=500, blank=True)
    descricao = models.TextField(blank=True)

    class Meta:
        verbose_name = "Referência"
        verbose_name_plural = "Referências"

    def __str__(self) -> str:
        return f"{self.peca.nome_obra} - {self.tipo or 'referência'}"
