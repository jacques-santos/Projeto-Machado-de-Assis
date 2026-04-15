from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from django.db import transaction

from apps.catalog.models import (
    Assinatura,
    Genero,
    Instancia,
    Livro,
    LocalPublicacao,
    Midia,
    Peca,
)


@dataclass
class ImportResult:
    created: int = 0
    updated: int = 0
    skipped: int = 0


def _to_int(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def _resolve_fk(model, value: Optional[str]):
    text = (value or "").strip()
    if not text:
        return None
    obj, _ = model.objects.get_or_create(nome=text)
    return obj


def _resolve_livro(value: Optional[str]):
    text = (value or "").strip()
    if not text:
        return None
    obj, _ = Livro.objects.get_or_create(titulo=text)
    return obj


def import_pecas_csv(csv_path: str | Path, encoding: str = "utf-8") -> ImportResult:
    path = Path(csv_path)
    result = ImportResult()

    with path.open("r", encoding=encoding, newline="") as fp:
        reader = csv.DictReader(fp)
        required_columns = {"nome_obra"}
        missing = required_columns - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV sem colunas obrigatórias: {', '.join(sorted(missing))}")

        with transaction.atomic():
            for row in reader:
                nome_obra = (row.get("nome_obra") or "").strip()
                if not nome_obra:
                    result.skipped += 1
                    continue

                codigo_exibicao = (row.get("codigo_exibicao") or "").strip()
                defaults = {
                    "nome_obra_simples": (row.get("nome_obra_simples") or "").strip(),
                    "ano_publicacao": _to_int(row.get("ano_publicacao")),
                    "mes_publicacao": _to_int(row.get("mes_publicacao")),
                    "fonte": (row.get("fonte") or "").strip(),
                    "dados_publicacao": (row.get("dados_publicacao") or "").strip(),
                    "observacoes": (row.get("observacoes") or "").strip(),
                    "registro": (row.get("registro") or "").strip(),
                    "reproducoes_texto": (row.get("reproducoes_texto") or "").strip(),
                    "assinatura": _resolve_fk(Assinatura, row.get("assinatura")),
                    "genero": _resolve_fk(Genero, row.get("genero")),
                    "instancia": _resolve_fk(Instancia, row.get("instancia")),
                    "local_publicacao": _resolve_fk(LocalPublicacao, row.get("local_publicacao")),
                    "midia": _resolve_fk(Midia, row.get("midia")),
                    "livro": _resolve_livro(row.get("livro")),
                }

                if codigo_exibicao:
                    obj, created = Peca.objects.update_or_create(
                        codigo_exibicao=codigo_exibicao,
                        defaults={"nome_obra": nome_obra, **defaults},
                    )
                else:
                    obj, created = Peca.objects.update_or_create(
                        nome_obra=nome_obra,
                        defaults={"codigo_exibicao": codigo_exibicao, **defaults},
                    )

                if created:
                    result.created += 1
                else:
                    result.updated += 1

                # Garante execução de save para normalizar slug ao atualizar
                obj.save()

    return result
