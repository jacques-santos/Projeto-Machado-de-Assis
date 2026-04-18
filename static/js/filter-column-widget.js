/**
 * FilterColumnWidget - Componente reutilizável para filtro de coluna estilo Excel/Access
 * 
 * Uso:
 * const widget = new FilterColumnWidget({
 *   apiBase: '/api/v1',
 *   columnName: 'nome_obra',
 *   columnLabel: 'Nome da Peça',
 *   headerElement: document.querySelector('th'),
 *   onFilterApply: (filters) => { ... }
 * });
 */

class FilterColumnWidget {
  constructor(options) {
    this.apiBase = options.apiBase || '/api/v1';
    this.columnName = options.columnName;
    this.columnLabel = options.columnLabel;
    this.headerElement = options.headerElement;
    this.onFilterApply = options.onFilterApply || (() => {});
    this.onFilterClear = options.onFilterClear || (() => {});
    this.resourcePath = options.resourcePath || 'pecas'; // e.g., 'pecas', 'usuarios'
    this.columnType = options.columnType || 'default'; // 'default', 'year', 'month', 'date'
    this.getActiveFilters = options.getActiveFilters || (() => ({})); // função para obter filtros ativos

    // Estado do filtro
    this.filterState = {
      selectedValues: new Set(),
      textFilters: [],
      isActive: false,
      sortOrder: null, // 'asc', 'desc'
      rangeMin: null,
      rangeMax: null,
    };

    this.allValues = [];
    this.dropdown = null;
    this.filterIcon = null;
    this.repositionHandler = null; // Handler para reposicionamento em scroll/resize
    this.currentSearchTerm = ''; // Armazena o termo de busca atual para filtros visíveis
    this.isLoading = true; // Indica se está carregando valores

    this.init();
  }

  init() {
    this.createFilterIcon();
    this.loadColumnValues();
  }

