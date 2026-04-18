from django import forms
from django.contrib import admin
from django.utils.safestring import mark_safe
from tinymce.widgets import TinyMCE

from .models import Assinatura, Genero, Instancia, Livro, LocalPublicacao, Midia, Peca, Referencia


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
class PecaAdmin(admin.ModelAdmin):
    form = PecaAdminForm
    list_display = (
        "id",
        "nome_obra_html",
        "ano_publicacao",
        "genero",
        "assinatura",
    )
    search_fields = ("nome_obra", "nome_obra_simples", "dados_publicacao", "observacoes")
    list_filter = ("genero", "assinatura", "midia", "instancia", "livro")

    @admin.display(description="Nome Obra")
    def nome_obra_html(self, obj):
        return mark_safe(obj.nome_obra)


admin.site.register(Assinatura)
admin.site.register(Genero)
admin.site.register(Midia)
admin.site.register(Instancia)
admin.site.register(LocalPublicacao)
admin.site.register(Livro)
admin.site.register(Referencia)
