/**
 * Catálogo de Machado de Assis - Application Script
 * Handles all interactions with the catalog interface and API
 */

// ===== CONFIGURATION =====
const config = window.MACHADO_CONFIG || {};
const apiBase = (config.apiBase || '/api/v1').replace(/\/$/, '');

// ===== STATE MANAGEMENT =====
const state = {
  // Pagination
  rows: [],
  total: 0,
  page: 1,
  pageSize: 250,
  nextUrl: null,
  previousUrl: null,

  // Search and filters
  globalSearch: '',
  sortKey: '',
  sortDirection: '', // 'asc', 'desc', or ''
  
  // Toggles
  showExtra: false,
  compact: false,
  onlyDated: false,

  // Nome da Peça header search
  nomeObraSearch: '',

  // Extra filters (dados adicionais)
  extraFilters: {
  },

  // Column filters (client-side for now, could be server-side)
  columnFilters: {
    ano_publicacao: '',
    mes_publicacao: '',
    data_publicacao: '',
    nome_obra: '',
    assinatura: '',
    local_publicacao: '',
    midia: '',
    genero: '',
    livro: '',
  },

  // Autocomplete options
  autocompleteData: {
    assinatura: [],
    instancia: [],
    livro: [],
    genero: [],
    nome_obra: [],
    midia: [],
    local_publicacao: [],
    fonte: [],
    dados_publicacao: [],
    observacoes: [],
    reproducoes: [],
  },

  // Column filters widgets
  columnFilterWidgets: {},
  activeColumnFilters: {}, // { columnName: { selectedValues: [], sortOrder: null } }

  // Facet filters
  facetFilters: {},

  // Focus tracking for modal accessibility
  lastFocusedElement: null,
};

// ===== DOM ELEMENTS CACHE =====
const els = {
  // Results
  resultsBody: document.getElementById('results-body'),
  resultsSummary: document.getElementById('results-summary'),
  loadingIndicator: document.getElementById('loading-indicator'),
  table: document.getElementById('results-table'),

  // Pagination
  prevPage: document.getElementById('prev-page'),
  nextPage: document.getElementById('next-page'),
  paginationNumbers: document.getElementById('pagination-numbers'),

  // Active filters bar
  activeFiltersBar: document.getElementById('active-filters-bar'),
  activeFiltersChips: document.getElementById('active-filters-chips'),
  clearAllFiltersBtn: document.getElementById('clear-all-filters-btn'),

  // Controls
  pageSize: document.getElementById('page-size'),
  globalSearch: document.getElementById('global-search'),
  applySearch: document.getElementById('apply-search'),
  clearFilters: document.getElementById('clear-filters'),

  // Toggles
  toggleExtra: document.getElementById('toggle-extra'),
  toggleCompact: document.getElementById('toggle-compact'),
  toggleDatedOnly: document.getElementById('toggle-dated-only'),

  // Nome da Peça header search
  nomeObraSearch: document.getElementById('nome-obra-search'),

  // Extra filters (dados adicionais)

  // Modal
  detailModal: document.getElementById('detail-modal'),
  detailTitle: document.getElementById('detail-title'),
  detailContent: document.getElementById('detail-content'),
  modalOverlay: document.querySelector('.modal-overlay'),
  closeModal: document.getElementById('close-modal'),
};

// ===== CONFIGURATION =====
const serverSortableFields = new Set([
  'id',
  'data_publicacao',
  'data_ordenacao',
  'nome_obra',
  'assinatura',
  'local_publicacao',
  'genero',
  'midia',
  'livro',
]);

// Maps frontend sort key to actual API ordering field
const sortFieldMapping = {
  'data_publicacao': 'data_ordenacao',
};

// ===== UTILITY FUNCTIONS =====

/**
 * Converte um valor para texto plano e escapa caracteres perigosos de HTML.
 * Nota: Apenas faz escape, não faz unescape duplo.
 */
function safeText(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts URLs in already-escaped text into clickable links.
 * Must be called AFTER safeText to avoid XSS.
 */
function linkifyUrls(escapedText) {
  if (!escapedText) return '';
  return escapedText.replace(
    /(https?:\/\/[^\s"'&<>]+)/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

/**
 * Remove tags HTML e converte entidades HTML comuns para caracteres normais.
 * Exemplo: "&quot;Cleópatra&quot;" → "Cleópatra"
 * Exemplo: "Escravo&nbsp;e&nbsp;Rainha" → "Escravo e Rainha"
 */
function openLinksInNewTab(html) {
  if (!html) return '';
  return String(html).replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer" ');
}

/** Reusable textarea element for decoding HTML entities via the browser engine. */
const _decodeArea = document.createElement('textarea');

function stripHtmlAndDecode(value) {
  if (!value) return '';
  
  let text = String(value);
  
  // Remove tags HTML
  text = text.replace(/<[^>]*>/g, '');
  
  // Decodifica TODAS as entidades HTML (&Agrave;, &Ecirc;, &#39; etc.)
  // usando o parser nativo do browser
  _decodeArea.innerHTML = text;
  text = _decodeArea.value;
  
  // Remove espaços múltiplos e limpa
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

function stripHtml(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').trim();
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatDate(value) {
  if (!value) return '—';
  
  // Extract only the date part (YYYY-MM-DD) to avoid timezone offset
  // shifting the date by -1 day when the browser is behind UTC.
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return String(value);
  }
  
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Exibe uma notificação toast temporária no canto superior da tela.
 * @param {string} message - Mensagem a exibir
 * @param {'info'|'warning'|'error'} type - Tipo do alerta
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast--fade-out');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 4000);
}

/**
 * Destaca termos de busca em texto já escapado por safeText().
 * Insere <mark> em torno de cada ocorrência.
 */
function highlightSearch(escapedText) {
  if (!state.globalSearch || !escapedText) return escapedText;
  const term = state.globalSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${term})`, 'gi');
  return escapedText.replace(regex, '<mark>$1</mark>');
}

/**
 * Destaca termos de busca em conteúdo HTML, aplicando <mark> apenas
 * em partes de texto fora de tags HTML.
 */
function highlightSearchInHtml(html) {
  if (!state.globalSearch || !html) return html;
  const term = state.globalSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${term})`, 'gi');
  // Split by HTML tags, highlight only text segments
  return html.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag;
    return text.replace(regex, '<mark>$1</mark>');
  });
}

function formatMonth(month) {
  if (!month || month < 1 || month > 12) return '—';
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  return months[month - 1];
}

// ===== SORTING =====

/**
 * Debounce - Executa função apenas após N ms sin atividade
 * Útil para reduzir requisições durante digitação
 */
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

function cycleSort(sortKey) {
  if (state.sortKey !== sortKey) {
    state.sortKey = sortKey;
    state.sortDirection = 'asc';
    return;
  }

  if (state.sortDirection === 'asc') {
    state.sortDirection = 'desc';
    return;
  }

  state.sortKey = '';
  state.sortDirection = '';
}

function getServerOrdering() {
  if (!state.sortKey || !state.sortDirection || !serverSortableFields.has(state.sortKey)) {
    return '';
  }
  const apiField = sortFieldMapping[state.sortKey] || state.sortKey;
  return state.sortDirection === 'desc' ? `-${apiField}` : apiField;
}

function updateSortIndicators() {
  document.querySelectorAll('.sort-btn').forEach((btn) => {
    const field = btn.dataset.sort;
    const indicator = btn.querySelector('.sort-indicator');
    indicator.classList.remove('asc', 'desc');
    if (field === state.sortKey && state.sortDirection) {
      indicator.classList.add(state.sortDirection);
    }
  });
}

// ===== API CALLS =====

function buildApiUrl() {
  const url = new URL(`${apiBase}/pecas/`, window.location.origin);
  url.searchParams.set('page', String(state.page));
  url.searchParams.set('page_size', String(state.pageSize));

  if (state.globalSearch) {
    url.searchParams.set('search', state.globalSearch);
  }

  if (state.nomeObraSearch) {
    url.searchParams.set('nome_obra_search', state.nomeObraSearch);
  }

  // Extra filters (dados adicionais)
  Object.entries(state.extraFilters).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  // Filtro "apenas com data" no servidor
  if (state.onlyDated) {
    url.searchParams.set('has_date', 'true');
  }

  const ordering = getServerOrdering();
  if (ordering) {
    url.searchParams.set('ordering', ordering);
  }

  // Adicionar filtros de coluna como query parameters
  // Enviar valores separados por vírgula: ?id=1001,1002,1003
  Object.entries(state.activeColumnFilters).forEach(([columnName, filterData]) => {
    // Range filters (ano_min/ano_max, data_min/data_max)
    if (filterData.rangeMin) {
      if (columnName === 'ano_publicacao') {
        url.searchParams.set('ano_min', filterData.rangeMin);
      } else if (columnName === 'data_publicacao') {
        url.searchParams.set('data_min', filterData.rangeMin);
      }
    }
    if (filterData.rangeMax) {
      if (columnName === 'ano_publicacao') {
        url.searchParams.set('ano_max', filterData.rangeMax);
      } else if (columnName === 'data_publicacao') {
        url.searchParams.set('data_max', filterData.rangeMax);
      }
    }

    if (filterData.selectedValues) {
      // Converter para array se for um Set
      let values = filterData.selectedValues;
      if (values instanceof Set) {
        values = Array.from(values);
      }
      // When a range is active, don't send selectedValues (the range already filters server-side).
      // selectedValues for date columns with range would only contain __blank__ which conflicts with the range.
      const hasRange = filterData.rangeMin || filterData.rangeMax;
      if (hasRange) {
        // Skip selectedValues entirely — range handles the filtering
      } else if (Array.isArray(values) && values.length > 0) {
        // Skip sending selectedValues if ALL values are selected (no actual restriction)
        const widget = state.columnFilterWidgets[columnName];
        const totalValues = widget ? widget.allValues.length : 0;
        if (totalValues > 0 && values.length >= totalValues) {
          // All values selected — no restriction needed
        } else {
          // Mapear null para __blank__ e filtrar valores inválidos
          const validValues = values
            .filter(v => v !== 'None' && v !== '')
            .map(v => {
              if (v === null) return '__blank__';
              // Strip time portion from datetime values (e.g. "1854-10-03 00:00:00" -> "1854-10-03")
              if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}[ T]/.test(v)) {
                return v.split(/[ T]/)[0];
              }
              return v;
            });
          
          if (validValues.length > 0) {
            if (columnName === 'nome_obra') {
              // nome_obra values may contain commas; use repeated params
              validValues.forEach(v => url.searchParams.append(columnName, v));
            } else {
              url.searchParams.set(columnName, validValues.join(','));
            }
          }
        }
      }
    }
  });

  return url.toString();
}

