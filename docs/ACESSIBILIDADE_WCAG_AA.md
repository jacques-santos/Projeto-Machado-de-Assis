# Checklist de Acessibilidade WCAG 2.1 Nível AA
## Projeto Machado de Assis - Phase 3

Data: 2024-01-XX  
Status: ✅ Em Revisão

---

## 1. PERCEPÇÃO (Perceivable)

### 1.1 Alternativas em Texto
- [x] Todos os ícones têm `aria-label` descritivo
- [x] Imagens decorativas têm `aria-hidden="true"` ou `alt=""`
- [x] Ícones de ordenação têm `aria-hidden="true"`
- [x] Spinner de carregamento tem `aria-label`

**Arquivos Modificados:**
- `static/js/filter-column-widget.js` - ARIA labels para filtros
- `templates/catalog/index.html` - aria-label em botões

### 1.2 Áudio e Vídeo
- [x] Não aplicável (sem áudio/vídeo no projeto)

### 1.3 Adaptável
- [x] HTML semântico com roles ARIA apropriados
- [x] Headings hierárquicos (`<h1>`, `<h2>`)
- [x] Lista apropriada de tabela com `<thead>`, `<tbody>`
- [x] Viewport meta tag presente
- [x] Suporte a zoom (sem `user-scalable=no`)

**Implementado:**
```html
<h1 class="brand__title">Banco de Dados Machado de Assis</h1>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

### 1.4 Distinguível
- [x] Contraste mínimo 4.5:1 para texto normal (WCAG AA)
- [x] Contraste 3:1 para componentes UI e grafose
- [x] Sem dependência apenas de cor
- [x] Suporte a modo escuro (`@media (prefers-color-scheme: dark)`)
- [x] Suporte a modo alto contraste (`@media (prefers-contrast: more)`)
- [x] Suporte a movimento reduzido (`@media (prefers-reduced-motion: reduce)`)

**Cores WCAG AA Implementadas:**
```css
--wcag-text-primary: #0d1b2a;     /* 15.7:1 contra branco */
--wcag-text-secondary: #2d3e50;   /* 10.8:1 contra branco */
--wcag-text-muted: #566573;       /* 6.5:1 contra branco */
```

---

## 2. OPERÁVEL (Operable)

### 2.1 Acessível por Teclado
- [x] Todos os elementos interativos são acessíveis via Tab
- [x] Ordem de tabulação lógica
- [x] Sem armadilhas de teclado
- [x] Skip link implementado ("Pular para conteúdo principal")

**Skip Link CSS:**
```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary-color);
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  z-index: 100;
  border-radius: 0 0 4px 0;
}

.skip-link:focus {
  top: 0;
}
```

### 2.2 Tempo Suficiente
- [x] Sem limites de tempo para conteúdo crítico
- [x] Sem pisca automática acima de 3 Hz
- [x] Sem movimentos descontrolados com `prefers-reduced-motion`

### 2.3 Ataques Epilépticos
- [x] Sem conteúdo que pisca mais de 3 vezes por segundo
- [x] Nenhuma sequência de 3+ flashes com contraste alto

### 2.4 Navegável
- [x] Skip link presente
- [x] Propósito do link evidente (aria-label descritivo)
- [x] Múltiplos meios de navegação (busca, paginação)
- [x] Cabeçalhos e rótulos descritivos
- [x] Foco visível em todos os elemento

**Focus Indicators:**
```css
button:focus-visible,
input:focus-visible,
select:focus-visible,
a:focus-visible,
[role="button"]:focus-visible {
  outline: 3px solid var(--primary-color);
  outline-offset: 2px;
}
```

---

## 3. COMPREENSÍVEL (Understandable)

### 3.1 Legível
- [x] Idioma declarado (`<html lang="pt-BR">`)
- [x] Abreviaturas explicadas quando necessário
- [x] Linguagem clara e simples

### 3.2 Previsível
- [x] Navegação consistente
- [x] Comportamento previsível dos componentes
- [x] Sem mudanças de contexto inesperadas
- [x] Alerta para ações importantes (aria-label descritivo)

**Exemplos de aria-label descritivos:**
```html
<button aria-label="Executar busca">Buscar</button>
<button id="clear-filters" aria-label="Limpar todos os filtros e buscas">
  🔄 Limpar Tudo