  createFilterIcon() {
    // Remover ícone anterior se existir
    const existing = this.headerElement.querySelector('.filter-icon');
    if (existing) existing.remove();

    this.filterIcon = document.createElement('button');
    this.filterIcon.className = 'filter-icon';
    this.filterIcon.type = 'button';
    this.filterIcon.title = `Filtrar ${this.columnLabel}`;
    this.filterIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>';
    this.filterIcon.setAttribute('aria-label', `Abrir filtro para ${this.columnLabel}`);
    this.filterIcon.setAttribute('aria-expanded', 'false');
    this.filterIcon.setAttribute('aria-haspopup', 'dialog');

    // Adicionar classe se houver filtro ativo
    if (this.filterState.isActive) {
      this.filterIcon.classList.add('is-active');
      this.filterIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg> ✓';
    }

    this.filterIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Suporte a teclado: Enter ou Space para abrir
    this.filterIcon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleDropdown();
      }
    });

    // Append inside .th-with-search container if present, otherwise directly in header
    const container = this.headerElement.querySelector('.th-with-search') || this.headerElement;
    container.appendChild(this.filterIcon);
  }

  async loadColumnValues() {
    try {
      this.isLoading = true;
      const url = new URL(`${this.apiBase}/${this.resourcePath}/column_values/`, window.location.origin);
      url.searchParams.set('column', this.columnName);
      
      // Adicionar filtros ativos de outras colunas (filtros em cascata)
      const activeFilters = this.getActiveFilters(this.columnName);
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // Para parâmetros repetidos (ex: nome_obra com vírgulas)
          value.forEach(v => url.searchParams.append(key, v));
        } else {
          url.searchParams.set(key, value);
        }
      });
      
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Erro ao carregar valores para ${this.columnName}: ${response.status}`, errorData);
        this.allValues = [];
        this.filterState.selectedValues = new Set();
        this.isLoading = false;
        return;
      }

      const data = await response.json();
      const newValues = data.values || [];
      
      // Preservar seleções existentes que ainda estão disponíveis nos novos valores
      const previouslySelected = new Set(this.filterState.selectedValues);
      const wasActive = this.filterState.isActive;
      
      this.allValues = newValues;
      
      if (wasActive) {
        // Se havia filtro ativo, manter apenas seleções que ainda existem nos novos valores
        const availableValues = new Set(newValues.map(v => v.value));
        const preserved = new Set();
        previouslySelected.forEach(v => {
          if (availableValues.has(v)) {
            preserved.add(v);
          }
        });
        this.filterState.selectedValues = preserved.size > 0 ? preserved : new Set(newValues.map(v => v.value));
        // Se todos foram selecionados, desativar o filtro
        if (this.filterState.selectedValues.size >= newValues.length && !this.filterState.rangeMin && !this.filterState.rangeMax) {
          this.filterState.isActive = false;
        }
      } else {
        // Inicialmente, todos os valores estão selecionados
        this.filterState.selectedValues = new Set(newValues.map(v => v.value));
      }
      
      this.isLoading = false;
      
      // Atualizar dropdown se estiver aberto
      if (this.dropdown && this.dropdown.parentElement) {
        const valuesList = this.dropdown.querySelector('.filter-values-list');
        if (valuesList) {
          valuesList.innerHTML = this.getValuesListHTML();
          this.reattachValueCheckboxEvents();
          this.updateSelectAllCheckbox();
        }
      }
    } catch (error) {
      console.error(`Erro ao buscar valores da coluna ${this.columnName}:`, error);
      this.allValues = [];
      this.filterState.selectedValues = new Set();
      this.isLoading = false;
    }
  }
  
  /**
   * Reanexa event listeners nos checkboxes de valor após atualização do HTML
   */
  reattachValueCheckboxEvents() {
    if (!this.dropdown) return;
    this.dropdown.querySelectorAll('.value-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const rawValue = e.target.dataset.value;
        const value = rawValue === '__blank__' ? null : rawValue;
        if (e.target.checked) {
          this.filterState.selectedValues.add(value);
        } else {
          this.filterState.selectedValues.delete(value);
        }
        this.updateSelectAllCheckbox();
      });
    });
  }

  toggleDropdown() {
    if (this.dropdown && this.dropdown.parentElement) {
      this.closeDropdown();
      this.filterIcon.setAttribute('aria-expanded', 'false');
    } else {
      this.openDropdown();
      this.filterIcon.setAttribute('aria-expanded', 'true');
    }
  }

  openDropdown() {
    // Remover dropdown anterior se existir (de qualquer widget)
    const existing = document.querySelector('.filter-column-dropdown');
    if (existing) existing.remove();
    // Limpar listeners anteriores caso não foram removidos
    this.removeRepositionListeners();

    // Recarregar valores com filtros atuais antes de abrir
    this.loadColumnValues();

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'filter-column-dropdown';
    this.dropdown.setAttribute('role', 'dialog');
    this.dropdown.setAttribute('aria-modal', 'true');
    this.dropdown.setAttribute('aria-labelledby', 'filter-title-' + this.columnName);
    this.dropdown.style.cssText = `
      position: fixed;
      background: var(--table-row-bg, white);
      border: 1px solid var(--border-color, #ccc);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 10000;
      width: 260px;
      font-family: inherit;
      color: var(--text-primary, #333);
    `;

    // Conteúdo
    this.dropdown.innerHTML = this.getDropdownContent();
    document.body.appendChild(this.dropdown);

    // Posicionar dropdown CORRETAMENTE
    this.repositionDropdown();

    // Eventos
    this.attachDropdownEvents();

    // Suporte a teclado: Escape para fechar
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeDropdown();
        this.filterIcon.focus();
        document.removeEventListener('keydown', closeOnEscape);
      }
    };
    document.addEventListener('keydown', closeOnEscape);

    // Fechar ao clicar fora
    const closeOnClickOutside = (e) => {
      if (this.dropdown && this.filterIcon && 
          !this.dropdown.contains(e.target) && 
          !this.filterIcon.contains(e.target)) {
        this.closeDropdown();
        document.removeEventListener('click', closeOnClickOutside);
      }
    };

    document.addEventListener('click', closeOnClickOutside);

    // Adicionar listeners para reposicionamento em scroll/resize
    this.addRepositionListeners();
  }

  /**
   * Reposiciona o dropdown corretamente ancorado ao elemento de origem
   * Solução robusta que:
   * 1. Corrige o cálculo de posição (sem duplicar scrollY com position:fixed)
   * 2. Continua funcionando com scroll da página
   * 3. Continua funcionando com scroll interno de containers
   * 4. Respeita limites da viewport
   * 5. Abre acima se não houver espaço abaixo
   */
  repositionDropdown() {
    if (!this.dropdown) return;

    // Obter posição do elemento de origem (relativa à viewport)
    const rect = this.headerElement.getBoundingClientRect();
    const dropdownHeight = this.dropdown.offsetHeight;
    const dropdownWidth = this.dropdown.offsetWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Garantir que o dropdown foi renderizado para calcular altura
    if (dropdownHeight === 0) {
      // Se ainda não foi renderizado, tentar novamente após render
      requestAnimationFrame(() => this.repositionDropdown());
      return;
    }

    // CÁLCULO CORRETO DE TOP:
    // position:fixed usa viewport como referência, então NÃO precisa adicionar scrollY
    // getBoundingClientRect() já retorna coordenadas na viewport
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const minSpaceNeeded = dropdownHeight + 10;

    let top;
    if (spaceBelow >= minSpaceNeeded) {
      // Espaço suficiente abaixo - abrir abaixo do header
      top = rect.bottom + 5;
    } else if (spaceAbove >= minSpaceNeeded) {
      // Pouco espaço abaixo, mas espaço acima - abrir acima
      top = rect.top - dropdownHeight - 5;
    } else {
      // Pouco espaço em ambas direções - abrir abaixo mesmo assim
      // (melhor que sobrepor o header)
      top = Math.max(5, rect.bottom + 5);
    }

    // CÁLCULO CORRETO DE LEFT:
    // Alinhar com a esquerda do header, mas respeitar limites viewport
    let left = rect.left;

    // Ajustar se sair pela direita
    if (left + dropdownWidth > viewportWidth - 10) {
      left = Math.max(10, viewportWidth - dropdownWidth - 10);
    }

    // Ajustar se sair pela esquerda
    if (left < 10) {
      left = 10;
    }

    // Aplicar posição SEM adicionar window.scrollY
    // (position:fixed usa viewport como referência)
    this.dropdown.style.top = top + 'px';
    this.dropdown.style.left = left + 'px';
  }

  /**
   * Adiciona listeners para reposicionar o dropdown em scroll/resize
   * Garante que o dropdown continua ancorado mesmo ao rolar a página
   */
  addRepositionListeners() {
    // Criar handler com throttling para performance (reposicionar a cada 50ms no máximo)
    let lastReposition = 0;
    this.repositionHandler = () => {
      const now = Date.now();
      if (now - lastReposition > 50) {
        this.repositionDropdown();
        lastReposition = now;
      }
    };

    // Listeners para scroll e resize
    window.addEventListener('scroll', this.repositionHandler, true); // Captura scroll de qualquer element
    window.addEventListener('resize', this.repositionHandler);
  }

  /**
   * Remove listeners de reposicionamento
   */
  removeRepositionListeners() {
    if (this.repositionHandler) {
      window.removeEventListener('scroll', this.repositionHandler, true);
      window.removeEventListener('resize', this.repositionHandler);
      this.repositionHandler = null;
    }
  }

  closeDropdown() {
    if (this.dropdown && this.dropdown.parentElement) {
      this.dropdown.remove();
      this.dropdown = null;
    }
    // Resetar o termo de busca ao fechar o dropdown
    this.currentSearchTerm = '';
    // Remover listeners de reposicionamento
    this.removeRepositionListeners();
    // Atualizar aria-expanded
    if (this.filterIcon) {
      this.filterIcon.setAttribute('aria-expanded', 'false');
    }
  }

  getDropdownContent() {
    const clearDisabled = !this.filterState.isActive ? 'disabled' : '';

    // Seção de range para ano ou data
    let rangeSection = '';
    if (this.columnType === 'year') {
      const yearValues = this.allValues
        .map(v => parseInt(v.value, 10))
        .filter(v => !isNaN(v));
      const dataMin = yearValues.length > 0 ? Math.min(...yearValues) : 1800;
      const dataMax = yearValues.length > 0 ? Math.max(...yearValues) : 2100;
      const minVal = this.filterState.rangeMin || '';
      const maxVal = this.filterState.rangeMax || '';
      const sliderMin = minVal || dataMin;
      const sliderMax = maxVal || dataMax;
      rangeSection = `
        <div class="filter-range-section">
          <div class="filter-range-label">Faixa de anos</div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="number" class="range-min filter-range-input" placeholder="De" value="${minVal}"
                   aria-label="Ano mínimo" min="${dataMin}" max="${dataMax}">
            <span class="filter-range-separator">a</span>
            <input type="number" class="range-max filter-range-input" placeholder="Até" value="${maxVal}"
                   aria-label="Ano máximo" min="${dataMin}" max="${dataMax}">
          </div>
          <div class="filter-range-slider-container" data-min="${dataMin}" data-max="${dataMax}">
            <div class="filter-range-slider-labels">
              <span class="slider-label-min">${dataMin}</span>
              <span class="slider-label-max">${dataMax}</span>
            </div>
            <div class="filter-range-slider-track">
              <div class="filter-range-slider-fill"></div>
            </div>
            <input type="range" class="range-slider range-slider-min" min="${dataMin}" max="${dataMax}" value="${sliderMin}"
                   aria-label="Slider ano mínimo">
            <input type="range" class="range-slider range-slider-max" min="${dataMin}" max="${dataMax}" value="${sliderMax}"
                   aria-label="Slider ano máximo">
          </div>
        </div>
      `;
    } else if (this.columnType === 'date') {
      const minVal = this.filterState.rangeMin || '';
      const maxVal = this.filterState.rangeMax || '';
      rangeSection = `
        <div class="filter-range-section">
          <div class="filter-range-label">Período:</div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="filter-range-date-label">De:</span>
              <input type="date" class="range-min filter-range-input" value="${minVal}"
                     aria-label="Data inicial">
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="filter-range-date-label">Até:</span>
              <input type="date" class="range-max filter-range-input" value="${maxVal}"
                     aria-label="Data final">
            </div>
          </div>
        </div>
      `;
    }

    const html = `
      <div style="padding: 0;">
        <div id="filter-title-${this.columnName}" style="display:none;">Filtro para ${this.columnLabel}</div>
        
        ${rangeSection}

        <!-- Busca -->
        <div class="filter-search-container">
          <input type="text" class="filter-search filter-dropdown-input" placeholder="Pesquisar..." 
                 aria-label="Pesquisar valores em ${this.columnLabel}">
        </div>

        <!-- Selecionar Tudo -->
        <label class="filter-select-all-label">
          <input type="checkbox" class="select-all-checkbox" 
                 aria-label="Selecionar todos os valores de ${this.columnLabel}"
                 ${this.allValuesSelected() ? 'checked' : ''}>
          <span>Selecionar Tudo</span>
        </label>

        <!-- Lista de valores -->
        <div class="filter-values-list" style="
          max-height: 180px;
          overflow-y: auto;
        " role="listbox" aria-label="Lista de valores para filtrar ${this.columnLabel}">
          ${this.getValuesListHTML()}
        </div>

        <!-- Botões de ação -->
        <div class="filter-action-buttons">
          <button class="clear-filter-btn filter-btn-clear btn-secondary" ${clearDisabled} 
                  aria-label="Limpar filtro de ${this.columnLabel}">🗑️ Limpar</button>
          <button class="ok-btn filter-btn-ok btn-primary" aria-label="Aplicar filtro de ${this.columnLabel}">Aplicar</button>
        </div>
      </div>
    `;

    return html;
  }

  getValuesListHTML() {
    if (this.isLoading) {
      return '<div class="filter-loading-msg">Carregando valores...</div>';
    }

    if (this.allValues.length === 0) {
      return '<div class="filter-empty-msg">Sem valores</div>';
    }

    const values = this.allValues.map((item) => {
      // Obter valor limpo para exibição (sem HTML, entidades decodificadas)
      const displayValue = this.getCleanDisplayValue(item.value);
      const isChecked = this.filterState.selectedValues.has(item.value) ? 'checked' : '';
      
      // Exibir contagem se disponível
      const countBadge = item.count != null && item.count > 0
        ? `<span class="filter-value-count">${item.count}</span>`
        : '';

      return `
        <label class="filter-value-label">
          <input type="checkbox" class="value-checkbox filter-value-checkbox" data-value="${item.value === null ? '__blank__' : item.value}" 
                 aria-label="${displayValue} (${item.count || 0} registros)"
                 ${isChecked}>
          <span class="filter-value-text">${this.escapeHtml(displayValue)}</span>
          ${countBadge}
        </label>
      `;
    }).join('');

    return values;
  }

  allValuesSelected() {
    return this.allValues.every(v => this.filterState.selectedValues.has(v.value));
  }

  attachDropdownEvents() {
    // Range inputs (ano e data)
    const rangeMin = this.dropdown.querySelector('input.range-min.filter-range-input');
    const rangeMax = this.dropdown.querySelector('input.range-max.filter-range-input');
    const sliderMin = this.dropdown.querySelector('.range-slider-min');
    const sliderMax = this.dropdown.querySelector('.range-slider-max');

    // Helper to update the slider fill track
    const updateSliderFill = () => {
      if (!sliderMin || !sliderMax) return;
      const container = this.dropdown.querySelector('.filter-range-slider-container');
      if (!container) return;
      const fill = container.querySelector('.filter-range-slider-fill');
      if (!fill) return;
      const dataMinVal = parseInt(container.dataset.min, 10);
      const dataMaxVal = parseInt(container.dataset.max, 10);
      const range = dataMaxVal - dataMinVal;
      if (range <= 0) return;
      const minPct = ((parseInt(sliderMin.value, 10) - dataMinVal) / range) * 100;
      const maxPct = ((parseInt(sliderMax.value, 10) - dataMinVal) / range) * 100;
      fill.style.left = minPct + '%';
      fill.style.width = (maxPct - minPct) + '%';
    };

    if (rangeMin) {
      rangeMin.addEventListener('change', (e) => {
        this.filterState.rangeMin = e.target.value || null;
        if (sliderMin && e.target.value) {
          sliderMin.value = e.target.value;
          updateSliderFill();
        }
      });
    }
    if (rangeMax) {
      rangeMax.addEventListener('change', (e) => {
        this.filterState.rangeMax = e.target.value || null;
        if (sliderMax && e.target.value) {
          sliderMax.value = e.target.value;
          updateSliderFill();
        }
      });
    }

    // Range sliders (year only)
    if (sliderMin && sliderMax) {
      const onSliderInput = () => {
        let minV = parseInt(sliderMin.value, 10);
        let maxV = parseInt(sliderMax.value, 10);
        // Prevent crossing
        if (minV > maxV) {
          sliderMin.value = maxV;
          minV = maxV;
        }
        if (maxV < minV) {
          sliderMax.value = minV;
          maxV = minV;
        }
        // Sync number inputs
        if (rangeMin) rangeMin.value = minV;
        if (rangeMax) rangeMax.value = maxV;
        this.filterState.rangeMin = String(minV);
        this.filterState.rangeMax = String(maxV);
        updateSliderFill();
      };
      sliderMin.addEventListener('input', onSliderInput);
      sliderMax.addEventListener('input', onSliderInput);
      // Initial fill
      updateSliderFill();
    }

    // Busca com debounce para performance
    const searchInput = this.dropdown.querySelector('.filter-search');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.filterValuesList(e.target.value);
      }, 150);
    });
    searchInput.focus();

    // Checkbox "Selecionar Tudo"
    const selectAllCheckbox = this.dropdown.querySelector('.select-all-checkbox');
    selectAllCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        // Selecionar apenas os valores VISÍVEIS (de acordo com o filtro de busca)
        const visibleValues = this.getVisibleValues();
        visibleValues.forEach(v => this.filterState.selectedValues.add(v.value));
      } else {
        // Desselecionar apenas os valores VISÍVEIS (manter outros selecionados)
        const visibleValues = this.getVisibleValues();
        visibleValues.forEach(v => this.filterState.selectedValues.delete(v.value));
      }
      this.updateValueCheckboxes();
    });

    // Checkboxes individuais
    this.dropdown.querySelectorAll('.value-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const rawValue = e.target.dataset.value;
        const value = rawValue === '__blank__' ? null : rawValue;
        if (e.target.checked) {
          this.filterState.selectedValues.add(value);
        } else {
          this.filterState.selectedValues.delete(value);
        }
        this.updateSelectAllCheckbox();
      });
    });

    // Botão limpar filtro
    const clearBtn = this.dropdown.querySelector('.clear-filter-btn');
    if (!clearBtn.disabled) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearFilter();
      });
    }

    // Botões de ação
    this.dropdown.querySelector('.ok-btn').addEventListener('click', () => {
      this.applyFilter();
    });
  }

  updateValueCheckboxes() {
    this.dropdown.querySelectorAll('.value-checkbox').forEach((checkbox) => {
      const rawValue = checkbox.dataset.value;
      const value = rawValue === '__blank__' ? null : rawValue;
      checkbox.checked = this.filterState.selectedValues.has(value);
    });
    this.updateSelectAllCheckbox();
  }

  updateSelectAllCheckbox() {
    const selectAllCheckbox = this.dropdown.querySelector('.select-all-checkbox');
    // Verificar se TODOS os valores VISÍVEIS estão selecionados
    const visibleValues = this.getVisibleValues();
    const allVisibleSelected = visibleValues.every(v => this.filterState.selectedValues.has(v.value));
    selectAllCheckbox.checked = allVisibleSelected;
  }

  filterValuesList(searchTerm) {
    const normalized = searchTerm.toLowerCase();
    const checkboxes = this.dropdown.querySelectorAll('input.value-checkbox');

    checkboxes.forEach((checkbox) => {
      const label = checkbox.closest('label');
      if (!label) return;

      const value = checkbox.dataset.value;
      // Usar getCleanDisplayValue para fazer a busca no texto normalizado
      const displayValue = this.getCleanDisplayValue(value);
      const matches = displayValue.toLowerCase().includes(normalized);

      label.style.display = matches ? 'flex' : 'none';
    });

    // Armazenar o termo de busca atual para uso em "Selecionar Tudo"
    this.currentSearchTerm = searchTerm;

    // Atualizar o checkbox "Selecionar Tudo" para refletir apenas os visíveis
    this.updateSelectAllCheckbox();
  }

  /**
   * Retorna apenas os valores que estão visíveis no filtro
   * (compatíveis com o termo de busca atual)
   */
  getVisibleValues() {
    if (!this.currentSearchTerm) {
      return this.allValues;
    }

    const normalized = this.currentSearchTerm.toLowerCase();
    return this.allValues.filter((item) => {
      const displayValue = this.getCleanDisplayValue(item.value);
      return displayValue.toLowerCase().includes(normalized);
    });
  }

  sortAndApply(order) {
    this.filterState.sortOrder = order;
    this.applyFilter();
  }

  clearFilter() {
    this.filterState = {
      selectedValues: new Set(this.allValues.map(v => v.value)),
      textFilters: [],
      isActive: false,
      sortOrder: null,
      rangeMin: null,
      rangeMax: null,
    };

    this.createFilterIcon();
    this.closeDropdown();

    this.onFilterClear({
      columnName: this.columnName,
    });
  }

  applyFilter() {
    // Se há pesquisa ativa, considerar apenas os valores visíveis
    let finalSelectedValues;
    
    if (this.currentSearchTerm) {
      // Com pesquisa ativa: usar apenas os valores visíveis
      const visibleValues = this.getVisibleValues();
      finalSelectedValues = visibleValues
        .filter(v => this.filterState.selectedValues.has(v.value))
        .map(v => v.value);
    } else {
      // Sem pesquisa: usar todos os valores selecionados normalmente
      finalSelectedValues = Array.from(this.filterState.selectedValues);
    }

    // Determinar se o filtro está ativo (comparar com a lista relevante)
    const totalValuesToCompare = this.currentSearchTerm 
      ? this.getVisibleValues().length
      : this.allValues.length;

    const hasRange = this.filterState.rangeMin || this.filterState.rangeMax;
    this.filterState.isActive = finalSelectedValues.length < totalValuesToCompare || hasRange;

    // Para colunas de data:
    // - Se o usuário selecionou um subconjunto de datas (via pesquisa ou desmarcando manualmente),
    //   enviar os valores individuais (a API suporta ?data_publicacao=val1,val2,...)
    // - Se todos estão selecionados, não enviar valores individuais
    // - Sempre preservar __blank__ (null) para filtrar registros sem data
    if (this.columnType === 'date') {
      const hasBlank = finalSelectedValues.includes(null);
      
      // Extrair datas válidas dos valores selecionados
      const dateValues = finalSelectedValues
        .filter(v => v !== null && v !== undefined && v !== 'None');
      
      const isSubset = dateValues.length > 0 && dateValues.length < this.allValues.length;
      
      if (isSubset) {
        // Subconjunto de datas selecionadas: enviar valores individuais
        finalSelectedValues = dateValues;
        if (hasBlank) finalSelectedValues.push(null);
      } else {
        // Todos selecionados ou nenhum: não enviar valores individuais
        finalSelectedValues = hasBlank ? [null] : [];
      }
    }

    this.createFilterIcon();
    this.closeDropdown();

    this.onFilterApply({
      columnName: this.columnName,
      selectedValues: finalSelectedValues,
      sortOrder: null,
      textFilters: [],
      rangeMin: this.filterState.rangeMin,
      rangeMax: this.filterState.rangeMax,
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Remove tags HTML e decodifica entidades HTML comuns.
   * Garante que valores do filtro exibam apenas texto limpo.
   * Exemplo: "&quot;Cleópatra&quot;" → "Cleópatra"
   * Exemplo: "Escravo&nbsp;e&nbsp;Rainha<div>lixo</div>" → "Escravo e Rainha lixo"
   */
  stripHtmlAndDecode(value) {
    if (!value) return '';
    
    let text = String(value);
    
    // Remove tags HTML (<div>, <font>, etc)
    text = text.replace(/<[^>]*>/g, '');
    
    // Decodifica entidades HTML comuns
    const entities = {
      '&quot;': '"',
      '&apos;': "'",
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&nbsp;': ' ',
      '&#39;': "'",
      '&#34;': '"',
    };
    
    Object.entries(entities).forEach(([entity, char]) => {
      text = text.replace(new RegExp(entity, 'g'), char);
    });
    
    // Remove espaços múltiplos e limpa
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  /**
   * Retorna o valor limpo e pronto para exibição no filtro
   * Trata valores especiais como None (em branco) e remove HTML/entidades
   * Para meses, converte número para nome do mês
   * Para datas, formata no padrão brasileiro
   */
  getCleanDisplayValue(value) {
    if (value === 'None' || value === null || value === undefined) {
      return '(Em Branco)';
    }
    
    // Para coluna de mês, exibir nome do mês
    if (this.columnType === 'month') {
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const num = parseInt(value, 10);
      if (num >= 1 && num <= 12) {
        return monthNames[num - 1];
      }
    }

    // Para coluna de data, formatar no padrão brasileiro
    if (this.columnType === 'date') {
      const dateStr = String(value);
      // Parsear como ISO date (YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS) sem usar new Date()
      // para evitar problemas de timezone com datas históricas
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
      }
    }
    
    // Limpa HTML e decodifica entidades antes de exibir
    return this.stripHtmlAndDecode(value);
  }
}

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FilterColumnWidget;
}