/**
 * Busca sugestões de autocomplete do servidor.
 * @param {string} field - nome do campo (nome_obra, dados_publicacao, observacoes, etc.)
 * @param {string} query - texto digitado pelo usuário (opcional)
 * @param {number} limit - máximo de resultados
 * @returns {Promise<string[]>}
 */
async function fetchAutocompleteSuggestions(field, query, limit = 200) {
  try {
    const url = new URL(`${apiBase}/pecas/autocomplete/`, window.location.origin);
    url.searchParams.set('field', field);
    if (query) url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));
    const resp = await fetch(url.toString());
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.values || [];
  } catch {
    return [];
  }
}

/**
 * Carrega todas as sugestões server-side para os campos de autocomplete.
 * Chamado uma vez na inicialização; resultados ficam em state.autocompleteData.
 * Para livro, local_publicacao e fonte, carrega também contagens via column_values.
 */
async function loadServerAutocompleteData() {
  // Campos que usam autocomplete simples (só strings)
  const simpleFields = ['nome_obra', 'dados_publicacao', 'observacoes', 'reproducoes'];
  // Campos que precisam de contagens (usam column_values)
  const countFields = ['fonte', 'livro', 'local_publicacao'];

  const [simpleResults, ...countResults] = await Promise.all([
    Promise.all(simpleFields.map((f) => fetchAutocompleteSuggestions(f, '', 1000))),
    ...countFields.map((f) => fetchColumnValuesForAutocomplete(f)),
  ]);

  simpleFields.forEach((f, i) => {
    state.autocompleteData[f] = simpleResults[i];
  });
  countFields.forEach((f, i) => {
    state.autocompleteData[f] = countResults[i];
  });
}

/**
 * Busca valores de coluna com contagens para uso nos filtros da toolbar.
 */
async function fetchColumnValuesForAutocomplete(column) {
  try {
    const url = new URL(`${apiBase}/pecas/column_values/`, window.location.origin);
    url.searchParams.set('column', column);
    const resp = await fetch(url.toString());
    if (!resp.ok) return [];
    const data = await resp.json();
    // Retorna array de {value, count}, excluindo blanks
    return (data.values || [])
      .filter(v => !v.isBlank && v.value)
      .map(v => ({ value: v.value, count: v.count }));
  } catch {
    return [];
  }
}

async function fetchPecas() {
  try {
    setLoading('Carregando títulos...');
    
    const url = buildApiUrl();
    
    // Fetch com timeout de 30 segundos
    const controller = new AbortController();
    let timeoutId;
    let hasCompleted = false;
    
    const setupTimeout = () => {
      timeoutId = setTimeout(() => {
        if (!hasCompleted) {
          controller.abort();
        }
      }, 30000);
    };
    
    const clearRequestTimeout = () => {
      hasCompleted = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
    
    setupTimeout();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: controller.signal,
    });
    
    clearRequestTimeout();
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Limite de requisições atingido. Aguarde alguns segundos e tente novamente.');
      }
      const errorData = await response.text();
      console.error(`HTTP ${response.status}:`, errorData);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validar resposta
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Resposta inválida da API (results não é array)');
    }
    
    state.rows = data.results;
    state.total = data.count || data.pagination?.count || 0;
    state.nextUrl = data.next;
    state.previousUrl = data.previous;

    updateResultsDisplay();
    updateTableDisplay();
    updatePaginationDisplay();
    updateActiveFiltersBar();
    saveStateToUrl();

    return state.total;
    
  } catch (error) {
    console.error('Erro ao buscar peças:', error);
    
    let errorMsg = error.message;
    if (error.name === 'AbortError') {
      errorMsg = 'Requisição expirou ou foi cancelada (timeout 30s)';
    } else if (!navigator.onLine) {
      errorMsg = 'Sem conexão com a internet';
    } else if (error instanceof TypeError) {
      errorMsg = 'Erro de conexão - verifique se o servidor está rodando';
    }
    
    setLoading('');
    showErrorState(`Erro ao carregar dados: ${errorMsg}`);
    showToast(errorMsg, 'error');
  }
}

/**
 * Aplica um filtro "Filtrar..." da barra de cima. Se retornar 0 resultados,
 * limpa todos os outros filtros e reaplica somente o filtro atual.
 * @param {string} currentKey - chave do filtro extra que acabou de ser aplicado
 */
async function applyToolbarFilterWithRetry(currentKey) {
  const total = await fetchPecas();
  if (total === 0) {
    // Salvar apenas o valor do filtro que acabou de ser aplicado
    const savedValue = state.extraFilters[currentKey];

    // Limpar tudo
    state.globalSearch = '';
    state.sortKey = '';
    state.sortDirection = '';
    state.onlyDated = false;
    state.nomeObraSearch = '';
    state.extraFilters = {
    };
    state.columnFilters = {
      ano_publicacao: '', mes_publicacao: '', data_publicacao: '',
      nome_obra: '', assinatura: '', local_publicacao: '', midia: '', genero: '', livro: '',
    };
    state.activeColumnFilters = {};

    // Restaurar apenas o filtro atual
    state.extraFilters[currentKey] = savedValue;

    // Atualizar UI
    els.globalSearch.value = '';
    els.toggleDatedOnly.checked = false;
    if (els.nomeObraSearch) els.nomeObraSearch.value = '';
    document.querySelectorAll('[data-column-filter]').forEach((input) => { input.value = ''; });

    // Resetar widgets de coluna
    Object.values(state.columnFilterWidgets).forEach((widget) => {
      if (widget) {
        widget.filterState.selectedValues = new Set(widget.allValues.map(v => v.value));
        widget.filterState.isActive = false;
        widget.filterState.textFilters = [];
        widget.filterState.sortOrder = null;
        widget.filterState.rangeMin = null;
        widget.filterState.rangeMax = null;
        if (!widget.hideFilterIcon) widget.createFilterIcon();
      }
    });
    updateSortIndicators();

    state.page = 1;
    await fetchPecas();
    showToast('Outros filtros foram limpos para exibir resultados.', 'info');
  }
  refreshAllColumnFilterWidgets();
}

async function fetchFacetas() {
  try {
    const url = `${apiBase}/pecas/facetas/`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    updateFacetDisplay('genero', data.generos);
    updateFacetDisplay('assinatura', data.assinaturas);
    updateFacetDisplay('instancia', data.instancias || []);
    updateFacetDisplay('livro', data.livros);
    updateFacetDisplay('midia', data.midias);
  } catch (error) {
    console.error('Erro ao buscar facetas:', error);
  }
}

// ===== DISPLAY UPDATES =====

function setLoading(message) {
  els.loadingIndicator.textContent = message;
  els.loadingIndicator.style.display = message ? 'block' : 'none';
  if (message && els.resultsBody) {
    const skeletonRows = Array.from({length: 5}, () => `
      <tr class="skeleton-row">
        <td><span class="skeleton-cell"></span></td>
        <td><span class="skeleton-cell"></span></td>
        <td><span class="skeleton-cell"></span></td>
        <td><span class="skeleton-cell"></span></td>
        <td><span class="skeleton-cell skeleton-cell--wide"></span></td>
        <td><span class="skeleton-cell"></span></td>
        <td><span class="skeleton-cell"></span></td>
        <td><span class="skeleton-cell"></span></td>
        <td><span class="skeleton-cell"></span></td>
      </tr>
    `).join('');
    els.resultsBody.innerHTML = skeletonRows;
  }
}

function showErrorState(message) {
  els.resultsBody.innerHTML = `
    <tr>
      <td colspan="9" class="error-state">
        <p>⚠️ ${safeText(message)}</p>
      </td>
    </tr>
  `;
}

