from django.core.management.base import BaseCommand, CommandParser

from apps.catalog.services.importer import import_pecas_csv


class Command(BaseCommand):
    help = "Importa peças a partir de CSV para o catálogo"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("csv_path", type=str, help="Caminho do arquivo CSV")
        parser.add_argument(
            "--encoding",
            type=str,
            default="utf-8",
            help="Encoding do CSV (padrão: utf-8)",
        )

    def handle(self, *args, **options):
        result = import_pecas_csv(
            csv_path=options["csv_path"],
            encoding=options["encoding"],
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Importação concluída: criados={result.created}, atualizados={result.updated}, ignorados={result.skipped}"
            )
        )
