const config = window.MACHADO_CONFIG || {};
const apiBase = (config.apiBase || '/api/v1').replace(/\/$/, '');

const state = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: 25,
  nextUrl: null,
  previousUrl: null,
  globalSearch: '',
  showExtra: false,
  compact: false,
  onlyDated: false,
  sortKey: '',
  sortDirection: '',
  facetFilters: {
    genero_id: '',
    assinatura_id: '',
    instancia_id: '',
    livro_id: '',
    midia_id: '',
  },
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

const els = {
  resultsBody: document.getElementById('results-body'),
  resultsSummary: document.getElementById('results-summary'),
  loadingIndicator: document.getElementById('loading-indicator'),
  pageIndicator: document.getElementById('page-indicator'),
  prevPage: document.getElementById('prev-page'),
  nextPage: document.getElementById('next-page'),
  pageSize: document.getElementById('page-size'),
  globalSearch: document.getElementById('global-search'),
  applySearch: document.getElementById('apply-search'),
  clearFilters: document.getElementById('clear-filters'),
  toggleExtra: document.getElementById('toggle-extra'),
  toggleCompact: document.getElementById('toggle-compact'),
  toggleDatedOnly: document.getElementById('toggle-dated-only'),
  detailModal: document.getElementById('detail-modal'),
  detailTitle: document.getElementById('detail-title'),
  detailContent: document.getElementById('detail-content'),
  closeModal: document.getElementById('close-modal'),
  facetSummary: document.getElementById('facet-summary'),
  filterGenero: document.getElementById('filter-genero'),
  filterAssinatura: document.getElementById('filter-assinatura'),
  filterInstancia: document.getElementById('filter-instancia'),
  filterLivro: document.getElementById('filter-livro'),
  filterMidia: document.getElementById('filter-midia'),
};

const serverSortableFields = new Set(['id', 'ano_publicacao', 'mes_publicacao', 'data_publicacao', 'nome_obra']);
const columnInputs = Array.from(document.querySelectorAll('[data-column-filter]'));
const sortButtons = Array.from(document.querySelectorAll('.sort-btn'));

function setLoading(message) {
  els.loadingIndicator.textContent = message;
}

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
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('pt-BR');
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

  if (state.sortDirection === 'desc') {
    state.sortKey = '';
    state.sortDirection = '';
    return;
  }

  state.sortDirection = 'asc';
}

function getServerOrdering() {
  if (!state.sortKey || !state.sortDirection || !serverSortableFields.has(state.sortKey)) {
    return '';
  }

  return state.sortDirection === 'desc' ? `-${state.sortKey}` : state.sortKey;
}

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

  Object.entries(state.facetFilters).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

function applyClientFilters(rows) {
  let filtered = [...rows];

  if (state.onlyDated) {
    filtered = filtered.filter((row) => Boolean(row.data_publicacao));
  }

  Object.entries(state.columnFilters).forEach(([key, rawValue]) => {
    const expected = normalizeText(rawValue);
    if (!expected) {
      return;
    }

    filtered = filtered.filter((row) => {
      const valueMap = {
        id: row.id,
        ano_publicacao: row.ano_publicacao,
        mes_publicacao: row.mes_publicacao,
        data_publicacao: formatDate(row.data_publicacao),
        nome_obra: row.nome_obra,
        assinatura: row.assinatura,
        instancia: row.instancia,
        livro: row.livro,
        genero: row.genero,
      };

      return normalizeText(valueMap[key]).includes(expected);
    });
  });

  if (state.sortKey && !serverSortableFields.has(state.sortKey)) {
    filtered.sort((a, b) => {
      const extract = (row) => {
        const map = {
          assinatura: row.assinatura,
          instancia: row.instancia,
          livro: row.livro,
          genero: row.genero,
        };
        return normalizeText(map[state.sortKey]);
      };

      const first = extract(a);
      const second = extract(b);

      if (first < second) return state.sortDirection === 'desc' ? 1 : -1;
      if (first > second) return state.sortDirection === 'desc' ? -1 : 1;
      return 0;
    });
  }

  return filtered;
}

function renderSortIndicators() {
  sortButtons.forEach((button) => {
    const indicator = button.querySelector('.sort-indicator');
    const isActive = state.sortKey === button.dataset.sortKey;

    if (!isActive || !state.sortDirection) {
      indicator.textContent = '↕';
      return;
    }

    indicator.textContent = state.sortDirection === 'asc' ? '↑' : '↓';
  });
}