function updateResultsDisplay() {
  setLoading('');
  
  if (state.total === 0) {
    els.resultsSummary.textContent = 'Nenhum título encontrado';
    els.resultsSummary.classList.add('empty');
    return;
  }

  els.resultsSummary.classList.remove('empty');
  const start = (state.page - 1) * state.pageSize + 1;
  const end = Math.min(state.page * state.pageSize, state.total);
  
  // Mostrar informações de forma clara
  let summary = `Mostrando <strong>${start}–${end}</strong> de <strong>${state.total}</strong>`;
  if (state.globalSearch) {
    summary += ` (busca: "${safeText(state.globalSearch)}")`;
  }
  els.resultsSummary.innerHTML = summary;
}

/**
 * Constrói uma sub-row com dados adicionais (campos de texto longos)
 * Visível apenas quando "Dados adicionais" está ativado via CSS .show-extra
 */
function buildExtraDataRow(row) {
  const fields = [
    { label: 'Código', value: row.id },
    { label: 'Local de inscrição da assinatura', value: row.instancia },
    { label: 'Fonte', value: row.fonte },
    { label: 'Dados da Publicação', value: row.dados_publicacao, html: true },
    { label: 'Observações', value: row.observacoes, html: true },
    { label: 'Reproduções', value: row.reproducoes_texto, html: true },
  ].filter(f => f.value);

  const hasImages = row.imagens && row.imagens.length > 0;

  if (fields.length === 0 && !hasImages) {
    return `<tr class="extra-data-row"><td colspan="9" style="padding: 4px 10px !important; background: var(--light-bg); border-bottom: 2px solid var(--border-color);"><span style="font-size: 11px; color: var(--text-muted); font-style: italic;">Sem dados adicionais</span></td></tr>`;
  }

  let imagesHtml = '';
  if (hasImages) {
    const thumbs = row.imagens.map(img => {
      const legendaAttr = img.legenda ? ` title="${safeText(img.legenda)}"` : '';
      return `<img src="${safeText(img.imagem)}" alt="${safeText(img.legenda || 'Imagem da peça')}" class="extra-thumb" data-full-src="${safeText(img.imagem)}" data-legenda="${safeText(img.legenda || '')}"${legendaAttr} loading="lazy" />`;
    }).join('');
    imagesHtml = `
      <div class="extra-field-full extra-images-row">
        <span class="extra-label">Imagens</span>
        <div class="extra-thumbs">${thumbs}</div>
      </div>`;
  }

  const fieldsHtml = fields.map(f => `
    <div class="${f.full ? 'extra-field-full' : 'extra-field'}">
      <span class="extra-label">${f.label}</span>
      <span class="extra-value">${f.html ? highlightSearchInHtml(openLinksInNewTab(f.value)) : highlightSearch(safeText(stripHtmlAndDecode(f.value)))}</span>
    </div>
  `).join('');

  return `<tr class="extra-data-row"><td colspan="9"><div class="extra-data-content">${imagesHtml}${fieldsHtml}</div></td></tr>`;
}

