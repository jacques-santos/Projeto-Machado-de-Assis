from django.core.management.base import BaseCommand
from django.db import connection

from apps.catalog.models import Peca


class Command(BaseCommand):
    help = "Valida conexão com o banco e exibe total de peças"

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            one = cursor.fetchone()[0]

        total_pecas = Peca.objects.count()
        self.stdout.write(self.style.SUCCESS(f"Conexão OK (SELECT {one}). Total de peças: {total_pecas}"))