function renderRows() {
  const rows = applyClientFilters(state.rows);

  if (!rows.length) {
    els.resultsBody.innerHTML = '<tr><td colspan="9" class="empty-state">Nenhum registro encontrado com os filtros atuais.</td></tr>';
    return;
  }

  els.resultsBody.innerHTML = rows.map((row) => {
    const extra = state.showExtra
      ? `<div class="row-extra">
          <div><strong>Data:</strong> ${escapeHtml(formatDate(row.data_publicacao))}</div>
          <div><strong>ID:</strong> ${escapeHtml(row.id)}</div>
        </div>`
      : '';

    return `
      <tr class="is-clickable" data-row-id="${escapeHtml(row.id)}">
        <td>${escapeHtml(row.id)}</td>
        <td>${escapeHtml(row.ano_publicacao ?? '—')}</td>
        <td>${escapeHtml(row.mes_publicacao ?? '—')}</td>
        <td>${escapeHtml(formatDate(row.data_publicacao))}</td>
        <td>
          <div class="row-title">${escapeHtml(row.nome_obra || '—')}</div>
          ${extra}
        </td>
        <td>${escapeHtml(row.assinatura || '—')}</td>
        <td>${escapeHtml(row.instancia || '—')}</td>
        <td>${escapeHtml(row.livro || '—')}</td>
        <td>${escapeHtml(row.genero || '—')}</td>
      </tr>
    `;
  }).join('');
}

function renderSummary() {
  const start = state.total === 0 ? 0 : ((state.page - 1) * state.pageSize) + 1;
  const end = Math.min(state.page * state.pageSize, state.total);
  els.resultsSummary.textContent = `Mostrando ${start}–${end} de ${state.total} registros`;
  els.pageIndicator.textContent = `Página ${state.page}`;
  els.prevPage.disabled = !state.previousUrl || state.page <= 1;
  els.nextPage.disabled = !state.nextUrl;
}

function populateSelect(selectEl, items, labelKey = 'nome') {
  const currentValue = selectEl.value;
  const options = ['<option value="">Todos</option>']
    .concat(items.map((item) => {
      const label = item[labelKey] ?? item.nome ?? item.titulo ?? '—';
      const suffix = item.total ? ` (${item.total})` : '';
      return `<option value="${escapeHtml(item.id)}">${escapeHtml(label)}${escapeHtml(suffix)}</option>`;
    }))
    .join('');

  selectEl.innerHTML = options;

  if (currentValue) {
    selectEl.value = currentValue;
  }
}