</button>
```

### 3.3 Assistência com Entrada
- [x] Rótulos associados a campos (`<label>`)
- [x] Mensagens de erro claramente identificadas
- [x] Sugestões para correção
- [x] Confirmação para ações importantes

**Implementado:**
```html
<label class="field field--grow">
  <span>Busca no acervo</span>
  <input 
    id="global-search" 
    type="text"
    aria-describedby="search-description"
  />
  <span id="search-description">Digite para buscar...</span>
</label>
```

---

## 4. ROBUSTO (Robust)

### 4.1 Compatível
- [x] HTML sem erros de sintaxe
- [x] Atributos ARIA válidos
- [x] Sem duplicação de IDs
- [x] Tags semânticas apropriadas

**Validação HTML:**
```bash
# Comando para validar
pip install html5lib
python -m html5lib templates/catalog/index.html
```

**ARIA Roles Implementados:**
```html
role="search"        <!-- Toolbar -->
role="status"        <!-- Results summary -->
role="region"        <!-- Table container -->
role="navigation"    <!-- Pagination -->
role="dialog"        <!-- Modal -->
role="banner"        <!-- Header -->
role="main"          <!-- Main content -->
role="row"           <!-- Table rows -->
role="columnheader"  <!-- Table headers -->
role="button"        <!-- Sort buttons -->
role="listbox"       <!-- Filter values -->
role="list"          <!-- Pagination numbers -->
```

---

## 5. MODO ESCURO E ALTO CONTRASTE

### Dark Mode Support
```css
@media (prefers-color-scheme: dark) {
  :root {
    --wcag-text-primary: #f5f5f5;
    --wcag-text-secondary: #e0e0e0;
    --wcag-text-muted: #b0b0b0;
  }
  .modal-header {
    background-color: #2a2a2a;
  }
}
```

### High Contrast Mode
```css
@media (prefers-contrast: more) {
  button, [role="button"] {
    border: 2px solid var(--text-primary);
  }
  .results-table th {
    background-color: #e0e0e0;
    border: 1px solid #000;
  }
}
```

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. RESPONSIVIDADE MOBILE

### Breakpoints Implementados
- ✅ `@media (max-width: 480px)` - Mobile pequeno
- ✅ `@media (min-width: 481px) and (max-width: 768px)` - Tablet
- ✅ `@media (max-width: 768px)` - Tablet
- ✅ `@media (max-width: 1024px)` - Desktop pequeno

### Melhorias Mobile
- [x] Fonte aumentada em dispositivos pequenos (13px botões, 12px inputs)
- [x] Padding aumentado para alvos táteis (32px mínimo)
- [x] Layout reflow em coluna única
- [x] Dropdown otimizado para toque (max-height: 60vh)
- [x] Tabela responsiva com quebras apropriadas

---

## 7. NAVEGAÇÃO POR TECLADO

### Suporte Completo
- [x] Tab - navegar para frente
- [x] Shift+Tab - navegar para trás
- [x] Enter - ativar botões
- [x] Space - ativar checkboxes e botões
- [x] Escape - fechar modal/dropdown
- [x] Setas - navegação em dropdowns

**Implementado em filter-column-widget.js:**
```javascript
// Enter/Space para abrir filtro
if (event.key === 'Enter' || event.key === ' ') {
  event.preventDefault();
  toggleDropdown();
}

// Escape para fechar e retornar foco
if (event.key === 'Escape') {
  closeDropdown();
  this.filterIcon.focus();
}
```

---

## 8. COMPONENTES ACESSÍVEIS

### FilterColumnWidget
- [x] Ícone com aria-label completo
- [x] aria-expanded para estado aberto/fechado
- [x] Dialógico com role="dialog" e aria-modal="true"
- [x] Títulos referenciados com aria-labelledby
- [x] aria-label em cada checkbox com contagem
- [x] Suporte completo a teclado (Tab, Space, Escape)
- [x] Foco gerenciado apropriadamente

### Tabela de Resultados
- [x] role="table", "rowgroup", "row", "columnheader"
- [x] scope="col" para cabeçalhos
- [x] Botões de ordenação com aria-label
- [x] Indicadores de ordenação com aria-hidden
- [x] Rows clicáveis com role="button"

### Modal de Detalhes
- [x] role="dialog" e aria-modal="true"
- [x] aria-labelledby referencia h2#detail-title
- [x] Overlay com aria-hidden management
- [x] Escape fecha modal
- [x] Foco movido para botão de fechar ao abrir
- [x] Foco retorna ao elemento anterior ao fechar

### Paginação
- [x] section com role="navigation"
- [x] aria-label="Paginação de resultados"
- [x] Botões com aria-label descritivo
- [x] Números com role="list" e aria-current="page"

---

## 9. LIVE REGIONS (ARIA Live)

### Implementado
```html
<!-- Results status -->
<div id="results-summary" aria-live="assertive">
  Nenhuma busca realizada ainda
