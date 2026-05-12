/**
 * 数学笔记 - 主脚本
 * 负责：主题切换、文章加载与渲染、KaTeX渲染、移动端导航
 */
(function () {
  'use strict';

  /* ========== Theme Manager ========== */
  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getSavedTheme() {
    try {
      return localStorage.getItem('theme');
    } catch (e) {
      return null;
    }
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
    try {
      localStorage.setItem('theme', next);
    } catch (e) { /* ignore */ }
  }

  function initTheme() {
    var saved = getSavedTheme();
    var theme = saved || getSystemTheme();
    applyTheme(theme);

    var btn = document.querySelector('.theme-toggle');
    if (btn) {
      btn.addEventListener('click', toggleTheme);
    }

    // 仅在用户未手动设置时跟随系统
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!getSavedTheme()) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  /* ========== Mobile Navigation ========== */
  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
      document.body.classList.toggle('nav-open');
    });

    // 点击导航链接后关闭菜单
    document.querySelectorAll('.site-nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
      });
    });
  }

  /* ========== Article Data Loader ========== */
  var articlesCache = null;

  function getBasePath() {
    var path = window.location.pathname;
    // 如果在 /articles/ 子目录下，返回 ../
    if (path.includes('/articles/')) {
      return '../';
    }
    return './';
  }

  async function fetchArticles() {
    if (articlesCache) return articlesCache;
    try {
      var resp = await fetch(getBasePath() + 'data/articles.json');
      if (!resp.ok) throw new Error('Failed to fetch articles');
      articlesCache = await resp.json();
      return articlesCache;
    } catch (err) {
      console.error('Failed to load articles:', err);
      return { articles: [], categories: [] };
    }
  }

  /* ========== Helpers ========== */
  function formatDate(isoString) {
    var d = new Date(isoString);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function getArticlePath(article) {
    var path = getBasePath();
    if (path === './') {
      return 'articles/' + article.file;
    }
    return article.file;
  }

  /* ========== Article Card Rendering ========== */
  function createArticleCard(article) {
    var card = document.createElement('div');
    card.className = 'article-card';
    card.innerHTML =
      '<span class="category-tag">' + escapeHtml(article.category) + '</span>' +
      '<h3><a href="' + getArticlePath(article) + '">' + escapeHtml(article.title) + '</a></h3>' +
      '<time datetime="' + article.date + '">' + formatDate(article.date) + '</time>' +
      '<p class="excerpt">' + escapeHtml(article.excerpt) + '</p>';
    return card;
  }

  /* ========== Render Featured Articles (Homepage) ========== */
  async function renderFeaturedArticles(containerSelector) {
    var container = document.querySelector(containerSelector);
    if (!container) return;

    var data = await fetchArticles();
    var featured = data.articles
      .filter(function (a) { return a.featured; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); })
      .slice(0, 6);

    if (featured.length === 0) {
      container.innerHTML = '<p class="empty-state">暂无精选文章</p>';
      return;
    }

    featured.forEach(function (article) {
      container.appendChild(createArticleCard(article));
    });
  }

  /* ========== Render Article List (Articles List Page) ========== */
  function renderArticleListItem(article) {
    var item = document.createElement('div');
    item.className = 'article-list-item';
    item.setAttribute('data-category', article.category);
    item.setAttribute('data-searchable', article.title + ' ' + article.excerpt + ' ' + article.tags.join(' '));
    item.innerHTML =
      '<div class="meta">' +
        '<time datetime="' + article.date + '">' + formatDate(article.date) + '</time>' +
        ' · <span class="category-chip active" style="cursor:default;font-size:0.8rem;">' + escapeHtml(article.category) + '</span>' +
      '</div>' +
      '<h3><a href="' + getArticlePath(article) + '">' + escapeHtml(article.title) + '</a></h3>' +
      '<p class="excerpt">' + escapeHtml(article.excerpt) + '</p>';
    return item;
  }

  async function renderArticleList(containerSelector) {
    var container = document.querySelector(containerSelector);
    if (!container) return;

    var data = await fetchArticles();
    var articles = data.articles.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });

    if (articles.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>还没有文章</p></div>';
      return;
    }

    articles.forEach(function (article) {
      container.appendChild(renderArticleListItem(article));
    });

    // 存储文章数据以便筛选
    container._articlesData = articles;
  }

  /* ========== Render Category Filters ========== */
  async function renderCategoryFilters(containerSelector) {
    var container = document.querySelector(containerSelector);
    if (!container) return;

    var data = await fetchArticles();
    var categories = data.categories;

    // "全部" 按钮
    var allChip = document.createElement('button');
    allChip.className = 'category-chip active';
    allChip.textContent = '全部';
    allChip.addEventListener('click', function () {
      filterArticles(null, containerSelector);
    });
    container.appendChild(allChip);

    categories.forEach(function (cat) {
      var chip = document.createElement('button');
      chip.className = 'category-chip';
      chip.textContent = cat;
      chip.addEventListener('click', function () {
        filterArticles(cat, containerSelector);
      });
      container.appendChild(chip);
    });
  }

  function filterArticles(category) {
    // 更新激活状态
    document.querySelectorAll('.category-chip').forEach(function (chip) {
      chip.classList.toggle('active', chip.textContent === (category || '全部'));
    });

    // 筛选文章
    var listContainer = document.querySelector('#article-list');
    if (!listContainer) return;

    var articles = listContainer._articlesData || [];
    var searchTerm = (document.querySelector('#search-input') || {}).value || '';

    renderFilteredArticles(listContainer, articles, category, searchTerm);
  }

  function renderFilteredArticles(container, articles, category, searchTerm) {
    container.innerHTML = '';

    var filtered = articles.filter(function (a) {
      var matchCat = !category || a.category === category;
      var matchSearch = !searchTerm ||
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.tags.some(function (t) { return t.toLowerCase().includes(searchTerm.toLowerCase()); });
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>没有找到匹配的文章</p></div>';
      return;
    }

    filtered.forEach(function (article) {
      container.appendChild(renderArticleListItem(article));
    });
  }

  /* ========== Search Handler ========== */
  function initSearch() {
    var searchInput = document.querySelector('#search-input');
    if (!searchInput) return;

    var debounceTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        var listContainer = document.querySelector('#article-list');
        if (!listContainer) return;
        var articles = listContainer._articlesData || [];
        var activeCat = document.querySelector('.category-chip.active');
        var category = activeCat && activeCat.textContent !== '全部' ? activeCat.textContent : null;
        renderFilteredArticles(listContainer, articles, category, searchInput.value);
      }, 250);
    });
  }

  /* ========== Article Navigation (Prev/Next) ========== */
  async function renderArticleNav(containerSelector, currentArticleId) {
    var container = document.querySelector(containerSelector);
    if (!container || !currentArticleId) return;

    var data = await fetchArticles();
    var articles = data.articles.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });

    var currentIndex = -1;
    for (var i = 0; i < articles.length; i++) {
      if (articles[i].id === currentArticleId) {
        currentIndex = i;
        break;
      }
    }

    if (currentIndex === -1) return;

    var prevArticle = articles[currentIndex + 1] || null;  // 日期更早
    var nextArticle = articles[currentIndex - 1] || null;  // 日期更新

    container.innerHTML = '';

    if (prevArticle) {
      var prevLink = document.createElement('a');
      prevLink.className = 'prev';
      prevLink.href = getArticlePath(prevArticle);
      prevLink.textContent = prevArticle.title;
      container.appendChild(prevLink);
    }

    if (nextArticle) {
      var nextLink = document.createElement('a');
      nextLink.className = 'next';
      nextLink.href = getArticlePath(nextArticle);
      nextLink.textContent = nextArticle.title;
      container.appendChild(nextLink);
    }

    if (!prevArticle && !nextArticle) {
      container.style.display = 'none';
    }
  }

  /* ========== KaTeX Rendering ========== */
  function renderMath() {
    if (typeof renderMathInElement === 'undefined') {
      return;
    }
    try {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false,
        strict: false
      });
    } catch (e) {
      console.error('KaTeX render error:', e);
    }
  }

  /* ========== Escape HTML ========== */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ========== Initialization ========== */
  function init() {
    initTheme();
    initMobileNav();

    var path = window.location.pathname;

    // 首页：渲染精选文章
    if (path === '/' || path.endsWith('index.html') || path.endsWith('/')) {
      var featuredGrid = document.querySelector('#featured-grid');
      var articleList = document.querySelector('#article-list');

      if (featuredGrid) {
        renderFeaturedArticles('#featured-grid');
      }

      if (articleList && !featuredGrid) {
        // 文章列表页
        renderArticleList('#article-list');
        renderCategoryFilters('#category-filters');
        initSearch();
      }
    }

    // 文章详情页
    var articleNavEl = document.querySelector('#article-nav');
    if (articleNavEl) {
      var articleId = articleNavEl.getAttribute('data-article-id');
      renderArticleNav('#article-nav', articleId);
    }

    // KaTeX 渲染（文章详情页直接渲染，首页等待动态内容）
    if (typeof renderMathInElement !== 'undefined') {
      if (articleNavEl) {
        // 文章详情页：直接渲染
        renderMath();
      } else if (document.querySelector('#featured-grid')) {
        // 首页：等待精选文章渲染后再渲染数学公式
        var observer = new MutationObserver(function (mutations, obs) {
          var grid = document.querySelector('#featured-grid');
          if (grid && grid.children.length > 0) {
            obs.disconnect();
            renderMath();
          }
        });
        var grid = document.querySelector('#featured-grid');
        if (grid) {
          observer.observe(grid, { childList: true });
        }
      }
    }
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