function renderFacetSummary(payload) {
  const groups = [
    { key: 'generos', label: 'Gêneros' },
    { key: 'assinaturas', label: 'Assinaturas' },
    { key: 'midias', label: 'Mídias' },
    { key: 'livros', label: 'Livros' },
  ];

  els.facetSummary.innerHTML = groups.map((group) => {
    const total = Array.isArray(payload[group.key]) ? payload[group.key].length : 0;
    return `<span class="facet-pill">${escapeHtml(group.label)}: ${escapeHtml(total)}</span>`;
  }).join('');
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha na requisição: ${response.status}`);
  }
  return response.json();
}

async function loadFacets() {
  const [facetas, instancias, generos, assinaturas, livros, midias] = await Promise.all([
    fetchJson(`${apiBase}/pecas/facetas/`),
    fetchJson(`${apiBase}/instancias/`),
    fetchJson(`${apiBase}/generos/`),
    fetchJson(`${apiBase}/assinaturas/`),
    fetchJson(`${apiBase}/livros/`),
    fetchJson(`${apiBase}/midias/`),
  ]);

  renderFacetSummary(facetas);
  populateSelect(els.filterGenero, facetas.generos || generos.results || []);
  populateSelect(els.filterAssinatura, facetas.assinaturas || assinaturas.results || []);
  populateSelect(els.filterLivro, facetas.livros || livros.results || [], 'titulo');
  populateSelect(els.filterMidia, facetas.midias || midias.results || []);
  populateSelect(els.filterInstancia, instancias.results || []);
}

async function loadRows() {
  try {
    setLoading('Consultando API...');
    const payload = await fetchJson(buildApiUrl());

    state.rows = payload.results || [];
    state.total = payload.count || 0;
    state.nextUrl = payload.next;
    state.previousUrl = payload.previous;

    renderSortIndicators();
    renderRows();
    renderSummary();
    setLoading('Consulta concluída');
  } catch (error) {
    els.resultsBody.innerHTML = `<tr><td colspan="9" class="empty-state">Erro ao carregar registros: ${escapeHtml(error.message)}</td></tr>`;
    els.resultsSummary.textContent = 'Não foi possível consultar a API.';
    setLoading('Erro na consulta');
  }
}

function formatDetailValue(label, value, usePre = false) {
  const safeValue = value ? escapeHtml(value) : '—';
  return `
    <div class="detail-label">${escapeHtml(label)}</div>
    <div class="${usePre ? 'preformatted' : ''}">${safeValue}</div>
  `;
}

async function openDetail(id) {
  try {
    els.detailTitle.textContent = `Registro ${id}`;
    els.detailContent.innerHTML = '<p class="muted">Carregando detalhes...</p>';
    els.detailModal.showModal();

    const row = await fetchJson(`${apiBase}/pecas/${id}/`);

    els.detailTitle.textContent = row.nome_obra || `Registro ${id}`;
    els.detailContent.innerHTML = `
      <div class="detail-grid">
        ${formatDetailValue('Código', row.id)}
        ${formatDetailValue('Ano de publicação', row.ano_publicacao)}
        ${formatDetailValue('Mês de publicação', row.mes_publicacao)}
        ${formatDetailValue('Data de publicação', formatDate(row.data_publicacao))}
        ${formatDetailValue('Assinatura', row.assinatura?.nome)}
        ${formatDetailValue('Instância', row.instancia?.nome)}
        ${formatDetailValue('Gênero', row.genero?.nome)}
        ${formatDetailValue('Livro', row.livro?.titulo)}
        ${formatDetailValue('Mídia', row.midia?.nome)}
        ${formatDetailValue('Local de publicação', row.local_publicacao?.nome)}
        ${formatDetailValue('Nome simples', row.nome_obra_simples)}
        ${formatDetailValue('Fonte', row.fonte, true)}
        ${formatDetailValue('Dados da publicação', row.dados_publicacao, true)}
        ${formatDetailValue('Observações', row.observacoes, true)}
        ${formatDetailValue('Reproduções', row.reproducoes_texto, true)}
      </div>
    `;
  } catch (error) {
    els.detailContent.innerHTML = `<p class="muted">Falha ao carregar detalhes: ${escapeHtml(error.message)}</p>`;
  }
}

function syncUiFromState() {
  document.body.classList.toggle('is-compact', state.compact);
  els.pageSize.value = String(state.pageSize);
  els.globalSearch.value = state.globalSearch;
  els.toggleExtra.checked = state.showExtra;
  els.toggleCompact.checked = state.compact;
  els.toggleDatedOnly.checked = state.onlyDated;
  els.filterGenero.value = state.facetFilters.genero_id;
  els.filterAssinatura.value = state.facetFilters.assinatura_id;
  els.filterInstancia.value = state.facetFilters.instancia_id;
  els.filterLivro.value = state.facetFilters.livro_id;
  els.filterMidia.value = state.facetFilters.midia_id;

  columnInputs.forEach((input) => {
    input.value = state.columnFilters[input.dataset.columnFilter] || '';
  });
}

function resetState() {
  state.page = 1;
  state.globalSearch = '';
  state.showExtra = false;
  state.compact = false;
  state.onlyDated = false;
  state.sortKey = '';
  state.sortDirection = '';
  Object.keys(state.facetFilters).forEach((key) => {
    state.facetFilters[key] = '';
  });
  Object.keys(state.columnFilters).forEach((key) => {
    state.columnFilters[key] = '';
  });
  syncUiFromState();
}

function attachEvents() {
  els.applySearch.addEventListener('click', () => {
    state.page = 1;
    state.globalSearch = els.globalSearch.value.trim();
    loadRows();
  });

  els.globalSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      state.page = 1;
      state.globalSearch = els.globalSearch.value.trim();
      loadRows();
    }
  });

  els.clearFilters.addEventListener('click', () => {
    resetState();
    loadRows();
  });

  els.pageSize.addEventListener('change', () => {
    state.page = 1;
    state.pageSize = Number(els.pageSize.value);
    loadRows();
  });

  els.prevPage.addEventListener('click', () => {
    if (state.page > 1) {
      state.page -= 1;
      loadRows();
    }
  });

  els.nextPage.addEventListener('click', () => {
    if (state.nextUrl) {
      state.page += 1;
      loadRows();
    }
  });

  els.toggleExtra.addEventListener('change', () => {
    state.showExtra = els.toggleExtra.checked;
    renderRows();
  });

  els.toggleCompact.addEventListener('change', () => {
    state.compact = els.toggleCompact.checked;
    syncUiFromState();
  });

  els.toggleDatedOnly.addEventListener('change', () => {
    state.onlyDated = els.toggleDatedOnly.checked;
    renderRows();
  });

  [
    ['filter-genero', 'genero_id'],
    ['filter-assinatura', 'assinatura_id'],
    ['filter-instancia', 'instancia_id'],
    ['filter-livro', 'livro_id'],
    ['filter-midia', 'midia_id'],
  ].forEach(([elementId, stateKey]) => {
    const el = document.getElementById(elementId);
    el.addEventListener('change', () => {
      state.page = 1;
      state.facetFilters[stateKey] = el.value;
      loadRows();
    });
  });

  columnInputs.forEach((input) => {
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      state.columnFilters[input.dataset.columnFilter] = input.value.trim();
      renderRows();
    });

    input.addEventListener('blur', () => {
      state.columnFilters[input.dataset.columnFilter] = input.value.trim();
      renderRows();
    });
  });

  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      cycleSort(button.dataset.sortKey);
      if (serverSortableFields.has(button.dataset.sortKey)) {
        state.page = 1;
        loadRows();
        return;
      }
      renderSortIndicators();
      renderRows();
    });
  });

  els.resultsBody.addEventListener('click', (event) => {
    const row = event.target.closest('[data-row-id]');
    if (!row) {
      return;
    }
    openDetail(row.dataset.rowId);
  });

  els.closeModal.addEventListener('click', () => {
    els.detailModal.close();
  });
}

async function init() {
  syncUiFromState();
  attachEvents();
  try {
    await loadFacets();
  } catch (error) {
    els.facetSummary.innerHTML = `<span class="facet-pill">Falha ao carregar facetas: ${escapeHtml(error.message)}</span>`;
  }
  await loadRows();
}

init();
