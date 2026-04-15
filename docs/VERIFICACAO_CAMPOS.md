# Verificação de Campos - Banco de Dados vs Django Models

## Campos no SQL (tabelas.sql) vs Modelos Django

### 1. tblassinatura (Assinatura)
**Campos na tabela SQL:**
- idassinatura (PK)
- assinatura
- trial446

**Status:** ✅ TUDO OK

---

### 2. tblgenero (Genero)
**Campos na tabela SQL:**
- idgenero (PK)
- genero
- trial446

**Status:** ✅ TUDO OK

---

### 3. tblinstanciaocorrenciacaso (Instancia)
**Campos na tabela SQL:**
- idinstanciaocorrenciacaso (PK)
- instancia
- observacao
- trial446

**Status:** ✅ TUDO OK

---

### 4. tbllivro (Livro)
**Campos na tabela SQL:**
- idlivro (PK)
- titulo
- trial446

**Status:** ✅ TUDO OK

---

### 5. tbllocalpublicacao (LocalPublicacao)
**Campos na tabela SQL:**
- idlocalpublicacao (PK)
- nomelocalpublicacao
- trial446

**Status:** ✅ TUDO OK

---

### 6. tblmidia (Midia)
**Campos na tabela SQL:**
- idmidia (PK)
- "mídia" ⚠️ **COM ACENTO**
- trial446

**Mapeamento Django:**
- id → db_column="idmidia"
- nome → db_column="midia" ❌ **SEM ACENTO**

**PROBLEMA:** O campo no banco é "mídia" com acento, mas o modelo aponta para "midia" sem acento!

---

### 7. tbltecnicaassinatura (Referencia)
**Campos na tabela SQL:**
- idtecnica (PK) ⚠️ **NÃO É id!**
- tecnica
- "observação" ⚠️ **COM ACENTO**
- trial449

**Mapeamento Django:**
- id → db_column=??? ❌ **NÃO MAPEADO!**
- tipo → db_column="tecnica"
- descricao → db_column="observacao" ❌ **SEM ACENTO**
- url (não existe no BD!)
- trial449

**PROBLEMAS:**
1. PK "idtecnica" não está mapeada!
2. Campo "observação" tem acento no banco mas modelo usa "observacao"
3. Campo "url" não existe no banco!

---

### 8. tblpeca (Peca)
**Campos na tabela SQL:**
- idpeca (PK)
- nomedaobrasimples
- nomedaobra
- idassinatura (FK)
- complementoassinatura
- idgenero (FK)
- "idmídia" ⚠️ **COM ACENTO** (FK)
- idlocalpub (FK)
- idinstancia (FK)
- numitem
- fonte
- mespublicacao
- anopublicacao
- datapublicacao
- diaassinatura
- mesassinatura
- anoassinatura
- idreuniaoemlivro (FK)
- dadosdapublicacao
- observacoes
- reproducoes
- trial446

**Mapeamento Django:**
- Todos os campos OK ✅ EXCETO:
- midia → db_column="idmidia" ❌ **No banco é "idmídia" COM ACENTO!**

---

## RESUMO DOS PROBLEMAS ENCONTRADOS

### 🔴 CRÍTICO - Campos com acentos/caracteres especiais:

1. **tblmidia.mídia** → modelo espera "midia"
2. **tblpeca.idmídia** → modelo espera "idmidia"
3. **tbltecnicaassinatura.observação** → modelo espera "observacao"

### 🔴 CRÍTICO - Mapeamento incorreto:

1. **Referencia.id** → Não está mapeado para db_column="idtecnica"
2. **Referencia.url** → Campo não existe no banco!

---

## PRÓXIMAS AÇÕES

Precisamos:
1. ✅ Corrigir o PK de Referencia para `db_column="idtecnica"`
2. ✅ Remover o campo `url` do modelo Referencia
3. ✅ Corrigir os db_column com acentos:
   - Midia.nome: "midia" → "mídia" 
   - Peca.midia: "idmidia" → "idmídia"
   - Referencia.descricao: "observacao" → "observação"