function updateTableDisplay() {
  if (state.rows.length === 0) {
    const hasFilters = state.globalSearch || state.onlyDated || Object.keys(state.activeColumnFilters).length > 0;
    const suggestion = hasFilters
      ? '<p>Tente ajustar os filtros, remover termos de busca ou <button type="button" class="link-btn" id="empty-clear-filters">limpar todos os filtros</button>.</p>'
      : '<p>Nenhum título disponível no momento.</p>';
    els.resultsBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <p>Nenhum título corresponde aos seus filtros</p>
          ${suggestion}
        </td>
      </tr>
    `;
    const clearBtn = document.getElementById('empty-clear-filters');
    if (clearBtn) clearBtn.addEventListener('click', handleClearFilters);
    return;
  }

  // Apply client-side filters
  let filtered = applyClientFilters(state.rows);

  // Render rows
  els.resultsBody.innerHTML = filtered.map((row) => {
    const mainRow = `
    <tr class="result-row" data-id="${row.id}" tabindex="0" role="button" title="Clique ou pressione Enter para ver detalhes">
      <td class="col-ano">${highlightSearch(safeText(row.ano_publicacao || '—'))}</td>
      <td class="col-mes">${formatMonth(row.mes_publicacao)}</td>
      <td class="col-data">${formatDate(row.data_publicacao)}</td>
      <td class="col-obra">${highlightSearch(safeText(stripHtmlAndDecode(row.nome_obra)))}</td>
      <td class="col-assinatura">${highlightSearch(safeText(row.assinatura || '—'))}</td>
      <td class="col-local">${highlightSearch(safeText(row.local_publicacao || '—'))}</td>
      <td class="col-genero">${highlightSearch(safeText(row.genero || '—'))}</td>
      <td class="col-midia">${highlightSearch(safeText(row.midia || '—'))}</td>
      <td class="col-livro">${highlightSearch(safeText(row.livro || '—'))}</td>
    </tr>`;

    const extraRow = buildExtraDataRow(row);
    return mainRow + extraRow;
  }).join('');

  // Add row click and keyboard handlers
  document.querySelectorAll('.result-row').forEach((row) => {
    const openDetail = () => {
      state.lastFocusedElement = row;
      showDetailModal(row.dataset.id);
    };
    row.addEventListener('click', openDetail);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail();
      }
    });
  });

  // Update autocomplete data
  updateAutocompleteData(filtered);
}

function updateAutocompleteData(rows) {
  // Atualiza apenas os campos de filtro de coluna (dados da página atual).
  // Os campos da barra de cima (nome_obra, midia, local_publicacao, fonte,
  // dados_publicacao, observacoes, reproducoes) são carregados do servidor
  // via loadServerAutocompleteData() e NÃO devem ser sobrescritos aqui.
  const columnFields = ['assinatura', 'local_publicacao', 'genero', 'midia', 'livro'];
  const uniqueValues = {};
  columnFields.forEach((f) => { uniqueValues[f] = new Set(); });

  rows.forEach((row) => {
    if (row.assinatura) uniqueValues.assinatura.add(row.assinatura);
    if (row.local_publicacao) uniqueValues.local_publicacao.add(row.local_publicacao);
    if (row.midia) uniqueValues.midia.add(row.midia);
    if (row.genero) uniqueValues.genero.add(row.genero);
    if (row.livro) uniqueValues.livro.add(row.livro);
  });

  // Convert sets to sorted arrays
  columnFields.forEach((key) => {
    state.autocompleteData[key] = Array.from(uniqueValues[key]).sort();
  });
}

function applyClientFilters(rows) {
  let filtered = [...rows];

  // "Apenas com data" agora é filtro server-side (has_date param)

  // Apply column filters
  Object.entries(state.columnFilters).forEach(([key, rawValue]) => {
    const expected = normalizeText(rawValue);
    if (!expected) return;

    filtered = filtered.filter((row) => {
      const valueMap = {
        ano_publicacao: String(row.ano_publicacao || ''),
        mes_publicacao: String(row.mes_publicacao || ''),
        data_publicacao: formatDate(row.data_publicacao),
        nome_obra: stripHtmlAndDecode(row.nome_obra),
        assinatura: row.assinatura || '',
        local_publicacao: row.local_publicacao || '',
        midia: row.midia || '',
        genero: row.genero || '',
        livro: row.livro || '',
      };

      return normalizeText(valueMap[key]).includes(expected);
    });
  });

  // Apply column filter widgets (multiple values with OR logic)
  Object.entries(state.activeColumnFilters).forEach(([columnName, filterData]) => {
    if (!filterData.selectedValues || filterData.selectedValues.length === 0) {
      return;
    }

    // Skip client-side filtering when a range is active — the server already filters by range.
    // selectedValues may only contain __blank__/null which would hide all dated records.
    const hasRange = filterData.rangeMin || filterData.rangeMax;
    if (hasRange) {
      return;
    }

    filtered = filtered.filter((row) => {
      const valueMap = {
        id: String(row.id),
        ano_publicacao: String(row.ano_publicacao || ''),
        mes_publicacao: String(row.mes_publicacao || ''),
        data_publicacao: String(row.data_publicacao || '').split(/[ T]/)[0],
        nome_obra: stripHtmlAndDecode(row.nome_obra),
        assinatura: row.assinatura || '',
        local_publicacao: row.local_publicacao || '',
        midia: row.midia || '',
        genero: row.genero || '',
        livro: row.livro || '',
        instancia: row.instancia || '',
        fonte: row.fonte || '',
      };

      const rowValue = String(valueMap[columnName] || '');
      
      // Lógica OR: se algum valor selecionado corresponder
      return filterData.selectedValues.some((selectedValue) => {
        // Tratar valor em branco
        if (selectedValue === null || selectedValue === '__blank__') {
          return !row[columnName] && row[columnName] !== 0;
        }
        selectedValue = String(selectedValue);
        
        // Aplicar filtros de texto se existirem
        if (filterData.textFilters && filterData.textFilters.length > 0) {
          return filterData.textFilters.some((textFilter) => {
            const { type, value } = textFilter;
            const lowerRow = rowValue.toLowerCase();
            const lowerValue = value.toLowerCase();

            switch (type) {
              case 'contains':
                return lowerRow.includes(lowerValue);
              case 'not_contains':
                return !lowerRow.includes(lowerValue);
              case 'starts_with':
                return lowerRow.startsWith(lowerValue);
              case 'ends_with':
                return lowerRow.endsWith(lowerValue);
              case 'equals':
                return lowerRow === lowerValue;
              case 'not_equals':
                return lowerRow !== lowerValue;
              default:
                return true;
            }
          });
        }

        // Lógica de valor múltiplo (OR)
        return rowValue === selectedValue;
      });
    });
  });

  // Apply client-side sorting for non-server fields
  if (state.sortKey && !serverSortableFields.has(state.sortKey)) {
    filtered.sort((a, b) => {
      const extractValue = (row) => {
        const map = {
          assinatura: row.assinatura || '',
          livro: row.livro || '',
          genero: row.genero || '',
        };
        return normalizeText(map[state.sortKey]);
      };

      const aVal = extractValue(a);
      const bVal = extractValue(b);

      if (aVal < bVal) return state.sortDirection === 'desc' ? 1 : -1;
      if (aVal > bVal) return state.sortDirection === 'desc' ? -1 : 1;
      return 0;
    });
  }

  return filtered;
}

function updatePaginationDisplay() {
  // Calculate total pages
  const totalPages = Math.ceil(state.total / state.pageSize);
  
  // Disable previous/next buttons
  els.prevPage.disabled = !state.previousUrl;
  els.nextPage.disabled = !state.nextUrl;

  // Generate page numbers (show 6 pages or less if total < 6)
  const maxPageButtons = 6;
  let startPage = 1;
  let endPage = Math.min(maxPageButtons, totalPages);

  // Adjust range to keep current page visible
  if (state.page > endPage - 2) {
    startPage = Math.max(1, state.page - (maxPageButtons - 3));
    endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  }

  // Generate page buttons HTML
  let paginationHTML = '';

  // Page info indicator
  if (totalPages > 0) {
    paginationHTML += `<span class="pagination-info">Página ${state.page} de ${totalPages}</span>`;
  }

  // First page button if not visible
  if (startPage > 1) {
    paginationHTML += `
      <button type="button" class="pagination-btn" data-page="1" title="Página 1">1</button>
      <span class="pagination-ellipsis">…</span>
    `;
  }

  // Add page buttons
  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === state.page;
    paginationHTML += `
      <button 
        type="button" 
        class="pagination-btn ${isActive ? 'active' : ''}" 
        data-page="${i}"
        title="Página ${i}"
      >
        ${i}
      </button>
    `;
  }

  // Last page button if not visible
  if (endPage < totalPages) {
    paginationHTML += `<span class="pagination-ellipsis">…</span>`;
    paginationHTML += `
      <button type="button" class="pagination-btn" data-page="${totalPages}" title="Página ${totalPages}">${totalPages}</button>
    `;
  }

  // Update pagination section
  els.paginationNumbers.innerHTML = paginationHTML;

  // Add click handlers to page buttons
  document.querySelectorAll('.pagination-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page, 10);
      handlePageNumberClick(page);
    });
  });
}

function handlePageNumberClick(pageNumber) {
  if (pageNumber !== state.page && pageNumber > 0) {
    state.page = pageNumber;
    saveStateToUrl();
    fetchPecas().then(scrollToTable);
  }
}

// ===== ACTIVE FILTERS BAR =====

const columnLabels = {
  ano_publicacao: 'Ano',
  mes_publicacao: 'Mês',
  data_publicacao: 'Data',
  nome_obra: 'Título',
  assinatura: 'Assinatura',
  local_publicacao: 'Periódico',
  genero: 'Gênero',
  midia: 'Mídia',
  livro: 'Livro',
};

function updateActiveFiltersBar() {
  if (!els.activeFiltersBar || !els.activeFiltersChips) return;

  const chips = [];

  // Search filter chip
  if (state.globalSearch) {
    chips.push({
      type: 'search',
      label: 'Busca',
      value: state.globalSearch,
      onRemove: () => {
        state.globalSearch = '';
        els.globalSearch.value = '';
        state.page = 1;
        fetchPecas();
        refreshAllColumnFilterWidgets();
      },
    });
  }

  // Column filter chips
  Object.entries(state.activeColumnFilters).forEach(([columnName, filterData]) => {
    if (!filterData.selectedValues || filterData.selectedValues.length === 0) {
      // Pode ter filtro de range sem selectedValues restritivo
      if (!filterData.rangeMin && !filterData.rangeMax) return;
    }

    const widget = state.columnFilterWidgets[columnName];
    const totalValues = widget ? widget.allValues.length : 0;
    const hasRange = filterData.rangeMin || filterData.rangeMax;
    const hasValueFilter = totalValues > 0 && filterData.selectedValues && filterData.selectedValues.length < totalValues;

    // Only show chip if filter is actually restricting results
    if (hasValueFilter || hasRange) {
      let chipValue = '';
      
      // Montar descrição do filtro com valores reais
      if (hasRange) {
        const label = columnLabels[columnName] || columnName;
        if (columnName === 'ano_publicacao') {
          if (filterData.rangeMin && filterData.rangeMax) {
            chipValue = `${filterData.rangeMin} – ${filterData.rangeMax}`;
          } else if (filterData.rangeMin) {
            chipValue = `a partir de ${filterData.rangeMin}`;
          } else {
            chipValue = `até ${filterData.rangeMax}`;
          }
        } else if (columnName === 'data_publicacao') {
          const fmtDate = (d) => {
            if (!d) return '';
            const parts = d.split('-');
            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
          };
          if (filterData.rangeMin && filterData.rangeMax) {
            chipValue = `${fmtDate(filterData.rangeMin)} – ${fmtDate(filterData.rangeMax)}`;
          } else if (filterData.rangeMin) {
            chipValue = `a partir de ${fmtDate(filterData.rangeMin)}`;
          } else {
            chipValue = `até ${fmtDate(filterData.rangeMax)}`;
          }
        }
        if (hasValueFilter) {
          chipValue += ` + ${filterData.selectedValues.length} valor(es)`;
        }
      } else if (hasValueFilter) {
        // Mostrar os valores selecionados (até 3, depois resumir)
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const displayValues = filterData.selectedValues.slice(0, 3).map(v => {
          if (v === null || v === '__blank__') return columnName === 'data_publicacao' ? '(Data Desconhecida)' : '(Em Branco)';
          if (columnName === 'mes_publicacao') {
            const num = parseInt(v, 10);
            return (num >= 1 && num <= 12) ? monthNames[num - 1] : v;
          }
          if (columnName === 'data_publicacao') {
            // Formatar sem usar new Date() para evitar shift de timezone
            const match = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
            return match ? `${match[3]}/${match[2]}/${match[1]}` : v;
          }
          return String(v);
        });
        chipValue = displayValues.join(', ');
        if (filterData.selectedValues.length > 3) {
          chipValue += ` (+${filterData.selectedValues.length - 3})`;
        }
      }
      
      chips.push({
        type: 'column',
        label: columnLabels[columnName] || columnName,
        value: chipValue,
        columnName: columnName,
        onRemove: () => {
          delete state.activeColumnFilters[columnName];
          if (widget) {
            widget.filterState.selectedValues = new Set(widget.allValues.map(v => v.value));
            widget.filterState.isActive = false;
            widget.filterState.rangeMin = null;
            widget.filterState.rangeMax = null;
            if (!widget.hideFilterIcon) widget.createFilterIcon();
          }
          state.page = 1;
          fetchPecas();
          refreshAllColumnFilterWidgets(columnName);
        },
      });
    }
  });

  // "Only dated" toggle chip
  if (state.onlyDated) {
    chips.push({
      type: 'toggle',
      label: 'Filtro',
      value: 'Apenas com data',
      onRemove: () => {
        state.onlyDated = false;
        els.toggleDatedOnly.checked = false;
        state.page = 1;
        saveStateToUrl();
        fetchPecas();
        refreshAllColumnFilterWidgets();
      },
    });
  }

  // Título search chip
  if (state.nomeObraSearch) {
    chips.push({
      type: 'nome_obra_search',
      label: 'Título',
      value: state.nomeObraSearch,
      onRemove: () => {
        state.nomeObraSearch = '';
        if (els.nomeObraSearch) els.nomeObraSearch.value = '';
        state.page = 1;
        saveStateToUrl();
        fetchPecas();
        refreshAllColumnFilterWidgets();
      },
    });
  }

  // Extra filters (dados adicionais) chips
  const extraFilterLabels = {
  };
  Object.entries(state.extraFilters).forEach(([key, value]) => {
    if (value) {
      const meta = extraFilterLabels[key];
      chips.push({
        type: 'extra_filter',
        label: meta.label,
        value: value,
        onRemove: () => {
          state.extraFilters[key] = '';
          if (meta.el) meta.el.value = '';
          state.page = 1;
          saveStateToUrl();
          fetchPecas();
          refreshAllColumnFilterWidgets();
        },
      });
    }
  });

  // Show/hide bar
  if (chips.length === 0) {
    els.activeFiltersBar.style.display = 'none';
    return;
  }

  els.activeFiltersBar.style.display = 'flex';
  els.activeFiltersChips.innerHTML = chips.map((chip, i) => `
    <span class="filter-chip">
      <span class="filter-chip-label">${safeText(chip.label)}:</span>
      <span class="filter-chip-value">${safeText(chip.value)}</span>
      <button class="filter-chip-remove" data-chip-index="${i}" aria-label="Remover filtro ${safeText(chip.label)}" title="Remover">×</button>
    </span>
  `).join('');

  // Attach remove handlers
  els.activeFiltersChips.querySelectorAll('.filter-chip-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.chipIndex, 10);
      if (chips[index] && chips[index].onRemove) {
        chips[index].onRemove();
      }
    });
  });
}

// ===== AUTOCOMPLETE DROPDOWN =====

let _acActiveIndex = -1; // keyboard navigation index
let _acGeneration = 0;   // generation counter to avoid stale blur closures

function closeAutocomplete() {
  const existing = document.querySelector('.autocomplete-dropdown');
  if (existing) existing.remove();
  _acActiveIndex = -1;
}

/**
 * Highlights matched substring in text with <mark> tags.
 */
function highlightMatch(text, search) {
  if (!search) return safeText(text);
  const norm = normalizeText(search);
  const normText = normalizeText(text);
  const idx = normText.indexOf(norm);
  if (idx === -1) return safeText(text);
  // Map positions back to original text
  const before = safeText(text.substring(0, idx));
  const match = safeText(text.substring(idx, idx + norm.length));
  const after = safeText(text.substring(idx + norm.length));
  return `${before}<mark>${match}</mark>${after}`;
}

/**
 * Generic autocomplete dropdown.
 * @param {HTMLInputElement} inputElement
 * @param {string[]|Array<{value: string, count: number}>} options - full list of options (strings or objects with counts)
 * @param {function(string)} onSelect - callback when user picks a value
 */
function showAutocompleteDropdown(inputElement, options, onSelect) {
  closeAutocomplete();

  // Detect if options are objects with counts
  const hasCountData = options.length > 0 && typeof options[0] === 'object' && options[0] !== null;

  const filterValue = normalizeText(inputElement.value);

  const filtered = filterValue === ''
    ? options
    : options.filter((opt) => {
        const text = hasCountData ? opt.value : opt;
        return normalizeText(text).includes(filterValue);
      });

  if (filtered.length === 0) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  dropdown.style.minWidth = Math.max(inputElement.offsetWidth, 180) + 'px';

  const rect = inputElement.getBoundingClientRect();
  dropdown.style.top = rect.bottom + window.scrollY + 'px';
  dropdown.style.left = rect.left + window.scrollX + 'px';

  filtered.forEach((option, i) => {
    const text = hasCountData ? option.value : option;
    const count = hasCountData ? option.count : null;

    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    
    let html = `<span class="autocomplete-text">${highlightMatch(text, inputElement.value)}</span>`;
    if (count != null) {
      html += `<span class="autocomplete-count">${count}</span>`;
    }
    item.innerHTML = html;
    item.dataset.index = i;

    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      inputElement.value = text;
      closeAutocomplete();
      if (onSelect) onSelect(text);
    });

    dropdown.appendChild(item);
  });

  document.body.appendChild(dropdown);
  _acActiveIndex = -1;
  const gen = ++_acGeneration;

  // Keyboard navigation
  const handleKey = (e) => {
    const items = dropdown.querySelectorAll('.autocomplete-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _acActiveIndex = Math.min(_acActiveIndex + 1, items.length - 1);
      items.forEach((it, idx) => it.classList.toggle('is-active', idx === _acActiveIndex));
      items[_acActiveIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _acActiveIndex = Math.max(_acActiveIndex - 1, 0);
      items.forEach((it, idx) => it.classList.toggle('is-active', idx === _acActiveIndex));
      items[_acActiveIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && _acActiveIndex >= 0) {
      e.preventDefault();
      const selected = filtered[_acActiveIndex];
      const selectedText = hasCountData ? selected.value : selected;
      inputElement.value = selectedText;
      closeAutocomplete();
      inputElement.removeEventListener('keydown', handleKey);
      if (onSelect) onSelect(selectedText);
    } else if (e.key === 'Escape') {
      closeAutocomplete();
      inputElement.removeEventListener('keydown', handleKey);
    }
  };

  inputElement.addEventListener('keydown', handleKey);

  // Close on outside click or blur
  const closeHandler = (e) => {
    if (!inputElement.contains(e.target) && !dropdown.contains(e.target)) {
      closeAutocomplete();
      document.removeEventListener('mousedown', closeHandler);
      inputElement.removeEventListener('keydown', handleKey);
    }
  };
  // Use setTimeout to avoid the current focus click triggering close
  setTimeout(() => document.addEventListener('mousedown', closeHandler), 0);

  inputElement.addEventListener('blur', () => {
    // Small delay to allow mousedown on item; only close if same generation
    setTimeout(() => {
      if (_acGeneration === gen) {
        closeAutocomplete();
        inputElement.removeEventListener('keydown', handleKey);
        document.removeEventListener('mousedown', closeHandler);
      }
    }, 150);
  }, { once: true });
}

function updateFacetDisplay(facetName, items) {
  const facetEl = els[`filter${facetName.charAt(0).toUpperCase() + facetName.slice(1)}`];
  if (!facetEl) return;

  if (items.length === 0) {
    facetEl.innerHTML = '<p class="loading-text">Sem registros</p>';
    return;
  }

  const fieldName = facetName === 'livro' ? 'titulo' : 'nome';
  const idField = facetName === 'livro' ? 'id' : 'id';
  
  facetEl.innerHTML = items.map((item) => {
    const fieldId = `facet-${facetName}-${item.id}`;
    const isChecked = state.facetFilters[`${facetName}_id`] == item.id;
    
    return `
      <div class="facet-item">
        <input 
          type="checkbox" 
          id="${fieldId}" 
          data-facet="${facetName}" 
          data-facet-id="${item.id}"
          ${isChecked ? 'checked' : ''}
        />
        <label for="${fieldId}">
          <span>${safeText(item[fieldName])}</span>
          <span class="facet-count">(${item.total})</span>
        </label>
      </div>
    `;
  }).join('');

  // Add event listeners for checkboxes
  facetEl.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', handleFacetChange);
  });
}

// ===== EVENT HANDLERS =====

function handleSearch() {
  state.globalSearch = els.globalSearch.value.trim();
  state.page = 1;
  saveStateToUrl();
  fetchPecas();
}

function handleClearFilters() {
  state.globalSearch = '';
  state.page = 1;
  state.sortKey = '';
  state.sortDirection = '';
  state.showExtra = false;
  state.compact = false;
  state.onlyDated = false;
  state.nomeObraSearch = '';
  state.extraFilters = {
  };
  state.columnFilters = {
    ano_publicacao: '', mes_publicacao: '', data_publicacao: '',
    nome_obra: '', assinatura: '', local_publicacao: '', midia: '', genero: '', livro: '',
  };
  state.activeColumnFilters = {};

  // Update UI
  els.globalSearch.value = '';
  els.toggleExtra.checked = false;
  els.toggleCompact.checked = false;
  els.toggleDatedOnly.checked = false;
  if (els.nomeObraSearch) els.nomeObraSearch.value = '';
  // Clear extra filter inputs
  els.resultsSummary.textContent = 'Nenhuma busca realizada ainda';
  els.resultsSummary.classList.add('empty');
  
  document.querySelectorAll('[data-column-filter]').forEach((input) => {
    input.value = '';
  });

  // Resetar classes visuais (compacto, dados adicionais)
  applyToggleClasses();

  // Resetar filtros visuais dos widgets de coluna
  Object.values(state.columnFilterWidgets).forEach((widget) => {
    if (widget) {
      widget.filterState.selectedValues = new Set(widget.allValues.map(v => v.value));
      widget.filterState.isActive = false;
      widget.filterState.textFilters = [];
      widget.filterState.sortOrder = null;
      widget.filterState.rangeMin = null;
      widget.filterState.rangeMax = null;
      if (!widget.hideFilterIcon) widget.createFilterIcon();
    }
  });

  updateSortIndicators();
  saveStateToUrl();
  fetchPecas();
  fetchFacetas();
  refreshAllColumnFilterWidgets(); // Recarregar todos os valores de filtro
}

function handlePageSizeChange() {
  const raw = els.pageSize.value;
  const newSize = raw === 'all' ? 100000 : parseInt(raw, 10);
  if (newSize > 500) {
    const pageSizeWarning = document.getElementById('page-size-warning');
    if (pageSizeWarning) {
      const label = raw === 'all' ? 'Todos os itens' : `${newSize} itens`;
      pageSizeWarning.textContent = `\u26a0 ${label} pode tornar a p\u00e1gina lenta em dispositivos modestos`;
      pageSizeWarning.style.display = 'block';
      setTimeout(() => { pageSizeWarning.style.display = 'none'; }, 5000);
    }
  }
  state.pageSize = newSize;
  state.page = 1;
  saveStateToUrl();
  fetchPecas();
}

function scrollToTable() {
  const table = document.querySelector('.table-container');
  if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handlePrevPage() {
  if (state.page > 1) {
    state.page--;
    saveStateToUrl();
    fetchPecas().then(scrollToTable);
  }
}

function handleNextPage() {
  if (state.nextUrl) {
    state.page++;
    saveStateToUrl();
    fetchPecas().then(scrollToTable);
  }
}

function handleToggleChange(e) {
  const { id } = e.target;
  
  if (id === 'toggle-extra') {
    state.showExtra = e.target.checked;
    applyToggleClasses();
    updateActiveFiltersBar();
    return;
  } else if (id === 'toggle-compact') {
    state.compact = e.target.checked;
    applyToggleClasses();
    return;
  } else if (id === 'toggle-dated-only') {
    state.onlyDated = e.target.checked;
  }

  // "Apenas com data" faz requisição ao servidor
  state.page = 1;
  saveStateToUrl();
  fetchPecas();
  refreshAllColumnFilterWidgets(); // Atualizar opções dos filtros
}

/**
 * Aplica classes CSS para toggles visuais (compacto e dados adicionais)
 */
function applyToggleClasses() {
  const table = els.table;
  if (!table) return;
  
  // Modo compacto
  table.classList.toggle('compact-mode', state.compact);
  
  // Dados adicionais - mostra/esconde colunas extras
  table.classList.toggle('show-extra', state.showExtra);
}



function handleFacetChange(e) {
  const { facet, facetId } = e.target.dataset;
  const fieldName = `${facet}_id`;
  
  if (e.target.checked) {
    state.facetFilters[fieldName] = facetId;
  } else {
    state.facetFilters[fieldName] = '';
  }

  state.page = 1;
  saveStateToUrl();
  fetchPecas();
}

function handleColumnFilterChange(e) {
  const { columnFilter } = e.target.dataset;
  state.columnFilters[columnFilter] = e.target.value;
  
  // Show autocomplete dropdown for specific fields
  const autocompleteFields = ['assinatura', 'instancia', 'livro', 'genero'];
  if (autocompleteFields.includes(columnFilter) && e.target.value.length > 0) {
    showAutocompleteDropdown(e.target, columnFilter);
  }
  
  // Update table display
  updateTableDisplay();
}

function handleSortClick(e) {
  if (e.target.closest('button')) {
    const btn = e.target.closest('button');
    const sortKey = btn.dataset.sort;
    cycleSort(sortKey);
    updateSortIndicators();
    saveStateToUrl();
    fetchPecas();
  }
}

// ===== MODAL HANDLING =====

function showDetailModal(id) {
  const row = state.rows.find((r) => r.id == id);
  if (!row) return;

  if (!state.lastFocusedElement) {
    state.lastFocusedElement = document.activeElement;
  }

  els.detailTitle.textContent = `Título #${row.id} — ${stripHtmlAndDecode(row.nome_obra)}`;
  
  // Build fields array, only include non-empty optional fields
  const fields = [
    { label: 'Código', value: safeText(row.id), always: true },
    { label: 'Título', value: safeText(stripHtmlAndDecode(row.nome_obra)), always: true },
    { label: 'Ano de Publicação', value: row.ano_publicacao ? String(row.ano_publicacao) : null },
    { label: 'Mês de Publicação', value: row.mes_publicacao ? formatMonth(row.mes_publicacao) : null },
    { label: 'Data de Publicação', value: row.data_publicacao ? formatDate(row.data_publicacao) : null },
    { label: 'Gênero', value: row.genero ? safeText(row.genero) : null },
    { label: 'Assinatura', value: row.assinatura ? safeText(row.assinatura) : null },
    { label: 'Local de inscrição da assinatura', value: row.instancia ? safeText(row.instancia) : null },
    { label: 'Livro', value: row.livro ? safeText(row.livro) : null },
    { label: 'Mídia', value: row.midia ? safeText(row.midia) : null },
    { label: 'Periódico', value: row.local_publicacao ? safeText(row.local_publicacao) : null },
    { label: 'Fonte', value: row.fonte },
  ];

  const gridFields = fields
    .filter(f => f.always || f.value)
    .map(f => `
      <div class="detail-field">
        <span class="detail-label">${f.label}</span>
        <div class="value">${f.value}</div>
      </div>
    `).join('');

  // Long text fields (full-width, only if present)
  const longFields = [    
    { label: 'Dados da Publicação', value: row.dados_publicacao, html: true },
    { label: 'Observações', value: row.observacoes, html: true },
    { label: 'Reproduções', value: row.reproducoes_texto, html: true },
  ]
    .filter(f => f.value)
    .map(f => `
      <div class="detail-field">
        <span class="detail-label">${f.label}</span>
        <div class="value">${f.html ? openLinksInNewTab(f.value) : linkifyUrls(safeText(stripHtmlAndDecode(f.value)))}</div>
      </div>
    `).join('');

  const html = `<div class="detail-grid">${gridFields}${longFields}</div>`;

  // Build images gallery for the top of the modal
  let imagesHtml = '';
  if (row.imagens && row.imagens.length > 0) {
    const gallery = row.imagens.map(img => {
      const legenda = img.legenda ? `<span class="gallery-legenda">${safeText(img.legenda)}</span>` : '';
      return `
        <figure class="gallery-item" data-full-src="${safeText(img.imagem)}" data-legenda="${safeText(img.legenda || '')}">
          <img src="${safeText(img.imagem)}" alt="${safeText(img.legenda || 'Imagem da peça')}" loading="lazy" />
          ${legenda}
        </figure>`;
    }).join('');
    imagesHtml = `<div class="detail-gallery">${gallery}</div>`;
  }

  els.detailContent.innerHTML = imagesHtml + html;
  els.detailModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  els.modalOverlay.setAttribute('aria-hidden', 'false');
  // Definir foco no botão de fechar do modal
  setTimeout(() => els.closeModal.focus(), 0);
}

function closeDetailModal() {
  els.detailModal.style.display = 'none';
  document.body.style.overflow = '';
  els.modalOverlay.setAttribute('aria-hidden', 'true');
  // Retornar foco ao elemento que abriu o modal
  if (state.lastFocusedElement) {
    state.lastFocusedElement.focus();
    state.lastFocusedElement = null;
  }
}

function handleModalOverlayClick(e) {
  if (e.target === els.modalOverlay) {
    closeDetailModal();
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    closeDetailModal();
    return;
  }

  // Focus trap: keep Tab within the open modal
  if (e.key === 'Tab' && els.detailModal.style.display !== 'none') {
    const focusable = els.detailModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}

// ===== URL STATE MANAGEMENT =====

function saveStateToUrl() {
  const params = new URLSearchParams();

  if (state.globalSearch) params.set('search', state.globalSearch);
  if (state.page > 1) params.set('page', state.page);
  if (state.pageSize !== 250) params.set('page_size', state.pageSize);
  if (state.sortKey) {
    params.set('sort', state.sortKey);
    params.set('sort_dir', state.sortDirection);
  }
  if (state.onlyDated) params.set('dated', '1');
  if (state.nomeObraSearch) params.set('nome_obra_search', state.nomeObraSearch);

  // Persist extra filters in URL
  Object.entries(state.extraFilters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  // Persist column filters in URL
  Object.entries(state.activeColumnFilters).forEach(([col, data]) => {
    if (data.selectedValues && data.selectedValues.length > 0) {
      const values = (Array.isArray(data.selectedValues) ? data.selectedValues : [data.selectedValues])
        .map(v => v === null ? '__blank__' : v);
      if (col === 'nome_obra') {
        // nome_obra values may contain commas; use repeated params
        values.forEach(v => params.append(`f_${col}`, v));
      } else {
        params.set(`f_${col}`, values.join(','));
      }
    }
    if (data.rangeMin) params.set(`f_${col}_min`, data.rangeMin);
    if (data.rangeMax) params.set(`f_${col}_max`, data.rangeMax);
  });

  const newUrl = params.toString() 
    ? `?${params.toString()}`
    : window.location.pathname;

  window.history.replaceState(null, '', newUrl);
}

function loadStateFromUrl() {
  const params = new URLSearchParams(window.location.search);

  // Load basic state
  state.globalSearch = params.get('search') || '';
  state.page = parseInt(params.get('page') || '1', 10);
  state.pageSize = parseInt(params.get('page_size') || '250', 10);
  state.sortKey = params.get('sort') || '';
  state.sortDirection = params.get('sort_dir') || '';
  state.onlyDated = params.get('dated') === '1';
  state.nomeObraSearch = params.get('nome_obra_search') || '';

  // Load extra filters from URL
  Object.keys(state.extraFilters).forEach(key => {
    state.extraFilters[key] = params.get(key) || '';
  });

  // Load column filters from URL
  // For nome_obra, use getAll to handle repeated params (values may contain commas)
  const nomeObraValues = params.getAll('f_nome_obra');
  if (nomeObraValues.length > 0) {
    state.activeColumnFilters['nome_obra'] = {
      selectedValues: nomeObraValues.map(v => v === '__blank__' ? null : v),
      rangeMin: null,
      rangeMax: null,
    };
  }

  params.forEach((value, key) => {
    if (key.startsWith('f_') && !key.endsWith('_min') && !key.endsWith('_max')) {
      const col = key.slice(2);
      if (col === 'nome_obra') return; // Already handled above
      if (!state.activeColumnFilters[col]) {
        state.activeColumnFilters[col] = { selectedValues: [], rangeMin: null, rangeMax: null };
      }
      state.activeColumnFilters[col].selectedValues = value.split(',').map(v => v === '__blank__' ? null : v);
    }
    if (key.endsWith('_min') && key.startsWith('f_')) {
      const col = key.slice(2, -4);
      if (!state.activeColumnFilters[col]) {
        state.activeColumnFilters[col] = { selectedValues: [], rangeMin: null, rangeMax: null };
      }
      state.activeColumnFilters[col].rangeMin = value;
    }
    if (key.endsWith('_max') && key.startsWith('f_')) {
      const col = key.slice(2, -4);
      if (!state.activeColumnFilters[col]) {
        state.activeColumnFilters[col] = { selectedValues: [], rangeMin: null, rangeMax: null };
      }
      state.activeColumnFilters[col].rangeMax = value;
    }
  });

  // Update UI to reflect state
  els.globalSearch.value = state.globalSearch;
  els.pageSize.value = state.pageSize >= 100000 ? 'all' : state.pageSize;
  els.toggleDatedOnly.checked = state.onlyDated;
  if (els.nomeObraSearch) els.nomeObraSearch.value = state.nomeObraSearch;
  // Restore extra filter inputs
  updateSortIndicators();


}

// ===== INITIALIZATION =====

function initializeEventListeners() {
  // Debounced search - aguarda 500ms sem digitação antes de fazer requisição
  const debouncedSearch = debounce(() => {
    state.page = 1;  // Voltar à primeira página ao buscar
    fetchPecas();
    refreshAllColumnFilterWidgets(); // Atualizar opções dos filtros com a nova busca
  }, 500);
  
  // Search - atualizar estado e fazer requisição com debounce
  els.globalSearch.addEventListener('input', (e) => {
    state.globalSearch = e.target.value;
    debouncedSearch();
  });
  
  els.applySearch.addEventListener('click', () => {
    state.page = 1;
    fetchPecas();
    refreshAllColumnFilterWidgets();
  });
  
  els.globalSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      state.page = 1;
      fetchPecas();
      refreshAllColumnFilterWidgets();
    }
  });

  // Clear and page size
  els.clearFilters.addEventListener('click', handleClearFilters);
  if (els.clearAllFiltersBtn) {
    els.clearAllFiltersBtn.addEventListener('click', handleClearFilters);
  }
  els.pageSize.addEventListener('change', handlePageSizeChange);

  // Nome da Peça header search
  if (els.nomeObraSearch) {
    const nomeObraOnSelect = (selected) => {
      state.nomeObraSearch = selected;
      state.page = 1;
      saveStateToUrl();
      fetchPecas();
      refreshAllColumnFilterWidgets();
    };

    const showNomeObraAC = () => {
      showAutocompleteDropdown(els.nomeObraSearch, state.autocompleteData.nome_obra || [], nomeObraOnSelect);
    };

    const debouncedNomeObraAC = debounce(showNomeObraAC, 200);
    els.nomeObraSearch.addEventListener('input', debouncedNomeObraAC);
    els.nomeObraSearch.addEventListener('focus', showNomeObraAC);
    els.nomeObraSearch.addEventListener('click', showNomeObraAC);

    els.nomeObraSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        closeAutocomplete();
        state.nomeObraSearch = els.nomeObraSearch.value.trim();
        state.page = 1;
        saveStateToUrl();
        fetchPecas();
        refreshAllColumnFilterWidgets();
      }
    });

    els.nomeObraSearch.addEventListener('blur', () => {
      const val = els.nomeObraSearch.value.trim();
      if (val !== state.nomeObraSearch) {
        state.nomeObraSearch = val;
        state.page = 1;
        saveStateToUrl();
        fetchPecas();
        refreshAllColumnFilterWidgets();
      }
    });
  }

  // Pagination
  els.prevPage.addEventListener('click', handlePrevPage);
  els.nextPage.addEventListener('click', handleNextPage);

  // Toggles
  els.toggleExtra.addEventListener('change', handleToggleChange);
  els.toggleCompact.addEventListener('change', handleToggleChange);
  els.toggleDatedOnly.addEventListener('change', handleToggleChange);


  // Column filters (debounced)
  const debouncedColumnFilter = debounce(handleColumnFilterChange, 300);
  document.querySelectorAll('[data-column-filter]').forEach((input) => {
    input.addEventListener('input', debouncedColumnFilter);
    
    // Add autocomplete for specific fields
    const autocompleteFields = ['assinatura', 'instancia', 'livro', 'genero'];
    if (autocompleteFields.includes(input.dataset.columnFilter)) {
      const fieldName = input.dataset.columnFilter;
      const showAC = () => {
        showAutocompleteDropdown(
          input,
          state.autocompleteData[fieldName] || [],
          (selected) => {
            input.value = selected;
            state.columnFilters[fieldName] = selected;
            updateTableDisplay();
          }
        );
      };
      input.addEventListener('focus', showAC);
      input.addEventListener('click', showAC);
    }
  });

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach((btn) => {
    btn.addEventListener('click', handleSortClick);
  });

  // Modal
  els.closeModal.addEventListener('click', closeDetailModal);
  els.modalOverlay.addEventListener('click', handleModalOverlayClick);
  document.addEventListener('keydown', handleKeyDown);

  // Export CSV
  const exportBtn = document.getElementById('export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportCSV);
  }

  // Toggle toolbar visibility
  const toggleToolbarBtn = document.getElementById('toggle-toolbar');
  if (toggleToolbarBtn) {
    toggleToolbarBtn.addEventListener('click', () => {
      const toolbar = toggleToolbarBtn.closest('.toolbar');
      const collapsed = toolbar.classList.toggle('toolbar--collapsed');
      toggleToolbarBtn.setAttribute('aria-expanded', String(!collapsed));
      toggleToolbarBtn.title = collapsed ? 'Mostrar painel de busca' : 'Ocultar painel de busca';
      toggleToolbarBtn.setAttribute('aria-label', toggleToolbarBtn.title);
      if (collapsed && els.table) {
        els.table.scrollIntoView({ behavior: 'smooth', block: 'start' });
        els.table.focus({ preventScroll: true });
      }
    });
  }
}

