from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.catalog"
    verbose_name = "Catálogo Machado de Assis"

    def ready(self):
        """Registra signal handlers quando a app carrega."""
        import apps.catalog.signals  # noqa: F401

