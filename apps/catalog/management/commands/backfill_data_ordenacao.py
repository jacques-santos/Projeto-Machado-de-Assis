"""
Management command para preencher data_ordenacao em registros existentes.

Uso:
    python manage.py backfill_data_ordenacao
"""
import datetime

from django.db import connection
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Preenche data_ordenacao para todas as Peças existentes usando SQL direto."

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Usa CASE para calcular em uma única query
            cursor.execute("""
                UPDATE tblpeca
                SET data_ordenacao = CASE
                    WHEN datapublicacao IS NOT NULL
                        THEN datapublicacao::date
                    WHEN anopublicacao IS NOT NULL AND mespublicacao IS NOT NULL
                        THEN make_date(anopublicacao::int, mespublicacao::int, 1)
                    WHEN anopublicacao IS NOT NULL
                        THEN make_date(anopublicacao::int, 1, 1)
                    ELSE NULL
                END
                WHERE data_ordenacao IS NULL
            """)
            count = cursor.rowcount

        self.stdout.write(self.style.SUCCESS(
            f"Backfill concluído: {count} registros atualizados."
        ))