// ===== COLUMN FILTER WIDGETS =====

/**
 * Constrói os parâmetros de filtros ativos para enviar ao endpoint column_values.
 * Exclui o filtro da coluna especificada (para não restringir os valores dela mesma).
 * @param {string} excludeColumn - Nome da coluna a excluir dos filtros
 * @returns {Object} Objeto com parâmetros de filtro como chave-valor
 */
function buildFilterParamsForColumn(excludeColumn) {
  const params = {};
  
  // Busca global
  if (state.globalSearch) {
    params.search = state.globalSearch;
  }
  
  // Filtro "apenas com data"
  if (state.onlyDated) {
    params.has_date = 'true';
  }
  
  // Filtros de coluna ativos (excluindo a coluna solicitada)
  Object.entries(state.activeColumnFilters).forEach(([columnName, filterData]) => {
    if (columnName === excludeColumn) return;
    
    // Range filters
    if (filterData.rangeMin) {
      if (columnName === 'ano_publicacao') params.ano_min = filterData.rangeMin;
      else if (columnName === 'data_publicacao') params.data_min = filterData.rangeMin;
    }
    if (filterData.rangeMax) {
      if (columnName === 'ano_publicacao') params.ano_max = filterData.rangeMax;
      else if (columnName === 'data_publicacao') params.data_max = filterData.rangeMax;
    }
    
    if (filterData.selectedValues) {
      let values = filterData.selectedValues;
      if (values instanceof Set) values = Array.from(values);
      if (Array.isArray(values) && values.length > 0) {
        const widget = state.columnFilterWidgets[columnName];
        const totalValues = widget ? widget.allValues.length : 0;
        if (totalValues > 0 && values.length >= totalValues) {
          return; // Todos os valores selecionados — sem restrição
        }
        const validValues = values
          .filter(v => v !== 'None' && v !== '')
          .map(v => v === null ? '__blank__' : v);
        if (validValues.length > 0) {
          if (columnName === 'nome_obra') {
            params[columnName] = validValues; // Array para parâmetros repetidos
          } else {
            params[columnName] = validValues.join(',');
          }
        }
      }
    }
  });
  
  return params;
}

