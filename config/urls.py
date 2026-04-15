from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        "message": "Projeto Machado de Assis API",
        "version": "1.0",
        "endpoints": {
            "admin": "/admin/",
            "api": "/api/v1/",
        }
    })

urlpatterns = [
    path("", api_root, name="api-root"),
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.catalog.urls")),
]
