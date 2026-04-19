from django.db import models
from django.utils import timezone
import datetime


# ===== SOFT DELETE INFRASTRUCTURE =====

class SoftDeleteManager(models.Manager):
    """Manager padrão que filtra registros deletados."""
    def get_queryset(self):
        return super().get_queryset().filter(deletado=False)


class AllObjectsManager(models.Manager):
    """Manager que retorna todos os registros, incluindo deletados."""
    pass


class SoftDeleteMixin(models.Model):
    """
    Mixin que implementa soft-delete para qualquer modelo.
    - delete() marca como deletado em vez de remover do banco
    - hard_delete() remove permanentemente
    - restore() restaura um registro deletado
    - objects filtra deletados; all_objects inclui tudo
    """
    deletado = models.BooleanField(default=False, db_index=True)
    deletado_em = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Soft-delete: marca como deletado sem remover do banco."""
        self.deletado = True
        self.deletado_em = timezone.now()
        self.save(update_fields=["deletado", "deletado_em"])

    def hard_delete(self, using=None, keep_parents=False):
        """Remove permanentemente do banco de dados."""
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """Restaura um registro soft-deleted."""
        self.deletado = False
        self.deletado_em = None
        self.save(update_fields=["deletado", "deletado_em"])


# ===== MODELS =====


class BaseNomeModel(SoftDeleteMixin, models.Model):
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


class Midia(SoftDeleteMixin, models.Model):
    id = models.AutoField(primary_key=True, db_column="idmidia")
    nome = models.CharField(
        max_length=255, 
        unique=True,
        db_column="midia"
    )
    trial446 = models.CharField(max_length=1, null=True, blank=True)

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


class Livro(SoftDeleteMixin, models.Model):
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


class Peca(SoftDeleteMixin, models.Model):
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
    data_ordenacao = models.DateField(
        null=True,
        blank=True,
        db_index=True,
    )
    trial446 = models.CharField(max_length=1, null=True, blank=True)

    class Meta:
        db_table = "tblpeca"
        verbose_name = "Título"
        verbose_name_plural = "Títulos"
        ordering = ["-ano_publicacao", "nome_obra"]
        indexes = [
            # Índices existentes
            models.Index(fields=["ano_publicacao"]),
            models.Index(fields=["mes_publicacao"]),
            models.Index(fields=["data_publicacao"]),
            
            # Novos índices para otimização
            models.Index(fields=["nome_obra"]),  # Campo mais buscado
            models.Index(fields=["assinatura"]),  # FK usado em filtros
            models.Index(fields=["genero"]),      # FK para facetas
            models.Index(fields=["instancia"]),   # FK para facetas
            models.Index(fields=["livro"]),       # FK para facetas
            
            # Índices compostos para filtros comuns
            models.Index(
                fields=["ano_publicacao", "nome_obra"],
                name="idx_ano_obra",
            ),
            models.Index(
                fields=["genero", "ano_publicacao"],
                name="idx_genero_ano",
            ),
            models.Index(
                fields=["assinatura", "ano_publicacao"],
                name="idx_assinatura_ano",
            ),
        ]

    def __str__(self) -> str:
        return self.nome_obra

    def _calcular_data_ordenacao(self):
        """Calcula data_ordenacao a partir dos campos de data disponíveis."""
        if self.data_publicacao:
            dt = self.data_publicacao
            return dt.date() if hasattr(dt, 'date') else dt
        if self.ano_publicacao:
            mes = self.mes_publicacao or 1
            return datetime.date(self.ano_publicacao, mes, 1)
        return None

    def save(self, *args, **kwargs):
        self.data_ordenacao = self._calcular_data_ordenacao()
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        """Soft-delete da peça e de todas as suas imagens."""
        # Soft-delete das imagens associadas (incluindo já deletadas para não perder estado)
        ImagemPeca.all_objects.filter(peca=self, deletado=False).update(
            deletado=True, deletado_em=timezone.now()
        )
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """Restaura a peça e todas as suas imagens."""
        super().restore()
        ImagemPeca.all_objects.filter(peca=self, deletado=True).update(
            deletado=False, deletado_em=None
        )


class Referencia(SoftDeleteMixin, models.Model):
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


class ImagemPeca(SoftDeleteMixin, models.Model):
    peca = models.ForeignKey(
        Peca,
        on_delete=models.CASCADE,
        related_name="imagens",
    )
    imagem = models.ImageField(upload_to="pecas/%Y/%m/")
    legenda = models.CharField(max_length=255, blank=True)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Imagem"
        verbose_name_plural = "Imagens"
        ordering = ["ordem", "id"]

    def __str__(self) -> str:
        return f"Imagem {self.id} - {self.peca}"
