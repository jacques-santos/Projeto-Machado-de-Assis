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
  pageSize: 25,
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

  // Facet filters (server-side)
  facetFilters: {
    genero_id: '',
    assinatura_id: '',
    instancia_id: '',
    livro_id: '',
    midia_id: '',
  },

  // Column filters (client-side for now, could be server-side)
  columnFilters: {
    id: '',
    ano_publicacao: '',
    mes_publicacao: '',
    data_publicacao: '',
    nome_obra: '',
    assinatura: '',
    instancia: '',
    livro: '',
    genero: '',
  },
};

// ===== DOM ELEMENTS CACHE =====
const els = {
  // Results
  resultsBody: document.getElementById('results-body'),
  resultsSummary: document.getElementById('results-summary'),
  loadingIndicator: document.getElementById('loading-indicator'),
  pageIndicator: document.getElementById('page-indicator'),
  table: document.getElementById('results-table'),

  // Pagination
  prevPage: document.getElementById('prev-page'),
  nextPage: document.getElementById('next-page'),

  // Controls
  pageSize: document.getElementById('page-size'),
  globalSearch: document.getElementById('global-search'),
  applySearch: document.getElementById('apply-search'),
  clearFilters: document.getElementById('clear-filters'),

  // Toggles
  toggleExtra: document.getElementById('toggle-extra'),
  toggleCompact: document.getElementById('toggle-compact'),
  toggleDatedOnly: document.getElementById('toggle-dated-only'),

  // Facets
  filterGenero: document.getElementById('filter-genero'),
  filterAssinatura: document.getElementById('filter-assinatura'),
  filterInstancia: document.getElementById('filter-instancia'),
  filterLivro: document.getElementById('filter-livro'),
  filterMidia: document.getElementById('filter-midia'),

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
  'ano_publicacao',
  'mes_publicacao',
  'data_publicacao',
  'nome_obra',
]);

// ===== UTILITY FUNCTIONS =====

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
  
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  
  return date.toLocaleDateString('pt-BR');
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
  return state.sortDirection === 'desc' ? `-${state.sortKey}` : state.sortKey;
}

