# ✅ Guia de Correção de Acentos nas Colunas

## 📋 Resumo das Mudanças

O projeto foi corrigido para remover acentos e caracteres especiais de colunas do banco de dados.

### Colunas Corrigidas

| Tabela | Coluna Atual | Nova Coluna | Motivo |
|--------|-------------|------------|--------|
| `tblpeca` | `idmídia` | `idmidia` | Remover cedilha |
| `tbltecnicaassinatura` | `observão` | `observacao` | Remover til |

## 🚀 Passo a Passo para Aplicar

### 1. Executar Script SQL no Banco

Execute o arquivo `fix_columns.sql` no seu banco de dados (PostgreSQL):

```bash
psql -U machado_user -d machado_db -f fix_columns.sql
```

Ou copypasteano seu cliente SQL (pgAdmin, DBeaver, etc):

```sql
-- Renomear coluna em tblpeca
ALTER TABLE tblpeca RENAME COLUMN "idmídia" TO idmidia;

-- Renomear coluna em tbltecnicaassinatura
ALTER TABLE tbltecnicaassinatura RENAME COLUMN "observão" TO observacao;

COMMIT;
```

### 2. Aplicar Migrations Django

Após executar o SQL, aplique as migrations:

```bash
python manage.py migrate catalog --fake
```

Ou se preferir sincronizar:

```bash
python manage.py migrate catalog
```

## 📝 Arquivos Modificados

- **models.py**: 
  - Campo `midia` em `Peca`: `db_column="idmidia"` (era `db_column="idmídia"`)
  - Campo `descricao` em `Referencia`: `db_column="observacao"` (era `db_column="observao"`)

- **migrations/0002_alter_peca_midia_alter_referencia_descricao.py**: 
  - Nova migration com as alterações

## ✨ Resultado Final

Após aplicar todas as mudanças:

- ✅ Nenhum acento ou caractere especial em nomes de colunas
- ✅ Django sincronizado com o banco de dados
- ✅ API REST funcionando corretamente

## 🔍 Verificação

Para verificar que as mudanças foram aplicadas:

```bash
python manage.py migrate catalog --plan
python manage.py runserver
```

Acesse: `http://localhost:8000/api/v1/pecas/`