/**
 * Recarrega os valores de todos os widgets de filtro de coluna (exceto o especificado).
 * Chamado após aplicar ou remover um filtro para atualizar as opções disponíveis.
 * @param {string} [exceptColumn] - Coluna a pular (a que acabou de ser filtrada)
 */
function refreshAllColumnFilterWidgets(exceptColumn) {
  Object.entries(state.columnFilterWidgets).forEach(([colName, widget]) => {
    if (colName === exceptColumn) return;
    if (widget) {
      widget.loadColumnValues();
    }
  });
}

function initializeColumnFilterWidgets() {
  // Colunas para aplicar filtro
  const textColumns = [
    { name: 'ano_publicacao', label: 'Ano', thSelector: '.col-ano', columnType: 'year' },
    { name: 'mes_publicacao', label: 'Mês', thSelector: '.col-mes', columnType: 'month' },
    { name: 'data_publicacao', label: 'Data', headerSelector: '[data-sort="data_publicacao"]', columnType: 'date' },
    { name: 'assinatura', label: 'Assinatura', headerSelector: '[data-sort="assinatura"]' },
    { name: 'local_publicacao', label: 'Periódico', headerSelector: '[data-sort="local_publicacao"]' },
    { name: 'genero', label: 'Gênero', headerSelector: '[data-sort="genero"]' },
    { name: 'midia', label: 'Mídia', headerSelector: '[data-sort="midia"]' },
    { name: 'livro', label: 'Livro', headerSelector: '[data-sort="livro"]' },
  ];

  textColumns.forEach((col) => {
    let headerTh;
    if (col.thSelector) {
      // Direct th selector (for columns without sort buttons)
      headerTh = document.querySelector(`th${col.thSelector}`);
    } else {
      const headerBtn = document.querySelector(col.headerSelector);
      if (!headerBtn) return;
      headerTh = headerBtn.closest('th');
    }
    if (!headerTh) return;

    state.columnFilterWidgets[col.name] = new FilterColumnWidget({
      apiBase: apiBase,
      columnName: col.name,
      columnLabel: col.label,
      headerElement: headerTh,
      resourcePath: 'pecas',
      columnType: col.columnType || 'default',
      getActiveFilters: (excludeColumn) => buildFilterParamsForColumn(excludeColumn),
      onFilterApply: (filterData) => {
        applyColumnFilter(filterData);
      },
      onFilterClear: (filterData) => {
        clearColumnFilter(filterData);
      },
    });
  });

  // Livro column filter is now handled via the regular textColumns table header widget above
}