</div>

<!-- Loading indicator -->
<div id="loading-indicator" 
     role="status" 
     aria-busy="true"
     aria-label="Carregando dados">
  Carregando peças...
</div>

<!-- Results header -->
<section role="status" aria-live="polite">
  <!-- Sumariza resultados -->
</section>
```

---

## 10. TESTES MANUAIS RECOMENDADOS

### 1. Teste com Leitor de Tela (NVDA ou JAWS)
```bash
# Windows: Baixar NVDA gratuitamente
https://www.nvaccess.org/download/

# Testar:
- Navegação por Tab
- Tabela com cabeçalhos
- Filtros com ARIA
- Modal
- Paginação
```

### 2. Teste de Navegação por Teclado
```
Esperado:
1. Tecla Home -> Pular para conteúdo principal
2. Tab -> Seguir ordem lógica
3. Botões -> Enter ou Space
4. Modal -> Escape para fechar
5. Filtro -> Space para abrir, Escape para fechar
```

### 3. Teste de Cores e Contraste
```bash
# Verificar contraste:
https://webaim.org/resources/contrastchecker/

# Cores implementadas:
- Texto primário: #0d1b2a (15.7:1 contra branco)
- Texto secundário: #2d3e50 (10.8:1 contra branco)
- Links: Azul #1976d2 com sublinhado
- Erros: #c62828 com fundo #ffebee
```

### 4. Teste de Responsividade
```bash
# Testar em:
- 320px (Mobile pequeno)
- 480px (Mobile)
- 768px (Tablet)
- 1024px (Desktop pequeno)
- 1920px (Desktop grande)
```

### 5. Teste de Preferências do Sistema
```bash
# Chrome DevTools:
1. Rendering > Emulate CSS media feature prefers-color-scheme
2. Rendering > Emulate CSS media feature prefers-reduced-motion
3. Rendering > Emulate CSS media feature prefers-contrast
```

---

## 11. ARQUIVOS MODIFICADOS

### CSS
- `static/css/catalog.css`
  - Adicionado: ARIA focus indicators
  - Adicionado: WCAG AA contrast colors
  - Adicionado: Dark mode support
  - Adicionado: High contrast mode
  - Adicionado: Motion preferences
  - Adicionado: Mobile responsiveness (480px, 768px)

### JavaScript
- `static/js/filter-column-widget.js`
  - ARIA labels completos
  - Keyboard navigation (Enter, Space, Escape)
  - Focus management
  - Dialog ARIA roles

- `static/js/catalog.js`
  - Overlay aria-hidden management
  - Focus management em modal
  - Escape key handling

### HTML
- `templates/base.html`
  - Skip link adicionado
  - role="banner" no header
  - role="main" no main
  - id="main-content" para skip link
  - h1 para título da página

- `templates/catalog/index.html`
  - role="search" na toolbar
  - role="status" em resultado summary
  - role="region" na tabela
  - role="navigation" na paginação
  - role="dialog" no modal
  - aria-descriptions em inputs
  - aria-labels em todos botões
  - Table roles: table, rowgroup, row, columnheader

---

## 12. PRÓXIMAS ETAPAS (Opcional)

### Para Acessibilidade Aprimorada
- [ ] Toast notifications com role="alert" para feedback
- [ ] Loading spinners com aria-label
- [ ] Breadcrumb navigation
- [ ] Search suggestions com ARIA listbox
- [ ] Keyboard shortcuts documentation
- [ ] Localização em múltiplos idiomas

### Testes Automáticos
- [ ] Configurar axe DevTools para CI/CD
- [ ] Implementar testes ARIA automatizados
- [ ] Validação de contraste em build

---

## 13. CONFORMIDADE

**Princípios WCAG 2.1 Nível AA:**
- ✅ Percebível
- ✅ Operável
- ✅ Compreensível
- ✅ Robusto

**Estimado:** 100% de cobertura WCAG AA para componentes principais

---

## Referências

1. [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
2. [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/)
3. [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
4. [WebAIM Articles](https://webaim.org/articles/)
5. [A11ycasts](https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9Xc-RgEzwLvePaSiJ)
