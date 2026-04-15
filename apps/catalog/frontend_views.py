from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin


class CatalogHomeView(TemplateView):
    """View para a página inicial do catálogo de peças"""
    template_name = 'catalog/index.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Acervo'
        return context


class CreditsView(TemplateView):
    """View para a página de créditos"""
    template_name = 'pages/credits.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Créditos'
        return context


class AboutView(TemplateView):
    """View para a página sobre o projeto (Criado por)"""
    template_name = 'pages/about.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Criado por'
        return context
