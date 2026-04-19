from django.views.generic import TemplateView


class CatalogHomeView(TemplateView):
    """View para a página inicial do catálogo de peças"""
    template_name = 'catalog/index.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Banco de Dados'
        return context


class AboutView(TemplateView):
    """View para a página Sobre o projeto"""
    template_name = 'pages/about.html'


class StatsView(TemplateView):
    """View para a página de Estatísticas"""
    template_name = 'pages/stats.html'


class LinhaDoTempoView(TemplateView):
    """View para a página Linha do Tempo"""
    template_name = 'pages/linha_do_tempo_machado_de_assis.html'
