from django.contrib import admin

from .models import Assinatura, Genero, Instancia, Livro, LocalPublicacao, Midia, Peca, Referencia


@admin.register(Peca)
class PecaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "codigo_exibicao",
        "nome_obra",
        "ano_publicacao",
        "genero",
        "assinatura",
    )
    search_fields = ("nome_obra", "nome_obra_simples", "dados_publicacao", "observacoes")
    list_filter = ("genero", "assinatura", "midia", "instancia", "livro")


admin.site.register(Assinatura)
admin.site.register(Genero)
admin.site.register(Midia)
admin.site.register(Instancia)
admin.site.register(LocalPublicacao)
admin.site.register(Livro)
admin.site.register(Referencia)