function applyColumnFilter(filterData) {
  const { columnName, selectedValues, sortOrder, textFilters, rangeMin, rangeMax } = filterData;

  state.activeColumnFilters[columnName] = {
    selectedValues: selectedValues,
    sortOrder: sortOrder,
    textFilters: textFilters,
    rangeMin: rangeMin || null,
    rangeMax: rangeMax || null,
  };

  state.page = 1;
  saveStateToUrl();
  fetchPecas(); // Faz requisição à API com os novos filtros
  refreshAllColumnFilterWidgets(columnName); // Atualiza opções dos outros filtros
}

function clearColumnFilter(filterData) {
  const { columnName } = filterData;
  delete state.activeColumnFilters[columnName];

  state.page = 1;
  saveStateToUrl();
  fetchPecas(); // Faz requisição à API com os filtros removidos
  refreshAllColumnFilterWidgets(columnName); // Atualiza opções dos outros filtros
}

// ===== CSV EXPORT =====

function exportCSV() {
  const params = new URLSearchParams();
  if (state.globalSearch) params.set('search', state.globalSearch);
  const ordering = getServerOrdering();
  if (ordering) params.set('ordering', ordering);
  if (state.onlyDated) params.set('has_date', 'true');

  Object.entries(state.activeColumnFilters).forEach(([columnName, filterData]) => {
    if (filterData.rangeMin) {
      if (columnName === 'ano_publicacao') params.set('ano_min', filterData.rangeMin);
      if (columnName === 'data_publicacao') params.set('data_min', filterData.rangeMin);
    }
    if (filterData.rangeMax) {
      if (columnName === 'ano_publicacao') params.set('ano_max', filterData.rangeMax);
      if (columnName === 'data_publicacao') params.set('data_max', filterData.rangeMax);
    }
    if (filterData.selectedValues) {
      let values = filterData.selectedValues;
      if (values instanceof Set) values = Array.from(values);
      if (Array.isArray(values) && values.length > 0) {
        // Skip if all values are selected (no restriction)
        const widget = state.columnFilterWidgets[columnName];
        const totalValues = widget ? widget.allValues.length : 0;
        if (totalValues > 0 && values.length >= totalValues) {
          // All values selected — no restriction needed
        } else {
          const validValues = values
            .filter(v => v !== 'None' && v !== '')
            .map(v => v === null ? '__blank__' : v);
          if (validValues.length > 0) {
            if (columnName === 'nome_obra') {
              validValues.forEach(v => params.append(columnName, v));
            } else {
              params.set(columnName, validValues.join(','));
            }
          }
        }
      }
    }
  });

  const url = `${apiBase}/pecas/export_csv/?${params.toString()}`;
  window.open(url, '_blank');
}

