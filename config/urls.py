from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

from apps.catalog.frontend_views import CatalogHomeView, CreditsView, AboutView

def api_root(request):
    return JsonResponse({
        "message": "Projeto Machado de Assis API",
        "version": "1.0",
        "endpoints": {
            "admin": "/admin/",
            "api": "/api/v1/",
            "catalog": "/",
        }
    })

# Frontend pages with namespaces
frontend_patterns = [
    path("", CatalogHomeView.as_view(), name="home"),
    path("creditos/", CreditsView.as_view(), name="credits"),
    path("criado-por/", AboutView.as_view(), name="about"),
]

pages_patterns = [
    path("creditos/", CreditsView.as_view(), name="credits"),
    path("criado-por/", AboutView.as_view(), name="about"),
]

urlpatterns = [
    # Frontend pages
    path("", CatalogHomeView.as_view(), name="catalog-home"),
    path("", include((frontend_patterns, 'catalog'), namespace='catalog')),
    path("", include((pages_patterns, 'pages'), namespace='pages')),
    
    # Admin
    path("admin/", admin.site.urls),
    
    # API
    path("api/", api_root, name="api-root"),
    path("api/v1/", include("apps.catalog.urls")),
]

# Serve media and static files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
