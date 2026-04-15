# Frontend inicial do Banco de Dados Machado de Assis

Este diretório contém uma interface estática inicial, pensada para ser a base do frontend do projeto.

## O que já faz

- Visual inspirado no LibGen
- Tabela principal com:
  - ordenação por coluna
  - filtros por coluna
  - paginação
  - busca geral
- Filtros por facetas usando a API já existente:
  - gênero
  - assinatura
  - instância
  - livro
  - mídia
- Modal de detalhes ao clicar em uma linha
- Links rápidos para administração pelo Django Admin
- Botões de navegação superiores preparados para futuras páginas

## Como usar

### Opção 1: abrir diretamente
Abra `index.html` em um ambiente servido por HTTP e com a API disponível no mesmo domínio em `/api/v1`.

### Opção 2: integrar ao Django
A forma mais simples depois é:

1. mover `index.html` para `templates/`
2. mover `styles.css` e `app.js` para `static/`
3. trocar os caminhos relativos por `{% static %}`
4. apontar a rota `/` do Django para esse template

## Observação importante

A busca geral e os filtros por facetas já usam a API do backend.

Os filtros digitados em cada coluna estão implementados no frontend sobre os resultados da página carregada. O próximo passo ideal é expandir a API para aceitar parâmetros específicos por coluna, caso você queira que esse filtro seja 100% server-side em toda a base.

## Próximos passos recomendados

- integrar esta tela à rota `/` do Django
- adicionar autenticação visual para modo administrador
- criar CRUD próprio no frontend para administradores
- incluir colunas extras opcionais como mídia e local de publicação
- criar página de créditos e página “sobre o projeto”
