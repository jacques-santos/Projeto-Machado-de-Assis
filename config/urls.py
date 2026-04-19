from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.catalog.frontend_views import AboutView, CatalogHomeView, StatsView

def api_root(request):
    return JsonResponse({
        "message": "Projeto Machado de Assis API",
        "version": "1.0",
        "endpoints": {
            "admin": "/admacmachado/",
            "api": "/api/v1/",
            "docs": "/api/docs/",
            "schema": "/api/schema/",
            "catalog": "/",
        }
    })

# Frontend pages patterns
frontend_patterns = [
    path("", CatalogHomeView.as_view(), name="home"),
    path("sobre/", AboutView.as_view(), name="about"),
    path("estatisticas/", StatsView.as_view(), name="stats"),
]

# API patterns (all grouped under api namespace)
api_patterns = [
    # Documentation endpoints
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="api:schema"), name="swagger-ui"),
    # v1 API endpoints
    path("v1/", include(("apps.catalog.urls", "v1"), namespace="v1")),
]

urlpatterns = [
    # robots.txt
    path("robots.txt", TemplateView.as_view(template_name="robots.txt", content_type="text/plain")),
    
    # Frontend pages
    path("", CatalogHomeView.as_view(), name="catalog-home"),
    path("", include((frontend_patterns, 'catalog'), namespace='catalog')),
    
    # Rich text editor
    path("tinymce/", include("tinymce.urls")),
    
    # Admin
    path("admacmachado/", admin.site.urls),
    
    # API root and all API endpoints grouped under namespace
    path("api/", api_root, name="api-root"),
    path("api/", include((api_patterns, "api"), namespace="api")),
]

# Serve media and static files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # Preview custom error pages during development
    from django.views.defaults import page_not_found
    urlpatterns += [
        path("404/", lambda request: page_not_found(request, None)),
    ]