function updateSortIndicators() {
  document.querySelectorAll('.sort-btn').forEach((btn) => {
    const field = btn.dataset.sort;
    const indicator = btn.querySelector('.sort-indicator');
    
    if (field === state.sortKey) {
      indicator.classList.add(state.sortDirection);
    } else {
      indicator.classList.remove('asc', 'desc');
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

  const ordering = getServerOrdering();
  if (ordering) {
    url.searchParams.set('ordering', ordering);
  }

  // Add facet filters
  Object.entries(state.facetFilters).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

async function fetchPecas() {
  try {
    setLoading('Carregando peças...');
    
    const url = buildApiUrl();
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    state.rows = data.results || [];
    state.total = data.count || 0;
    state.nextUrl = data.next;
    state.previousUrl = data.previous;

    updateResultsDisplay();
    updateTableDisplay();
    updatePaginationDisplay();
  } catch (error) {
    console.error('Erro ao buscar peças:', error);
    setLoading('');
    showErrorState(`Erro ao carregar dados: ${error.message}`);
  }
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
}

function showErrorState(message) {
  els.resultsBody.innerHTML = `
    <tr>
      <td colspan="9" class="error-state">
        <p>${escapeHtml(message)}</p>
      </td>
    </tr>
  `;
}

function updateResultsDisplay() {
  setLoading('');
  
  if (state.total === 0) {
    els.resultsSummary.textContent = 'Nenhuma peça encontrada';
    els.resultsBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <p>Nenhuma peça corresponde aos seus filtros</p>
        </td>
      </tr>
    `;
    return;
  }

  const start = (state.page - 1) * state.pageSize + 1;
  const end = Math.min(state.page * state.pageSize, state.total);
  els.resultsSummary.textContent = `Mostrando ${start}-${end} de ${state.total} peças`;
}

function updateTableDisplay() {
  if (state.rows.length === 0) {
    return;
  }

  // Apply client-side filters
  let filtered = applyClientFilters(state.rows);

  // Render rows
  els.resultsBody.innerHTML = filtered.map((row) => `
    <tr class="result-row" data-id="${row.id}">
      <td class="col-id">${escapeHtml(row.id)}</td>
      <td class="col-ano">${escapeHtml(row.ano_publicacao || '—')}</td>
      <td class="col-mes">${formatMonth(row.mes_publicacao)}</td>
      <td class="col-data">${formatDate(row.data_publicacao)}</td>
      <td class="col-obra">${escapeHtml(row.nome_obra)}</td>
      <td class="col-assinatura">${escapeHtml(row.assinatura || '—')}</td>
      <td class="col-instancia">${escapeHtml(row.instancia || '—')}</td>
      <td class="col-livro">${escapeHtml(row.livro || '—')}</td>
      <td class="col-genero">${escapeHtml(row.genero || '—')}</td>
    </tr>
  `).join('');

  // Add row click handlers
  document.querySelectorAll('.result-row').forEach((row) => {
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      showDetailModal(id);
    });
  });
}

function applyClientFilters(rows) {
  let filtered = [...rows];

  // Apply "only dated" toggle
  if (state.onlyDated) {
    filtered = filtered.filter((row) => Boolean(row.data_publicacao));
  }

  // Apply column filters
  Object.entries(state.columnFilters).forEach(([key, rawValue]) => {
    const expected = normalizeText(rawValue);
    if (!expected) return;

    filtered = filtered.filter((row) => {
      const valueMap = {
        id: String(row.id),
        ano_publicacao: String(row.ano_publicacao || ''),
        mes_publicacao: String(row.mes_publicacao || ''),
        data_publicacao: formatDate(row.data_publicacao),
        nome_obra: row.nome_obra,
        assinatura: row.assinatura || '',
        instancia: row.instancia || '',
        livro: row.livro || '',
        genero: row.genero || '',
      };

      return normalizeText(valueMap[key]).includes(expected);
    });
  });

  // Apply client-side sorting for non-server fields
  if (state.sortKey && !serverSortableFields.has(state.sortKey)) {
    filtered.sort((a, b) => {
      const extractValue = (row) => {
        const map = {
          assinatura: row.assinatura || '',
          instancia: row.instancia || '',
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
  els.pageIndicator.textContent = `Página ${state.page}`;
  els.prevPage.disabled = !state.previousUrl;
  els.nextPage.disabled = !state.nextUrl;
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
          <span>${escapeHtml(item[fieldName])}</span>
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
  state.facetFilters = {
    genero_id: '',
    assinatura_id: '',
    instancia_id: '',
    livro_id: '',
    midia_id: '',
  };
  state.columnFilters = {
    id: '',
    ano_publicacao: '',
    mes_publicacao: '',
    data_publicacao: '',
    nome_obra: '',
    assinatura: '',
    instancia: '',
    livro: '',
    genero: '',
  };

  // Update UI
  els.globalSearch.value = '';
  els.toggleExtra.checked = false;
  els.toggleCompact.checked = false;
  els.toggleDatedOnly.checked = false;
  
  document.querySelectorAll('[data-column-filter]').forEach((input) => {
    input.value = '';
  });
  
  document.querySelectorAll('[data-facet]').forEach((checkbox) => {
    checkbox.checked = false;
  });

  updateSortIndicators();
  saveStateToUrl();
  fetchPecas();
  fetchFacetas();
}

function handlePageSizeChange() {
  state.pageSize = parseInt(els.pageSize.value, 10);
  state.page = 1;
  saveStateToUrl();
  fetchPecas();
}

function handlePrevPage() {
  if (state.page > 1) {
    state.page--;
    saveStateToUrl();
    fetchPecas();
  }
}

function handleNextPage() {
  if (state.nextUrl) {
    state.page++;
    saveStateToUrl();
    fetchPecas();
  }
}

function handleToggleChange(e) {
  const { id } = e.target;
  
  if (id === 'toggle-extra') {
    state.showExtra = e.target.checked;
  } else if (id === 'toggle-compact') {
    state.compact = e.target.checked;
  } else if (id === 'toggle-dated-only') {
    state.onlyDated = e.target.checked;
  }

  saveStateToUrl();
  updateTableDisplay();
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
  
  // Debounce update on client filters
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

  els.detailTitle.textContent = escapeHtml(row.nome_obra);
  
  const html = `
    <div class="detail-grid">
      <div class="detail-field">
        <span class="label">Código</span>
        <div class="value">${escapeHtml(row.id)}</div>
      </div>

      <div class="detail-field">
        <span class="label">Nome da Obra</span>
        <div class="value">${escapeHtml(row.nome_obra)}</div>
      </div>

      <div class="detail-field">
        <span class="label">Nome Simples</span>
        <div class="value ${!row.nome_obra_simples ? 'empty' : ''}">
          ${row.nome_obra_simples ? escapeHtml(row.nome_obra_simples) : 'Não informado'}
        </div>
      </div>

      <div class="detail-field">
        <span class="label">Ano de Publicação</span>
        <div class="value">${row.ano_publicacao || '—'}</div>
      </div>

      <div class="detail-field">
        <span class="label">Mês de Publicação</span>
        <div class="value">${formatMonth(row.mes_publicacao)}</div>
      </div>

      <div class="detail-field">
        <span class="label">Data de Publicação</span>
        <div class="value">${formatDate(row.data_publicacao)}</div>
      </div>

      <div class="detail-field">
        <span class="label">Gênero</span>
        <div class="value ${!row.genero ? 'empty' : ''}">${escapeHtml(row.genero) || 'Não informado'}</div>
      </div>

      <div class="detail-field">
        <span class="label">Assinatura</span>
        <div class="value ${!row.assinatura ? 'empty' : ''}">${escapeHtml(row.assinatura) || 'Não informado'}</div>
      </div>

      <div class="detail-field">
        <span class="label">Instância</span>
        <div class="value ${!row.instancia ? 'empty' : ''}">${escapeHtml(row.instancia) || 'Não informado'}</div>
      </div>

      <div class="detail-field">
        <span class="label">Livro</span>
        <div class="value ${!row.livro ? 'empty' : ''}">${escapeHtml(row.livro) || 'Não informado'}</div>
      </div>

      <div class="detail-field">
        <span class="label">Mídia</span>
        <div class="value ${!row.midia ? 'empty' : ''}">${escapeHtml(row.midia) || 'Não informado'}</div>
      </div>

      <div class="detail-field">
        <span class="label">Local de Publicação</span>
        <div class="value ${!row.local_publicacao ? 'empty' : ''}">${escapeHtml(row.local_publicacao) || 'Não informado'}</div>
      </div>
    </div>

    ${row.fonte ? `
      <div class="detail-field" style="grid-column: 1 / -1;">
        <span class="label">Fonte</span>
        <div class="value">${escapeHtml(row.fonte)}</div>
      </div>
    ` : ''}

    ${row.dados_publicacao ? `
      <div class="detail-field" style="grid-column: 1 / -1;">
        <span class="label">Dados da Publicação</span>
        <div class="value">${escapeHtml(row.dados_publicacao)}</div>
      </div>
    ` : ''}

    ${row.observacoes ? `
      <div class="detail-field" style="grid-column: 1 / -1;">
        <span class="label">Observações</span>
        <div class="value">${escapeHtml(row.observacoes)}</div>
      </div>
    ` : ''}

    ${row.reproducoes_texto ? `
      <div class="detail-field" style="grid-column: 1 / -1;">
        <span class="label">Reproduções</span>
        <div class="value">${escapeHtml(row.reproducoes_texto)}</div>
      </div>
    ` : ''}
  `;

  els.detailContent.innerHTML = html;
  els.detailModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
  els.detailModal.style.display = 'none';
  document.body.style.overflow = '';
}

function handleModalOverlayClick(e) {
  if (e.target === els.modalOverlay) {
    closeDetailModal();
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    closeDetailModal();
  }
}

// ===== URL STATE MANAGEMENT =====

function saveStateToUrl() {
  const params = new URLSearchParams();

  if (state.globalSearch) params.set('search', state.globalSearch);
  if (state.page > 1) params.set('page', state.page);
  if (state.pageSize !== 25) params.set('page_size', state.pageSize);
  if (state.sortKey) {
    params.set('sort', state.sortKey);
    params.set('sort_dir', state.sortDirection);
  }

  Object.entries(state.facetFilters).forEach(([key, value]) => {
    if (value) params.set(key, value);
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
  state.pageSize = parseInt(params.get('page_size') || '25', 10);
  state.sortKey = params.get('sort') || '';
  state.sortDirection = params.get('sort_dir') || '';

  // Load facet filters
  state.facetFilters.genero_id = params.get('genero_id') || '';
  state.facetFilters.assinatura_id = params.get('assinatura_id') || '';
  state.facetFilters.instancia_id = params.get('instancia_id') || '';
  state.facetFilters.livro_id = params.get('livro_id') || '';
  state.facetFilters.midia_id = params.get('midia_id') || '';

  // Update UI to reflect state
  els.globalSearch.value = state.globalSearch;
  els.pageSize.value = state.pageSize;
  updateSortIndicators();
}

// ===== INITIALIZATION =====

function initializeEventListeners() {
  // Search
  els.applySearch.addEventListener('click', handleSearch);
  els.globalSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Clear and page size
  els.clearFilters.addEventListener('click', handleClearFilters);
  els.pageSize.addEventListener('change', handlePageSizeChange);

  // Pagination
  els.prevPage.addEventListener('click', handlePrevPage);
  els.nextPage.addEventListener('click', handleNextPage);

  // Toggles
  els.toggleExtra.addEventListener('change', handleToggleChange);
  els.toggleCompact.addEventListener('change', handleToggleChange);
  els.toggleDatedOnly.addEventListener('change', handleToggleChange);

  // Column filters
  document.querySelectorAll('[data-column-filter]').forEach((input) => {
    input.addEventListener('input', handleColumnFilterChange);
  });

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach((btn) => {
    btn.addEventListener('click', handleSortClick);
  });

  // Modal
  els.closeModal.addEventListener('click', closeDetailModal);
  els.modalOverlay.addEventListener('click', handleModalOverlayClick);
  document.addEventListener('keydown', handleKeyDown);
}

async function initialize() {
  console.log('Iniciando aplicação de catálogo...');
  
  // Load state from URL
  loadStateFromUrl();

  // Initialize event listeners
  initializeEventListeners();

  // Fetch initial data
  await Promise.all([
    fetchPecas(),
    fetchFacetas(),
  ]);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
