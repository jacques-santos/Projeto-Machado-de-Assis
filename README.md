# Banco de Dados Machado de Assis — Esqueleto Django

## Estrutura
- `config/`: configurações do projeto Django
- `apps/catalog/`: app principal com models, serializers, views e rotas
- `apps/catalog/services/importer.py`: serviço de importação CSV -> modelos
- `apps/catalog/management/commands/import_pecas.py`: comando de gestão para importação
- `tests/`: testes unitários iniciais
- `requirements.txt`: dependências básicas

## Como iniciar
1. Criar ambiente virtual e instalar dependências.
2. Configurar variáveis de ambiente do Django/PostgreSQL.
3. Rodar migrações:
   - `python manage.py makemigrations`
   - `python manage.py migrate`
4. Criar superusuário:
   - `python manage.py createsuperuser`
5. Subir servidor:
   - `python manage.py runserver`

## Variáveis de ambiente (principais)
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG` (`true`/`false`)
- `DJANGO_ALLOWED_HOSTS` (separado por vírgula)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
- `API_PAGE_SIZE`

## Endpoints-base
- `/api/v1/health/`
- `/api/v1/pecas/`
- `/api/v1/pecas/{id}/`
- `/api/v1/pecas/facetas/`
- `/api/v1/generos/`, `/api/v1/assinaturas/`, `/api/v1/midias/`, etc.

## Importação inicial (CSV)
Comando disponível para carga inicial:

```bash
python manage.py import_pecas /caminho/arquivo.csv --encoding utf-8
```

Colunas esperadas (mínimo):
- Obrigatória: `nome_obra`
- Suportadas: `codigo_exibicao`, `nome_obra_simples`, `ano_publicacao`, `mes_publicacao`, `fonte`,
  `dados_publicacao`, `observacoes`, `registro`, `reproducoes_texto`, `assinatura`, `genero`,
  `instancia`, `local_publicacao`, `midia`, `livro`.

## Testes
- `pytest -q`
