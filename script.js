// ---------- Category config ----------
const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'back', label: '🐈‍⬛ Back系列', yearSub: true },
  { key: 'diary', label: '📔 全圓日記', yearSub: true },
  { key: 'wongyu', label: '🐈‍⬛🐶 圓奎日常' },
  { key: 'archaeology', label: '🕰️ 考古系列' },
  { key: 'concert', label: '🎤 演唱會巡演' },
  { key: 'support_event', label: '🎉 生咖應援' },
  { key: 'fancam', label: '📸 飯拍分享' },
  { key: 'fashion', label: '👔 時尚代言' },
  { key: 'craft', label: '🧶 手作興趣' },
  { key: 'anniversary', label: '🎊 紀念重要日' },
  { key: 'daily', label: '💭 日常雜談' },
];

const MEDIA_LABEL = {
  TEXT_POST: '純文字',
  IMAGE: '單圖',
  VIDEO: '影片',
  CAROUSEL_ALBUM: '相簿',
};

const UNKNOWN_YEAR = '年份不明';

// ---------- State ----------
let state = {
  cat: 'all',
  year: 'all', // only meaningful when current cat has yearSub
  query: '',
  sort: 'desc',
  page: 0,
};
let expandedCats = new Set();
const PAGE_SIZE = 30;

// ---------- Helpers ----------
function catCount(key) {
  if (key === 'all') return POSTS.length;
  return POSTS.filter(p => p.cat === key).length;
}
function yearsForCat(catKey) {
  const years = new Set();
  POSTS.filter(p => p.cat === catKey).forEach(p => years.add(p.year || UNKNOWN_YEAR));
  const list = [...years].filter(y => y !== UNKNOWN_YEAR).sort((a, b) => b - a);
  if (years.has(UNKNOWN_YEAR)) list.push(UNKNOWN_YEAR);
  return list;
}
function yearCount(catKey, year) {
  if (year === 'all') return catCount(catKey);
  return POSTS.filter(p => p.cat === catKey && (p.year || UNKNOWN_YEAR) === year).length;
}
function catLabel(key) {
  const c = CATEGORIES.find(c => c.key === key);
  return c ? c.label.replace(/^\S+\s/, '') : key;
}

// ---------- Sidebar rendering ----------
function renderTabs() {
  const tabsEl = document.getElementById('tabs');
  let html = '';
  CATEGORIES.forEach(c => {
    if (c.yearSub) {
      const isExpanded = expandedCats.has(c.key);
      html += `
        <button class="tab-btn tab-btn-expandable ${state.cat === c.key ? 'active' : ''}" data-cat="${c.key}">
          <span>${c.label}</span>
          <span class="tab-btn-right">
            <span class="count">${catCount(c.key)}</span>
            <span class="expand-arrow ${isExpanded ? 'open' : ''}" data-toggle="${c.key}">▾</span>
          </span>
        </button>
      `;
      if (isExpanded) {
        const years = yearsForCat(c.key);
        html += `<div class="subtabs">` + years.map(y => `
          <button class="tab-btn ${state.cat === c.key && state.year === String(y) ? 'active' : ''}" data-cat="${c.key}" data-year="${y}">
            <span>${y === UNKNOWN_YEAR ? y : y + ' 年'}</span><span class="count">${yearCount(c.key, y)}</span>
          </button>
        `).join('') + `</div>`;
      }
    } else {
      html += `
        <button class="tab-btn ${state.cat === c.key ? 'active' : ''}" data-cat="${c.key}">
          <span>${c.label}</span><span class="count">${catCount(c.key)}</span>
        </button>
      `;
    }
  });
  tabsEl.innerHTML = html;

  tabsEl.querySelectorAll('[data-cat]:not([data-year])').forEach(btn => {
    btn.addEventListener('click', () => {
      state.cat = btn.dataset.cat;
      state.year = 'all';
      state.page = 0;
      renderTabs();
      renderCards();
      closeSidebarOnMobile();
    });
  });
  tabsEl.querySelectorAll('[data-year]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.cat = btn.dataset.cat;
      state.year = btn.dataset.year;
      state.page = 0;
      renderTabs();
      renderCards();
      closeSidebarOnMobile();
    });
  });
  tabsEl.querySelectorAll('[data-toggle]').forEach(arrow => {
    arrow.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = arrow.dataset.toggle;
      if (expandedCats.has(key)) expandedCats.delete(key);
      else expandedCats.add(key);
      renderTabs();
    });
  });
}

