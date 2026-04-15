from django.db import models


class BaseNomeModel(models.Model):
    nome = models.CharField(max_length=255, unique=True)
    trial446 = models.CharField(max_length=1, null=True, blank=True)

    class Meta:
        abstract = True
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Assinatura(BaseNomeModel):
    id = models.AutoField(primary_key=True, db_column="idassinatura")
    nome = models.CharField(
        max_length=255, 
        unique=True,
        db_column="assinatura"
    )

    class Meta(BaseNomeModel.Meta):
        db_table = "tblassinatura"
        verbose_name = "Assinatura"
        verbose_name_plural = "Assinaturas"


class Genero(BaseNomeModel):
    id = models.AutoField(primary_key=True, db_column="idgenero")
    nome = models.CharField(
        max_length=255, 
        unique=True,
        db_column="genero"
    )

    class Meta(BaseNomeModel.Meta):
        db_table = "tblgenero"
        verbose_name = "Gênero"
        verbose_name_plural = "Gêneros"


class Midia(BaseNomeModel):
    id = models.AutoField(primary_key=True, db_column="idmidia")
    nome = models.CharField(
        max_length=255, 
        unique=True,
        db_column="midia"
    )

    class Meta:
        db_table = "tblmidia"
        verbose_name = "Mídia"
        verbose_name_plural = "Mídias"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Instancia(BaseNomeModel):
    id = models.AutoField(primary_key=True, db_column="idinstanciaocorrenciacaso")
    nome = models.CharField(
        max_length=255, 
        unique=True,
        db_column="instancia"
    )
    observacao = models.CharField(max_length=255, null=True, blank=True)

    class Meta(BaseNomeModel.Meta):
        db_table = "tblinstanciaocorrenciacaso"
        verbose_name = "Instância"
        verbose_name_plural = "Instâncias"


class LocalPublicacao(BaseNomeModel):
    id = models.AutoField(primary_key=True, db_column="idlocalpublicacao")
    nome = models.CharField(
        max_length=255, 
        unique=True,
        db_column="nomelocalpublicacao"
    )

    class Meta(BaseNomeModel.Meta):
        db_table = "tbllocalpublicacao"
        verbose_name = "Local de publicação"
        verbose_name_plural = "Locais de publicação"


class Livro(models.Model):
    id = models.AutoField(primary_key=True, db_column="idlivro")
    titulo = models.CharField(max_length=255, db_column="titulo")
    trial446 = models.CharField(max_length=1, null=True, blank=True)

    class Meta:
        db_table = "tbllivro"
        verbose_name = "Livro"
        verbose_name_plural = "Livros"
        ordering = ["titulo"]

    def __str__(self) -> str:
        return self.titulo


class Peca(models.Model):
    id = models.AutoField(primary_key=True, db_column="idpeca")
    nome_obra = models.CharField(
        max_length=255,
        db_column="nomedaobra"
    )
    nome_obra_simples = models.CharField(
        max_length=255, 
        blank=True,
        db_column="nomedaobrasimples"
    )
    ano_publicacao = models.PositiveIntegerField(
        null=True, 
        blank=True,
        db_column="anopublicacao"
    )
    mes_publicacao = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        db_column="mespublicacao"
    )
    data_publicacao = models.DateTimeField(
        null=True, 
        blank=True,
        db_column="datapublicacao"
    )
    fonte = models.TextField(blank=True)
    dados_publicacao = models.TextField(
        blank=True,
        db_column="dadosdapublicacao"
    )
    observacoes = models.TextField(blank=True)
    reproducoes_texto = models.TextField(
        blank=True,
        db_column="reproducoes"
    )
    complemento_assinatura = models.CharField(
        max_length=255,
        blank=True,
        db_column="complementoassinatura"
    )
    assinatura = models.ForeignKey(
        Assinatura, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        db_column="idassinatura"
    )
    genero = models.ForeignKey(
        Genero, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        db_column="idgenero"
    )
    instancia = models.ForeignKey(
        Instancia, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        db_column="idinstancia"
    )
    local_publicacao = models.ForeignKey(
        LocalPublicacao, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        db_column="idlocalpub"
    )
    midia = models.ForeignKey(
        Midia, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        db_column="idmidia"
    )
    livro = models.ForeignKey(
        Livro, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        db_column="idreuniaoemlivro"
    )
    numero_item = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_column="numitem"
    )
    dia_assinatura = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_column="diaassinatura"
    )
    mes_assinatura = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        db_column="mesassinatura"
    )
    ano_assinatura = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_column="anoassinatura"
    )
    trial446 = models.CharField(max_length=1, null=True, blank=True)

    class Meta:
        db_table = "tblpeca"
        verbose_name = "Peça"
        verbose_name_plural = "Peças"
        ordering = ["-ano_publicacao", "nome_obra"]
        indexes = [
            models.Index(fields=["ano_publicacao"]),
            models.Index(fields=["mes_publicacao"]),
            models.Index(fields=["data_publicacao"]),
            models.Index(fields=["nome_obra"]),
        ]

    def __str__(self) -> str:
        return self.nome_obra


class Referencia(models.Model):
    id = models.AutoField(primary_key=True, db_column="idtecnica")
    tipo = models.CharField(
        max_length=120, 
        blank=True,
        db_column="tecnica"
    )
    descricao = models.TextField(
        blank=True,
        db_column="observacao"
    )
    trial449 = models.CharField(max_length=1, null=True, blank=True)

    class Meta:
        db_table = "tbltecnicaassinatura"
        verbose_name = "Referência"
        verbose_name_plural = "Referências"

    def __str__(self) -> str:
        return f"{self.tipo or 'referência'}"
