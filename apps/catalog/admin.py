from django import forms
from django.contrib import admin
from django.utils.safestring import mark_safe
from tinymce.widgets import TinyMCE

from .models import Assinatura, Genero, ImagemPeca, Instancia, Livro, LocalPublicacao, Midia, Peca, Referencia


# ===== SOFT DELETE ADMIN MIXIN =====

class SoftDeleteAdmin(admin.ModelAdmin):
    """
    Admin mixin para modelos com soft-delete.
    - Mostra todos os registros (incluindo deletados) usando all_objects
    - Adiciona coluna de status, filtro e ações de restaurar/deletar permanente
    """

    def get_queryset(self, request):
        """Usar all_objects para que o admin veja registros deletados também."""
        return self.model.all_objects.all()

    def status_registro(self, obj):
        if obj.deletado:
            return mark_safe('<span style="color:#d32f2f;font-weight:bold;">&#x2717; Deletado</span>')
        return mark_safe('<span style="color:#388e3c;">&#x2713; Ativo</span>')
    status_registro.short_description = "Status"

    @admin.action(description="Restaurar registros selecionados")
    def restaurar_registros(self, request, queryset):
        count = 0
        for obj in queryset.filter(deletado=True):
            obj.restore()
            count += 1
        self.message_user(request, f"{count} registro(s) restaurado(s).")

    @admin.action(description="Deletar permanentemente (irreversível)")
    def deletar_permanente(self, request, queryset):
        count = queryset.count()
        for obj in queryset:
            obj.hard_delete()
        self.message_user(request, f"{count} registro(s) removido(s) permanentemente.")


class StatusDeletadoFilter(admin.SimpleListFilter):
    title = "Status"
    parameter_name = "status_deletado"

    def lookups(self, request, model_admin):
        return [
            ("ativos", "Ativos"),
            ("deletados", "Deletados"),
            ("todos", "Todos"),
        ]

    def queryset(self, request, queryset):
        if self.value() == "ativos":
            return queryset.filter(deletado=False)
        if self.value() == "deletados":
            return queryset.filter(deletado=True)
        # "todos" ou None → sem filtro (mostra tudo incluindo deletados)
        return queryset

    def choices(self, changelist):
        """Override para que 'Ativos' seja o padrão em vez de 'Todos'."""
        yield {
            "selected": self.value() is None,
            "query_string": changelist.get_query_string(remove=[self.parameter_name]),
            "display": "Todos",
        }
        for lookup, title in self.lookup_choices:
            yield {
                "selected": self.value() == str(lookup),
                "query_string": changelist.get_query_string({self.parameter_name: lookup}),
                "display": title,
            }


# ===== INLINES =====


class ImagemPecaInline(admin.TabularInline):
    model = ImagemPeca
    extra = 1
    fields = ("imagem", "legenda", "ordem", "preview")
    readonly_fields = ("preview",)

    @admin.display(description="Preview")
    def preview(self, obj):
        if obj.imagem:
            return mark_safe(
                f'<img src="{obj.imagem.url}" style="max-height:100px;" />'
            )
        return "-"


class PecaAdminForm(forms.ModelForm):
    nome_obra = forms.CharField(
        widget=TinyMCE(attrs={"cols": 80, "rows": 15}),
        required=True,
    )
    dados_publicacao = forms.CharField(
        widget=TinyMCE(attrs={"cols": 80, "rows": 15}),
        required=False,
    )
    observacoes = forms.CharField(
        widget=TinyMCE(attrs={"cols": 80, "rows": 15}),
        required=False,
    )
    reproducoes_texto = forms.CharField(
        widget=TinyMCE(attrs={"cols": 80, "rows": 15}),
        required=False,
    )

    class Meta:
        model = Peca
        fields = "__all__"


@admin.register(Peca)
class PecaAdmin(SoftDeleteAdmin):
    form = PecaAdminForm
    inlines = [ImagemPecaInline]
    list_display = (
        "id",
        "nome_obra_html",
        "ano_publicacao",
        "genero",
        "assinatura",
        "status_registro",
    )
    list_select_related = ("genero", "assinatura", "midia", "instancia", "livro")
    list_per_page = 50
    show_full_result_count = False
    search_fields = ("id", "nome_obra", "nome_obra_simples", "dados_publicacao", "observacoes")
    list_filter = (StatusDeletadoFilter, "genero", "assinatura", "midia", "instancia", "livro")
    autocomplete_fields = ("assinatura", "genero", "midia", "instancia", "local_publicacao", "livro")
    actions = ["restaurar_registros", "deletar_permanente"]

    @admin.display(description="Nome Obra")
    def nome_obra_html(self, obj):
        return mark_safe(obj.nome_obra)


class SimpleModelAdmin(SoftDeleteAdmin):
    list_display = ("id", "nome" if True else "titulo", "status_registro")
    list_filter = (StatusDeletadoFilter,)
    actions = ["restaurar_registros", "deletar_permanente"]


@admin.register(Assinatura)
class AssinaturaAdmin(SimpleModelAdmin):
    list_display = ("id", "nome", "status_registro")
    search_fields = ("nome",)


@admin.register(Genero)
class GeneroAdmin(SimpleModelAdmin):
    list_display = ("id", "nome", "status_registro")
    search_fields = ("nome",)


@admin.register(Midia)
class MidiaAdmin(SimpleModelAdmin):
    list_display = ("id", "nome", "status_registro")
    search_fields = ("nome",)


@admin.register(Instancia)
class InstanciaAdmin(SimpleModelAdmin):
    list_display = ("id", "nome", "status_registro")
    search_fields = ("nome",)


@admin.register(LocalPublicacao)
class LocalPublicacaoAdmin(SimpleModelAdmin):
    list_display = ("id", "nome", "status_registro")
    search_fields = ("nome",)


@admin.register(Livro)
class LivroAdmin(SoftDeleteAdmin):
    list_display = ("id", "titulo", "status_registro")
    search_fields = ("titulo",)
    list_filter = (StatusDeletadoFilter,)
    actions = ["restaurar_registros", "deletar_permanente"]


@admin.register(Referencia)
class ReferenciaAdmin(SoftDeleteAdmin):
    list_display = ("id", "tipo", "status_registro")
    list_filter = (StatusDeletadoFilter,)
    actions = ["restaurar_registros", "deletar_permanente"]