function renderActiveFilter() {
  const el = document.getElementById('activeFilter');
  if (state.cat === 'all') {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  let label = CATEGORIES.find(c => c.key === state.cat).label;
  if (state.year !== 'all') {
    label += ' / ' + (state.year === UNKNOWN_YEAR ? state.year : state.year + ' 年');
  }
  el.innerHTML = `目前分類：${label} <button id="clearFilterBtn">✕ 清除</button>`;
  document.getElementById('clearFilterBtn').addEventListener('click', () => {
    state.cat = 'all';
    state.year = 'all';
    state.page = 0;
    renderTabs();
    renderActiveFilter();
    renderCards();
  });
}

// ---------- Filtering / sorting ----------
function getFiltered() {
  let list = POSTS;
  if (state.cat !== 'all') list = list.filter(p => p.cat === state.cat);
  const catConfig = CATEGORIES.find(c => c.key === state.cat);
  if (catConfig && catConfig.yearSub && state.year !== 'all') {
    list = list.filter(p => (p.year || UNKNOWN_YEAR) === state.year);
  }
  if (state.query.trim()) {
    const q = state.query.trim().toLowerCase();
    list = list.filter(p => p.text.toLowerCase().includes(q) || p.date.includes(q));
  }
  // Note: `no` is the original chronological order from the export (no=1 is the
  // most recently posted item, larger no = posted earlier). This matches the
  // full original timestamp exactly, so it's used as the tie-breaker whenever
  // two posts share the same date.
  list = list.slice().sort((a, b) => {
    if (a.date === b.date) return state.sort === 'desc' ? a.no - b.no : b.no - a.no;
    return state.sort === 'desc' ? (a.date < b.date ? 1 : -1) : (a.date > b.date ? 1 : -1);
  });
  return list;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderCards() {
  renderActiveFilter();
  const filtered = getFiltered();
  const grid = document.getElementById('cardGrid');
  const emptyState = document.getElementById('emptyState');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const searchCount = document.getElementById('searchCount');

  searchCount.textContent = `共 ${filtered.length} 篇`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.hidden = false;
    loadMoreBtn.hidden = true;
    return;
  }
  emptyState.hidden = true;

  const showCount = (state.page + 1) * PAGE_SIZE;
  const toShow = filtered.slice(0, showCount);

  grid.innerHTML = toShow.map(p => `
    <a class="card" href="${p.url}" target="_blank" rel="noopener">
      <div class="card-top">
        <span class="card-date">${p.date}</span>
        <span class="card-badge">${catLabel(p.cat)}</span>
      </div>
      <div class="card-excerpt">${escapeHtml(p.excerpt)}${p.text.length > p.excerpt.length ? '…' : ''}</div>
      <div class="card-bottom">
        <span class="card-media">${MEDIA_LABEL[p.media] || p.media}</span>
        <span class="card-link">查看原文 →</span>
      </div>
    </a>
  `).join('');

  loadMoreBtn.hidden = showCount >= filtered.length;
}

function renderStats() {
  const stats = document.getElementById('stats');
  const dates = POSTS.map(p => p.date).sort();
  stats.innerHTML = `
    <span>共 <b>${POSTS.length}</b> 篇</span>
    <span><b>${dates[0]}</b> ~ <b>${dates[dates.length - 1]}</b></span>
    <span><b>${CATEGORIES.length - 1}</b> 個分類</span>
  `;
}

// ---------- Sidebar open/close ----------
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
}
function closeSidebarOnMobile() {
  if (window.innerWidth <= 900) closeSidebar();
}
document.getElementById('menuToggle').addEventListener('click', openSidebar);
document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// ---------- Events ----------
document.getElementById('searchInput').addEventListener('input', (e) => {
  state.query = e.target.value;
  state.page = 0;
  renderCards();
});
document.getElementById('loadMoreBtn').addEventListener('click', () => {
  state.page++;
  renderCards();
});
document.querySelectorAll('input[name="sort"]').forEach(r => {
  r.addEventListener('change', (e) => {
    state.sort = e.target.value;
    state.page = 0;
    renderCards();
  });
});

// ---------- Init ----------
renderStats();
renderTabs();
renderCards();
