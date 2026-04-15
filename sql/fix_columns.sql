-- Script para remover acentos e caracteres especiais das colunas
-- Executar quando tiver conexão com o banco de dados

-- Tabela: tblpeca
ALTER TABLE tblpeca RENAME COLUMN "idmídia" TO idmidia;

-- Tabela: tbltecnicaassinatura  
ALTER TABLE tbltecnicaassinatura RENAME COLUMN "observão" TO observacao;

-- Commit das alterações
COMMIT;
