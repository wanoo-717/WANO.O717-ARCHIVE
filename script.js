// ---------- Category config ----------
const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'back', label: '🐈‍⬛ Back系列' },
  { key: 'diary', label: '📔 全圓日記' },
  { key: 'concert', label: '🎤 演唱會巡演' },
  { key: 'support_event', label: '🎉 生咖應援' },
  { key: 'fancam_share', label: '📸 飯拍分享' },
  { key: 'fancam_sale', label: '📸 飯拍出清' },
  { key: 'fashion', label: '👔 時尚代言' },
  { key: 'craft', label: '🧶 手作興趣' },
  { key: 'anniversary', label: '🎊 紀念重要日' },
  { key: 'daily', label: '💭 日常雜談' },
];

const SUBCATS = [
  { key: 'all', label: '全部' },
  { key: 'reaction', label: '圖影心得' },
  { key: 'thoughts', label: '心情碎念' },
  { key: 'community', label: '站子社群' },
  { key: 'goods', label: '週邊小物' },
  { key: 'archaeology', label: '考古舊圖' },
  { key: 'giveaway', label: '抽獎贈送' },
];

const MEDIA_LABEL = {
  TEXT_POST: '純文字',
  IMAGE: '單圖',
  VIDEO: '影片',
  CAROUSEL_ALBUM: '相簿',
};

// ---------- State ----------
let state = {
  cat: 'all',
  sub: 'all',
  query: '',
  sort: 'desc',
  page: 0,
};
const PAGE_SIZE = 30;

// ---------- Setup ----------
function catCount(key) {
  if (key === 'all') return POSTS.length;
  return POSTS.filter(p => p.cat === key).length;
}
function subCount(key) {
  const pool = POSTS.filter(p => p.cat === 'daily');
  if (key === 'all') return pool.length;
  return pool.filter(p => p.sub === key).length;
}

function renderTabs() {
  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = CATEGORIES.map(c => `
    <button class="tab-btn ${state.cat === c.key ? 'active' : ''}" data-cat="${c.key}">
      ${c.label}<span class="count">${catCount(c.key)}</span>
    </button>
  `).join('');
  tabsEl.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.cat = btn.dataset.cat;
      state.sub = 'all';
      state.page = 0;
      renderTabs();
      renderSubtabs();
      renderCards();
    });
  });
}

function renderSubtabs() {
  const subtabsEl = document.getElementById('subtabs');
  if (state.cat !== 'daily') {
    subtabsEl.hidden = true;
    return;
  }
  subtabsEl.hidden = false;
  subtabsEl.innerHTML = SUBCATS.map(s => `
    <button class="tab-btn ${state.sub === s.key ? 'active' : ''}" data-sub="${s.key}">
      ${s.label}<span class="count">${subCount(s.key)}</span>
    </button>
  `).join('');
  subtabsEl.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sub = btn.dataset.sub;
      state.page = 0;
      renderSubtabs();
      renderCards();
    });
  });
}

function getFiltered() {
  let list = POSTS;
  if (state.cat !== 'all') list = list.filter(p => p.cat === state.cat);
  if (state.cat === 'daily' && state.sub !== 'all') list = list.filter(p => p.sub === state.sub);
  if (state.query.trim()) {
    const q = state.query.trim().toLowerCase();
    list = list.filter(p => p.text.toLowerCase().includes(q) || p.date.includes(q));
  }
  list = list.slice().sort((a, b) => {
    if (a.date === b.date) return state.sort === 'desc' ? b.no - a.no : a.no - b.no;
    return state.sort === 'desc' ? (a.date < b.date ? 1 : -1) : (a.date > b.date ? 1 : -1);
  });
  return list;
}

function catLabel(key) {
  const c = CATEGORIES.find(c => c.key === key);
  return c ? c.label.replace(/^\S+\s/, '') : key;
}

function renderCards() {
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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
renderSubtabs();
renderCards();