// ===== IMAGE LIGHTBOX WITH ZOOM & PAN =====

const lightbox = {
  el: null,
  img: null,
  caption: null,
  overlay: null,
  closeBtn: null,
  wrap: null,
  scale: 1,
  minScale: 1,
  maxScale: 5,
  translateX: 0,
  translateY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  lastTranslateX: 0,
  lastTranslateY: 0,

  init() {
    this.el = document.getElementById('image-lightbox');
    this.img = document.getElementById('lightbox-img');
    this.caption = document.getElementById('lightbox-caption');
    this.overlay = this.el.querySelector('.lightbox-overlay');
    this.closeBtn = document.getElementById('lightbox-close');
    this.wrap = this.el.querySelector('.lightbox-img-wrap');

    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', () => this.close());

    // Zoom with mouse wheel
    this.wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      this.zoom(delta, e.clientX, e.clientY);
    }, { passive: false });

    // Pan with mouse drag
    this.wrap.addEventListener('mousedown', (e) => {
      if (this.scale <= 1) return;
      e.preventDefault();
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.lastTranslateX = this.translateX;
      this.lastTranslateY = this.translateY;
      this.wrap.classList.add('dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.translateX = this.lastTranslateX + (e.clientX - this.dragStartX);
      this.translateY = this.lastTranslateY + (e.clientY - this.dragStartY);
      this.applyTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.wrap.classList.remove('dragging');
    });

    // Touch pinch zoom
    let lastTouchDist = 0;
    this.wrap.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      } else if (e.touches.length === 1 && this.scale > 1) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX;
        this.dragStartY = e.touches[0].clientY;
        this.lastTranslateX = this.translateX;
        this.lastTranslateY = this.translateY;
      }
    }, { passive: true });

    this.wrap.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = (dist - lastTouchDist) * 0.005;
        lastTouchDist = dist;
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        this.zoom(delta, cx, cy);
      } else if (e.touches.length === 1 && this.isDragging) {
        e.preventDefault();
        this.translateX = this.lastTranslateX + (e.touches[0].clientX - this.dragStartX);
        this.translateY = this.lastTranslateY + (e.touches[0].clientY - this.dragStartY);
        this.applyTransform();
      }
    }, { passive: false });

    this.wrap.addEventListener('touchend', () => {
      this.isDragging = false;
      lastTouchDist = 0;
    });

    // Double-click to reset zoom
    this.wrap.addEventListener('dblclick', () => {
      this.scale = 1;
      this.translateX = 0;
      this.translateY = 0;
      this.applyTransform();
    });

    // Keyboard: Escape closes lightbox
    document.addEventListener('keydown', (e) => {
      if (this.el.style.display !== 'none' && e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      }
    }, true);
  },

  zoom(delta, cx, cy) {
    const prev = this.scale;
    this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale + delta));
    if (this.scale === prev) return;

    // Adjust translate so zoom centers on cursor
    const ratio = this.scale / prev;
    const rect = this.wrap.getBoundingClientRect();
    const ox = cx - rect.left - rect.width / 2;
    const oy = cy - rect.top - rect.height / 2;
    this.translateX = ox - ratio * (ox - this.translateX);
    this.translateY = oy - ratio * (oy - this.translateY);

    this.applyTransform();
  },

  applyTransform() {
    this.img.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  },

  open(src, legendaText) {
    this.img.src = src;
    this.img.alt = legendaText || 'Imagem ampliada';
    this.caption.textContent = legendaText || '';
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.applyTransform();
    this.el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    this.closeBtn.focus();
  },

  close() {
    this.el.style.display = 'none';
    // Only restore body overflow if the detail modal is also closed
    if (els.detailModal.style.display === 'none') {
      document.body.style.overflow = '';
    }
  },
};

/**
 * Delegated click handler for image thumbnails and gallery items.
 * Handles clicks in both the extra-data rows and the detail modal.
 */
document.addEventListener('click', (e) => {
  // Extra row thumbnail
  const thumb = e.target.closest('.extra-thumb');
  if (thumb) {
    e.stopPropagation();
    lightbox.open(thumb.dataset.fullSrc, thumb.dataset.legenda);
    return;
  }
  // Detail modal gallery item
  const galleryItem = e.target.closest('.gallery-item');
  if (galleryItem) {
    e.stopPropagation();
    lightbox.open(galleryItem.dataset.fullSrc, galleryItem.dataset.legenda);
  }
});

async function initialize() {
  console.log('Iniciando aplicação de catálogo...');
  
  // Load state from URL
  loadStateFromUrl();

  // Set default sort to Data ascending if no sort specified
  if (!state.sortKey) {
    state.sortKey = 'data_publicacao';
    state.sortDirection = 'asc';
  }

  // Initialize event listeners
  initializeEventListeners();

  // Initialize lightbox
  lightbox.init();

  // Initialize column filter widgets
  initializeColumnFilterWidgets();

  // Aplicar classes visuais iniciais (compacto, dados adicionais)
  applyToggleClasses();

  // Fetch initial data
  await Promise.all([
    fetchPecas(),
    fetchFacetas(),
    loadServerAutocompleteData(),
  ]);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
