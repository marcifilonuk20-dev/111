/**
 * 数学笔记 - 主脚本
 */
(function () {
  'use strict';

  /* ========== Particle Background ========== */
  function initParticles() {
    var canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var particles = [];
    var maxParticles = 60;
    var symbols = ['∑', '∫', 'π', '∞', '√', 'Δ', '∂', 'α', 'β', 'γ', 'λ', 'θ', 'φ', '∈', '∀', '∃', '⊕', '⊗', '∮', '∇'];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = document.documentElement.scrollHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 10 + Math.random() * 14,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3 - 0.1,
        opacity: 0.06 + Math.random() * 0.08,
        life: 200 + Math.random() * 400,
        age: 0
      };
    }

    for (var i = 0; i < maxParticles; i++) {
      var p = createParticle();
      p.age = Math.random() * p.life;
      particles.push(p);
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.age++;

        if (p.age > p.life || p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) {
          particles[i] = createParticle();
          p = particles[i];
        }

        var alpha = p.opacity * (1 - Math.abs(p.age - p.life / 2) / (p.life / 2));
        if (alpha < 0) alpha = 0;
        if (isDark) alpha *= 1.6;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = p.size + 'px "Noto Serif SC", serif';
        ctx.fillStyle = isDark ? '#8184f9' : '#5b5ef7';
        ctx.fillText(p.symbol, p.x, p.y);
        ctx.restore();
      }

      requestAnimationFrame(draw);
    }
    draw();

    // Update canvas height on content change
    var observer = new MutationObserver(function () {
      canvas.height = document.documentElement.scrollHeight;
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ========== Scroll Progress Bar ========== */
  function initScrollProgress() {
    var bar = document.querySelector('.scroll-progress');
    if (!bar) return;

    window.addEventListener('scroll', function () {
      var scrollTop = window.scrollY;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = Math.min(progress, 100) + '%';
    }, { passive: true });
  }

  /* ========== Scroll Reveal ========== */
  function initScrollReveal() {
    var reveals = document.querySelectorAll('.reveal');

    function check() {
      for (var i = 0; i < reveals.length; i++) {
        var el = reveals[i];
        var top = el.getBoundingClientRect().top;
        var windowHeight = window.innerHeight;
        if (top < windowHeight - 60) {
          el.classList.add('visible');
        }
      }
    }

    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ========== Theme Manager ========== */
  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getSavedTheme() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }

  function updateThemeIcon(theme) {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    btn.setAttribute('aria-label', theme === 'dark' ? '切换浅色模式' : '切换深色模式');
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  }

  function initTheme() {
    var saved = getSavedTheme();
    var theme = saved || getSystemTheme();
    applyTheme(theme);

    var btn = document.querySelector('.theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!getSavedTheme()) applyTheme(e.matches ? 'dark' : 'light');
    });
  }

  /* ========== Mobile Nav ========== */
  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      document.body.classList.toggle('nav-open');
    });
    document.querySelectorAll('.site-nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
      });
    });
  }

  /* ========== Article Data Loader ========== */
  var articlesCache = null;

  function getBasePath() {
    return window.location.pathname.includes('/articles/') ? '../' : './';
  }

  async function fetchArticles() {
    if (articlesCache) return articlesCache;
    try {
      var resp = await fetch(getBasePath() + 'data/articles.json');
      if (!resp.ok) throw new Error('Failed');
      articlesCache = await resp.json();
      return articlesCache;
    } catch (err) {
      console.error('Failed to load articles:', err);
      return { articles: [], categories: [] };
    }
  }

  /* ========== Helpers ========== */
  function formatDate(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function getArticlePath(article) {
    return getBasePath() === './' ? 'articles/' + article.file : article.file;
  }

  /* ========== Card Rendering ========== */
  var categoryIcons = {
    '复变函数': 'ℂ', '高等代数': '𝔸', '数学分析': '∫',
    '概率论': 'P', '抽象代数': 'G', '数论': 'ℕ', '几何与拓扑': '𝕋'
  };

  function createArticleCard(article, index) {
    var card = document.createElement('div');
    card.className = 'article-card reveal';
    card.style.animationDelay = (index * 0.08) + 's';
    var icon = categoryIcons[article.category] || 'Σ';
    card.innerHTML =
      '<span class="category-tag">' + escapeHtml(article.category) + '</span>' +
      '<h3><a href="' + getArticlePath(article) + '">' + escapeHtml(article.title) + '</a></h3>' +
      '<time datetime="' + article.date + '">' + formatDate(article.date) + '</time>' +
      '<p class="excerpt">' + escapeHtml(article.excerpt) + '</p>' +
      '<span class="article-card-icon">' + icon + '</span>';
    return card;
  }

  /* ========== Render Featured (Homepage) ========== */
  async function renderFeaturedArticles(containerSelector) {
    var container = document.querySelector(containerSelector);
    if (!container) return;
    var data = await fetchArticles();
    var all = data.articles
      .sort(function (a, b) { return b.date.localeCompare(a.date); });

    if (!all.length) { container.innerHTML = '<p class="empty-state">暂无文章</p>'; return; }

    all.forEach(function (article, i) {
      container.appendChild(createArticleCard(article, i));
    });
  }

  /* ========== Render Article List ========== */
  function createArticleListItem(article) {
    var item = document.createElement('div');
    item.className = 'article-list-item reveal';
    item.setAttribute('data-category', article.category);
    item.setAttribute('data-searchable', article.title + ' ' + article.excerpt + ' ' + article.tags.join(' '));
    item.innerHTML =
      '<div class="meta">' +
        '<time datetime="' + article.date + '">' + formatDate(article.date) + '</time>' +
        ' · <span style="color:var(--color-primary);font-weight:600;">' + escapeHtml(article.category) + '</span>' +
      '</div>' +
      '<h3><a href="' + getArticlePath(article) + '">' + escapeHtml(article.title) + '</a></h3>' +
      '<p class="excerpt">' + escapeHtml(article.excerpt) + '</p>';
    return item;
  }

  async function renderArticleList(containerSelector) {
    var container = document.querySelector(containerSelector);
    if (!container) return;
    var data = await fetchArticles();
    var articles = data.articles.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    if (!articles.length) { container.innerHTML = '<div class="empty-state"><p>还没有文章</p></div>'; return; }
    articles.forEach(function (a) { container.appendChild(createArticleListItem(a)); });
    container._articlesData = articles;
  }

  /* ========== Category Filters ========== */
  async function renderCategoryFilters(containerSelector) {
    var container = document.querySelector(containerSelector);
    if (!container) return;
    var data = await fetchArticles();

    var allChip = document.createElement('button');
    allChip.className = 'category-chip active'; allChip.textContent = '全部';
    allChip.addEventListener('click', function () { filterArticles(null); });
    container.appendChild(allChip);

    data.categories.forEach(function (cat) {
      var chip = document.createElement('button');
      chip.className = 'category-chip'; chip.textContent = cat;
      chip.addEventListener('click', function () { filterArticles(cat); });
      container.appendChild(chip);
    });
  }

  function filterArticles(category) {
    document.querySelectorAll('.category-chip').forEach(function (c) {
      c.classList.toggle('active', c.textContent === (category || '全部'));
    });
    var container = document.querySelector('#article-list');
    if (!container) return;
    var articles = container._articlesData || [];
    var search = (document.querySelector('#search-input') || {}).value || '';
    renderFiltered(container, articles, category, search);
  }

  function renderFiltered(container, articles, category, search) {
    container.innerHTML = '';
    var filtered = articles.filter(function (a) {
      var mCat = !category || a.category === category;
      var mSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.excerpt.toLowerCase().includes(search.toLowerCase()) ||
        a.tags.some(function (t) { return t.toLowerCase().includes(search.toLowerCase()); });
      return mCat && mSearch;
    });
    if (!filtered.length) { container.innerHTML = '<div class="empty-state"><p>没有找到匹配的文章</p></div>'; return; }
    filtered.forEach(function (a) { container.appendChild(createArticleListItem(a)); });
  }

  function initSearch() {
    var input = document.querySelector('#search-input');
    if (!input) return;
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var container = document.querySelector('#article-list');
        if (!container) return;
        var articles = container._articlesData || [];
        var active = document.querySelector('.category-chip.active');
        var cat = active && active.textContent !== '全部' ? active.textContent : null;
        renderFiltered(container, articles, cat, input.value);
      }, 250);
    });
  }

  /* ========== Article Nav ========== */
  async function renderArticleNav(containerSelector, articleId) {
    var container = document.querySelector(containerSelector);
    if (!container || !articleId) return;
    var data = await fetchArticles();
    var articles = data.articles.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    var idx = -1;
    for (var i = 0; i < articles.length; i++) { if (articles[i].id === articleId) { idx = i; break; } }
    if (idx === -1) return;
    var prev = articles[idx + 1] || null;
    var next = articles[idx - 1] || null;
    container.innerHTML = '';
    if (prev) { var pl = document.createElement('a'); pl.className = 'prev'; pl.href = getArticlePath(prev); pl.textContent = prev.title; container.appendChild(pl); }
    if (next) { var nl = document.createElement('a'); nl.className = 'next'; nl.href = getArticlePath(next); nl.textContent = next.title; container.appendChild(nl); }
    if (!prev && !next) container.style.display = 'none';
  }

  /* ========== KaTeX ========== */
  function renderMath() {
    if (typeof renderMathInElement === 'undefined') return;
    try {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false, strict: false
      });
    } catch (e) { console.error('KaTeX:', e); }
  }

  /* ========== Reading Time ========== */
  function addReadingTime() {
    var body = document.querySelector('.article-body');
    var meta = document.querySelector('.article-meta');
    if (!body || !meta) return;
    var text = body.textContent || '';
    var chineseChars = (text.match(/[一-鿿]/g) || []).length;
    var words = text.split(/\s+/).length + chineseChars;
    var minutes = Math.max(1, Math.round(words / 400));
    var span = document.createElement('span');
    span.className = 'reading-time';
    span.textContent = '阅读约 ' + minutes + ' 分钟';
    meta.appendChild(span);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ========== Init ========== */
  function init() {
    try { initTheme(); } catch (e) { console.error(e); }
    try { initMobileNav(); } catch (e) { console.error(e); }
    try { initScrollProgress(); } catch (e) { console.error(e); }
    try { initParticles(); } catch (e) { console.error(e); }

    var path = window.location.pathname;

    // Homepage or article list
    if (path === '/' || path.indexOf('index.html') !== -1 || path.slice(-1) === '/') {
      var featuredGrid = document.querySelector('#featured-grid');
      var articleList = document.querySelector('#article-list');
      if (featuredGrid) {
        try {
          renderFeaturedArticles('#featured-grid');
        } catch (e) {
          console.error('renderFeaturedArticles error:', e);
          featuredGrid.innerHTML = '<p class="empty-state">文章加载失败，请刷新页面重试</p>';
        }
      }
      if (articleList && !featuredGrid) {
        try {
          renderArticleList('#article-list');
          renderCategoryFilters('#category-filters');
          initSearch();
        } catch (e) { console.error(e); }
      }
    }

    // Article pages
    var navEl = document.querySelector('#article-nav');
    if (navEl) {
      renderArticleNav('#article-nav', navEl.getAttribute('data-article-id'));
      addReadingTime();
    }

    // Scroll reveal
    initScrollReveal();

    // KaTeX
    if (typeof renderMathInElement !== 'undefined') {
      if (navEl) {
        renderMath();
      } else if (document.querySelector('#featured-grid')) {
        var observer = new MutationObserver(function (mutations, obs) {
          var grid = document.querySelector('#featured-grid');
          if (grid && grid.children.length > 0) {
            obs.disconnect();
            renderMath();
            initScrollReveal();
          }
        });
        var grid = document.querySelector('#featured-grid');
        if (grid) observer.observe(grid, { childList: true });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
