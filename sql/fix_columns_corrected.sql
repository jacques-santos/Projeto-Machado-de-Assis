-- ============================================================
-- Script SQL para Remover Acentos das Colunas
-- ============================================================
-- Execute este script no banco de dados PostgreSQL
-- Renomeia colunas com acentos para versões sem acentos

-- 1. Renomear coluna em tblmidia: mídia → midia
ALTER TABLE tblmidia RENAME COLUMN "mídia" TO midia;

-- 2. Renomear coluna em tblpeca: idmídia → idmidia
ALTER TABLE tblpeca RENAME COLUMN "idmídia" TO idmidia;

-- 3. Renomear coluna em tbltecnicaassinatura: observação → observacao
ALTER TABLE tbltecnicaassinatura RENAME COLUMN "observação" TO observacao;

-- Confirmar alterações
COMMIT;

-- Verificação (opcional - executar após as alterações)
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name IN ('tblmidia', 'tblpeca', 'tbltecnicaassinatura')
-- ORDER BY table_name, ordinal_position;
