# Banco de Dados Machado de Assis — Esqueleto Django

## Estrutura
- `config/`: configurações do projeto Django
- `apps/catalog/`: app principal com models, serializers, views e rotas
- `apps/catalog/services/importer.py`: serviço de importação CSV -> modelos
- `apps/catalog/management/commands/import_pecas.py`: comando de gestão para importação
- `apps/catalog/management/commands/db_status.py`: comando para validar conexão e contagem de registros
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

## Banco de dados
A aplicação já aceita conexão por `DATABASE_URL` no formato PostgreSQL.

Exemplo (Render):

```bash
export DATABASE_URL='postgresql://machado_user:KoxlxtdtdAqwt0kEQfRvSkQUV7crmKfq@dpg-d7ff8a1f9bms73d04tm0-a.virginia-postgres.render.com/machado_db'
```

Para validar conexão e obter dados (total de peças):

```bash
python manage.py db_status
```

## Variáveis de ambiente (principais)
- `DATABASE_URL`
- `POSTGRES_SSLMODE` (padrão: `require`)
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG` (`true`/`false`)
- `DJANGO_ALLOWED_HOSTS` (separado por vírgula)
- `API_PAGE_SIZE`

## Obtenção de dados via API
- `GET /api/v1/health/`
- `GET /api/v1/pecas/`
- `GET /api/v1/pecas/{id}/`
- `GET /api/v1/pecas/facetas/`
- `GET /api/v1/generos/`, `/api/v1/assinaturas/`, `/api/v1/midias/`, etc.

Exemplo com filtros:

```http
GET /api/v1/pecas/?ano=1870&genero_id=3&ordering=nome_obra&search=crônica
```

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
