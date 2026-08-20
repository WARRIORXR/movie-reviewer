/* ======================================================
   CineScope — Modern Movie Reviewer & Intelligence Platform
   Frontend Application Logic (Interactive Engine)
   ====================================================== */

const API_BASE = '';

// ── Application State ─────────────────────────────────
let activeGenre = 'all';
let searchDebounceTimer = null;
let navSearchDebounceTimer = null;
let currentSearchQuery = '';
let currentMovieData = null;
let userSelectedStarRating = 10;

// Watchlist State (Persisted in localStorage)
let watchlist = JSON.parse(localStorage.getItem('cinescope_watchlist') || '[]');
// User Submitted Reviews (Persisted in localStorage)
let localReviews = JSON.parse(localStorage.getItem('cinescope_user_reviews') || '{}');

// ═══════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme (Dark by default, restore preference)
    initTheme();

    // 2. Initialize Floating Background Particles
    createHeroParticles();

    // 3. Update Watchlist Badge
    updateWatchlistBadge();

    // 4. Load Initial Categories (Trending, Top-Rated, Upcoming, Now-Playing)
    loadAllCategories();

    // 5. Setup Search Event Listeners
    setupSearchListeners();

    // 6. Setup Global Keyboard Shortcuts
    setupKeyboardShortcuts();
});

// ═══════════════════════════════════════════════════════
//  THEME TOGGLE (Dark / Light Mode)
// ═══════════════════════════════════════════════════════

function initTheme() {
    const savedTheme = localStorage.getItem('cinescope_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('cinescope_theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme.toUpperCase()} mode`);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

// ═══════════════════════════════════════════════════════
//  HERO PARTICLES
// ═══════════════════════════════════════════════════════

function createHeroParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;
    const colors = ['#7c5cfc', '#a855f7', '#ec4899', '#06b6d4', '#3b82f6'];
    for (let i = 0; i < 28; i++) {
        const p = document.createElement('div');
        p.className = 'hero-particle';
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDelay = `${Math.random() * 7}s`;
        p.style.animationDuration = `${5 + Math.random() * 6}s`;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        const size = 3 + Math.random() * 4;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        container.appendChild(p);
    }
}

// ═══════════════════════════════════════════════════════
//  API FETCH HELPER
// ═══════════════════════════════════════════════════════

async function apiFetch(endpoint) {
    try {
        const res = await fetch(API_BASE + endpoint);
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`API Fetch Error on ${endpoint}:`, err);
        throw err;
    }
}

// ═══════════════════════════════════════════════════════
//  LOAD CATEGORIES
// ═══════════════════════════════════════════════════════

async function loadAllCategories() {
    try {
        const [trending, topRated, upcoming, nowPlaying] = await Promise.all([
            apiFetch('/api/trending'),
            apiFetch('/api/top-rated'),
            apiFetch('/api/upcoming'),
            apiFetch('/api/now-playing')
        ]);

        renderMovieScroll(trending.results, 'trending-grid');
        renderMovieScroll(topRated.results, 'top-rated-grid');
        renderMovieScroll(upcoming.results, 'upcoming-grid');
        renderMovieScroll(nowPlaying.results, 'now-playing-grid');
    } catch (err) {
        console.warn('Initial categories loading fallback:', err);
    }
}

// ═══════════════════════════════════════════════════════
//  SEARCH & SUGGESTIONS
// ═══════════════════════════════════════════════════════

function setupSearchListeners() {
    const heroInput = document.getElementById('search-input');
    const heroClear = document.getElementById('search-clear');
    const navInput = document.getElementById('nav-search-input');

    if (heroInput) {
        heroInput.addEventListener('input', e => {
            const val = e.target.value;
            if (heroClear) heroClear.classList.toggle('hidden', !val);
            handleSearchInput(val, 'search-suggestions');
        });
        heroInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') triggerSearch();
        });
    }

    if (navInput) {
        navInput.addEventListener('input', e => {
            handleSearchInput(e.target.value, 'nav-suggestions');
        });
        navInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                heroInput.value = navInput.value;
                triggerSearch();
            }
        });
    }

    // Close suggestions dropdown when clicking outside
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-container') && !e.target.closest('.nav-search-wrapper')) {
            closeSuggestions();
        }
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    });
}

function handleSearchInput(query, suggestionsId) {
    clearTimeout(searchDebounceTimer);
    const q = query.trim();
    if (q.length < 2) {
        const el = document.getElementById(suggestionsId);
        if (el) el.classList.add('hidden');
        return;
    }
    searchDebounceTimer = setTimeout(() => fetchSuggestions(q, suggestionsId), 250);
}

async function fetchSuggestions(query, suggestionsId) {
    try {
        const data = await apiFetch(`/api/search?q=${encodeURIComponent(query)}&page=1`);
        const container = document.getElementById(suggestionsId);
        if (!container) return;

        if (!data.results || !data.results.length) {
            container.classList.add('hidden');
            return;
        }

        container.innerHTML = data.results.slice(0, 6).map(m => `
            <div class="suggestion-item" onclick="openMovieDetail('${escAttr(m.title)}', ${m.id || 0})">
                <img class="suggestion-poster" src="${getPosterSrc(m.poster_path, m.title)}" alt="${esc(m.title)}" loading="lazy">
                <div class="suggestion-info">
                    <div class="suggestion-title">${esc(m.title)}</div>
                    <div class="suggestion-meta">
                        <span>📅 ${m.release_date ? m.release_date.substring(0, 4) : 'TBA'}</span> &bull;
                        <span>${(m.genres || []).slice(0, 2).join(', ')}</span>
                    </div>
                </div>
                <div class="suggestion-rating">⭐ ${m.vote_average ? Number(m.vote_average).toFixed(1) : '—'}</div>
            </div>
        `).join('');
        container.classList.remove('hidden');
    } catch (err) {
        console.error('Suggestions error:', err);
    }
}

function clearSearchInput() {
    const heroInput = document.getElementById('search-input');
    const heroClear = document.getElementById('search-clear');
    if (heroInput) heroInput.value = '';
    if (heroClear) heroClear.classList.add('hidden');
    closeSuggestions();
}

function quickSearch(title) {
    const heroInput = document.getElementById('search-input');
    if (heroInput) heroInput.value = title;
    triggerSearch();
}

function triggerSearch() {
    const heroInput = document.getElementById('search-input');
    const navInput = document.getElementById('nav-search-input');
    const query = (heroInput?.value || navInput?.value || '').trim();

    closeSuggestions();
    currentSearchQuery = query;
    applyFilters(1);
}

// ═══════════════════════════════════════════════════════
//  FILTER & SORT SYSTEM
// ═══════════════════════════════════════════════════════

function setGenreFilter(genre, buttonEl) {
    activeGenre = genre;
    document.querySelectorAll('.genre-pill').forEach(btn => btn.classList.remove('active'));
    if (buttonEl) buttonEl.classList.add('active');
    applyFilters(1);
}

async function applyFilters(page = 1) {
    const yearSelect = document.getElementById('filter-year');
    const ratingSelect = document.getElementById('filter-rating');
    const langSelect = document.getElementById('filter-lang');
    const sortSelect = document.getElementById('filter-sort');

    const yearVal = yearSelect ? yearSelect.value : 'all';
    const ratingVal = ratingSelect ? ratingSelect.value : '0';
    const langVal = langSelect ? langSelect.value : 'all';
    const sortVal = sortSelect ? sortSelect.value : 'popularity';

    updateActiveFilterChips(currentSearchQuery, activeGenre, yearVal, ratingVal, langVal, sortVal);

    showLoading();

    const queryParams = new URLSearchParams({
        q: currentSearchQuery,
        genre: activeGenre,
        year: yearVal,
        rating: ratingVal,
        lang: langVal,
        sort: sortVal,
        page: page
    });

    try {
        const data = await apiFetch(`/api/search?${queryParams.toString()}`);

        const resultsTitle = document.getElementById('results-title');
        const resultsSubtitle = document.getElementById('results-subtitle');

        let titleText = 'Search & Filter Results';
        if (currentSearchQuery) {
            titleText = `Results for "${currentSearchQuery}"`;
        } else if (activeGenre !== 'all') {
            titleText = `${activeGenre} Movies`;
        }
        if (resultsTitle) resultsTitle.textContent = titleText;
        if (resultsSubtitle) resultsSubtitle.textContent = `Found ${data.total_results || 0} movie${data.total_results === 1 ? '' : 's'}`;

        renderMovieGrid(data.results, 'results-grid');
        renderPagination(page, data.total_pages);
        showResultsSection();
    } catch (err) {
        showToast('Search encountered an error. Showing cached results.');
    } finally {
        hideLoading();
    }
}

function updateActiveFilterChips(q, genre, year, rating, lang, sort) {
    const bar = document.getElementById('active-filters-bar');
    const list = document.getElementById('active-tags-list');
    if (!bar || !list) return;

    const chips = [];
    if (q) chips.push({ label: `"${q}"`, type: 'query' });
    if (genre && genre !== 'all') chips.push({ label: `Genre: ${genre}`, type: 'genre' });
    if (year && year !== 'all') chips.push({ label: `Year: ${year}`, type: 'year' });
    if (rating && rating !== '0') chips.push({ label: `Rating: ${rating}+ ⭐`, type: 'rating' });
    if (lang && lang !== 'all') chips.push({ label: `Lang: ${lang.toUpperCase()}`, type: 'lang' });

    if (chips.length > 0) {
        bar.classList.remove('hidden');
        list.innerHTML = chips.map(c => `
            <span class="active-tag">
                ${esc(c.label)}
                <span class="active-tag-remove" onclick="removeFilter('${c.type}')">✕</span>
            </span>
        `).join('');
    } else {
        bar.classList.add('hidden');
    }
}

function removeFilter(type) {
    if (type === 'query') {
        currentSearchQuery = '';
        const heroInput = document.getElementById('search-input');
        if (heroInput) heroInput.value = '';
    } else if (type === 'genre') {
        setGenreFilter('all', document.querySelector('.genre-pill[data-genre="all"]'));
        return;
    } else if (type === 'year') {
        const el = document.getElementById('filter-year');
        if (el) el.value = 'all';
    } else if (type === 'rating') {
        const el = document.getElementById('filter-rating');
        if (el) el.value = '0';
    } else if (type === 'lang') {
        const el = document.getElementById('filter-lang');
        if (el) el.value = 'all';
    }
    applyFilters(1);
}

function resetAllFilters() {
    currentSearchQuery = '';
    activeGenre = 'all';

    const heroInput = document.getElementById('search-input');
    const navInput = document.getElementById('nav-search-input');
    const yearSelect = document.getElementById('filter-year');
    const ratingSelect = document.getElementById('filter-rating');
    const langSelect = document.getElementById('filter-lang');
    const sortSelect = document.getElementById('filter-sort');

    if (heroInput) heroInput.value = '';
    if (navInput) navInput.value = '';
    if (yearSelect) yearSelect.value = 'all';
    if (ratingSelect) ratingSelect.value = '0';
    if (langSelect) langSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'popularity';

    document.querySelectorAll('.genre-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.genre === 'all');
    });

    applyFilters(1);
    showToast('Filters reset to default');
}

// ═══════════════════════════════════════════════════════
//  CATEGORIES & NAVIGATION
// ═══════════════════════════════════════════════════════

async function showCategory(cat) {
    showLoading();
    try {
        const data = await apiFetch(`/api/${cat}`);
        const titles = {
            'trending': '🔥 Trending Blockbusters',
            'top-rated': '⭐ All-Time Highest Rated',
            'upcoming': '🎬 Anticipated Upcoming Releases',
            'now-playing': '🍿 Now Playing in Theaters & Streaming'
        };
        const titleEl = document.getElementById('results-title');
        const subtitleEl = document.getElementById('results-subtitle');

        if (titleEl) titleEl.textContent = titles[cat] || cat.toUpperCase();
        if (subtitleEl) subtitleEl.textContent = `Curated collection of ${data.results?.length || 0} movies`;

        renderMovieGrid(data.results, 'results-grid');
        const pagination = document.getElementById('pagination');
        if (pagination) pagination.classList.add('hidden');
        showResultsSection();
    } catch (err) {
        showToast('Failed to load category');
    } finally {
        hideLoading();
    }
}

function showResultsSection() {
    document.getElementById('trending-section')?.classList.add('hidden');
    document.getElementById('top-rated-section')?.classList.add('hidden');
    document.getElementById('upcoming-section')?.classList.add('hidden');
    document.getElementById('now-playing-section')?.classList.add('hidden');
    document.getElementById('results-section')?.classList.remove('hidden');

    document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
}

function goHome() {
    document.getElementById('results-section')?.classList.add('hidden');
    document.getElementById('trending-section')?.classList.remove('hidden');
    document.getElementById('top-rated-section')?.classList.remove('hidden');
    document.getElementById('upcoming-section')?.classList.remove('hidden');
    document.getElementById('now-playing-section')?.classList.remove('hidden');

    currentSearchQuery = '';
    const heroInput = document.getElementById('search-input');
    const navInput = document.getElementById('nav-search-input');
    if (heroInput) heroInput.value = '';
    if (navInput) navInput.value = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollCarousel(elementId, distance) {
    const el = document.getElementById(elementId);
    if (el) el.scrollBy({ left: distance, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════
//  POSTER GENERATOR & FORMATTERS
// ═══════════════════════════════════════════════════════

function getPosterSrc(posterPath, title) {
    if (posterPath && posterPath.startsWith('http')) return posterPath;
    const cleanTitle = (title || 'Movie').replace(/["'<>]/g, '');
    const shortTitle = cleanTitle.length > 22 ? cleanTitle.substring(0, 19) + '...' : cleanTitle;
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23141424"/><stop offset="50%" stop-color="%231e1a38"/><stop offset="100%" stop-color="%230c0c16"/></linearGradient><linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%237c5cfc"/><stop offset="100%" stop-color="%23ec4899"/></linearGradient></defs><rect width="300" height="450" fill="url(%23g)" rx="14"/><circle cx="150" cy="180" r="50" fill="url(%23a)" opacity="0.18"/><text x="150" y="195" font-family="sans-serif" font-size="44" text-anchor="middle">🎬</text><rect x="35" y="315" width="230" height="2" fill="url(%23a)" opacity="0.45"/><text x="150" y="355" font-family="system-ui, sans-serif" font-size="17" font-weight="800" fill="%23f3f3f8" text-anchor="middle">${encodeURIComponent(shortTitle)}</text><text x="150" y="385" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="%23a855f7" text-anchor="middle">✨ CineScope PRO</text></svg>`;
}

function getRatingColor(rating) {
    const r = parseFloat(rating) || 0;
    if (r >= 8.0) return 'var(--green)';
    if (r >= 6.5) return 'var(--yellow)';
    return 'var(--orange)';
}

function formatCurrency(amount) {
    if (!amount) return 'N/A';
    if (amount >= 1e9) return '$' + (amount / 1e9).toFixed(2) + 'B';
    if (amount >= 1e6) return '$' + (amount / 1e6).toFixed(1) + 'M';
    if (amount >= 1e3) return '$' + (amount / 1e3).toFixed(0) + 'K';
    return '$' + amount.toLocaleString();
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function escAttr(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════════
//  MOVIE CARD HTML GENERATOR
// ═══════════════════════════════════════════════════════

function movieCardHTML(m, index = 0) {
    const posterUrl = getPosterSrc(m.poster_path, m.title);
    const isFav = isInWatchlist(m.id || m.title);
    const genresText = Array.isArray(m.genres)
        ? m.genres.map(g => typeof g === 'string' ? g : g.name).slice(0, 2).join(' &bull; ')
        : '';

    return `
        <div class="movie-card" onclick="openMovieDetail('${escAttr(m.title)}', ${m.id || 0})" style="animation-delay: ${index * 0.04}s">
            <div class="poster-wrapper">
                <img class="poster" src="${posterUrl}" alt="${esc(m.title)}" loading="lazy">
                <div class="card-rating" style="color: ${getRatingColor(m.vote_average)}">
                    ⭐ ${m.vote_average ? Number(m.vote_average).toFixed(1) : '—'}
                </div>
                <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleWatchlistCard(event, '${escAttr(m.title)}', ${m.id || 0})" title="${isFav ? 'Remove from Watchlist' : 'Add to Watchlist'}" aria-label="Toggle Watchlist">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <div class="poster-overlay">
                    <span>View Movie →</span>
                </div>
            </div>
            <div class="card-body">
                <div class="card-title" title="${esc(m.title)}">${esc(m.title)}</div>
                <div class="card-meta">
                    <span>📅 ${m.release_date ? m.release_date.substring(0, 4) : 'TBA'}</span>
                    <span>${m.runtime ? Math.floor(m.runtime / 60) + 'h ' + (m.runtime % 60) + 'm' : 'Feature'}</span>
                </div>
                ${genresText ? `<div class="card-genres">${genresText}</div>` : ''}
            </div>
        </div>
    `;
}

function renderMovieGrid(movies, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!movies || !movies.length) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 12px;">🎬</div>
                <h3 style="font-size: 20px; font-weight: 800; color: var(--text-primary);">No movies found</h3>
                <p style="color: var(--text-muted); margin-top: 6px;">Try adjusting your filters or searching for another title.</p>
                <button class="btn-action trailer-btn" onclick="resetAllFilters()" style="margin: 20px auto 0; width: auto;">Reset All Filters</button>
            </div>
        `;
        return;
    }
    container.innerHTML = movies.map((m, i) => movieCardHTML(m, i)).join('');
}

function renderMovieScroll(movies, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = (movies || []).map((m, i) => movieCardHTML(m, i)).join('');
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container) return;
    if (!total || total <= 1) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');

    const maxShow = 5;
    let start = Math.max(1, current - Math.floor(maxShow / 2));
    let end = Math.min(total, start + maxShow - 1);
    if (end - start < maxShow - 1) start = Math.max(1, end - maxShow + 1);

    let html = `<button ${current === 1 ? 'disabled' : ''} onclick="applyFilters(${current - 1})">← Prev</button>`;
    for (let i = start; i <= end; i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="applyFilters(${i})">${i}</button>`;
    }
    html += `<button ${current >= total ? 'disabled' : ''} onclick="applyFilters(${current + 1})">Next →</button>`;
    container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════
//  MOVIE DETAIL MODAL
// ═══════════════════════════════════════════════════════

async function openMovieDetail(movieTitleOrIdent, movieId = 0) {
    showLoading();
    closeSuggestions();

    try {
        const queryParam = encodeURIComponent(movieTitleOrIdent);
        const movie = await apiFetch(`/api/movie/${queryParam}?title=${queryParam}`);
        currentMovieData = movie;
        renderMovieModal(movie);
    } catch (err) {
        showToast('Failed to retrieve full movie details.');
    } finally {
        hideLoading();
    }
}

function renderMovieModal(m) {
    const modal = document.getElementById('movie-modal');
    const body = document.getElementById('modal-body');
    if (!modal || !body) return;

    document.body.style.overflow = 'hidden';

    // Financial calculations
    const profit = (m.revenue && m.budget) ? m.revenue - m.budget : null;
    const roi = (profit && m.budget) ? ((profit / m.budget) * 100).toFixed(0) : null;

    // Posters & Backdrops
    const posterSrc = getPosterSrc(m.poster_path, m.title);
    const backdropSrc = (m.backdrop_path && m.backdrop_path.startsWith('http')) ? m.backdrop_path : posterSrc;

    // Watchlist check
    const isFav = isInWatchlist(m.id || m.title);

    // Trailers
    const trailers = m.youtube_trailers || [
        { title: "Official Trailer", video_id: "YoHD9XEInc0", type: "Trailer" }
    ];
    const initialVideoId = trailers[0]?.video_id || "YoHD9XEInc0";

    // Streaming
    const streamSources = m.watch_providers?.sources || [
        { name: "Netflix", type: "Subscription", web_url: "https://www.netflix.com" },
        { name: "Amazon Prime Video", type: "Rent / Buy", web_url: "https://www.amazon.com", price: "3.99" },
        { name: "Apple TV", type: "Rent / Buy", web_url: "https://tv.apple.com", price: "3.99" }
    ];

    // Reviews (Merge API reviews with locally submitted reviews)
    const localMovieReviews = localReviews[m.id || m.title] || [];
    const allReviews = [...localMovieReviews, ...(m.reviews || [])];

    body.innerHTML = `
        <!-- BACKDROP BANNER -->
        <div class="detail-backdrop-banner">
            <img class="detail-backdrop-img" src="${backdropSrc}" alt="${esc(m.title)} backdrop">
            <div class="detail-backdrop-mask"></div>
        </div>

        <!-- HEADER CONTENT -->
        <div class="detail-header-wrap">
            <div class="detail-poster-col">
                <img class="detail-poster-img" src="${posterSrc}" alt="${esc(m.title)}">
                <div class="modal-action-buttons">
                    <button class="btn-action trailer-btn" onclick="scrollToTrailer()">
                        <span>▶ Watch Official Trailer</span>
                    </button>
                    <button class="btn-action watchlist-toggle-btn ${isFav ? 'active' : ''}" id="modal-watchlist-btn" onclick="toggleWatchlistCurrent()">
                        <span>${isFav ? '❤️ In Watchlist' : '🤍 Add to Watchlist'}</span>
                    </button>
                    <button class="btn-action share-btn-open" onclick="openShareModal()">
                        <span>📤 Share Movie</span>
                    </button>
                </div>
            </div>

            <div class="detail-info-col">
                <h1 class="detail-title">${esc(m.title)}</h1>
                ${m.tagline ? `<div class="detail-tagline">"${esc(m.tagline)}"</div>` : ''}

                <div class="detail-meta-pills">
                    ${m.release_date ? `<span class="meta-pill">📅 ${m.release_date}</span>` : ''}
                    ${m.runtime ? `<span class="meta-pill">⏱️ ${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m</span>` : ''}
                    ${m.certification ? `<span class="meta-pill cert">🎫 ${esc(m.certification)}</span>` : ''}
                    ${m.original_language ? `<span class="meta-pill">🌐 ${m.original_language.toUpperCase()}</span>` : ''}
                    ${m.country ? `<span class="meta-pill">📍 ${esc(m.country)}</span>` : ''}
                    ${m.imdb_id ? `<a href="https://www.imdb.com/title/${m.imdb_id}" target="_blank" class="meta-pill imdb-link">IMDb ↗</a>` : ''}
                </div>

                <div class="detail-genre-tags">
                    ${(m.genres || []).map(g => {
                        const gName = typeof g === 'string' ? g : g.name;
                        return `<span class="detail-genre-tag" onclick="filterByGenreDirect('${escAttr(gName)}')">${esc(gName)}</span>`;
                    }).join('')}
                </div>

                ${m.overview ? `<p class="detail-overview">${esc(m.overview)}</p>` : ''}

                <!-- RATINGS SHOWCASE -->
                <div class="ratings-showcase-grid">
                    ${(m.ratings || []).map(r => `
                        <div class="rating-card-item">
                            <div class="rating-source-badge ${r.icon || 'imdb'}">
                                ${r.icon === 'imdb' ? 'IMDb' : r.icon === 'rt' ? '🍅' : r.icon === 'metacritic' ? 'MC' : '✨'}
                            </div>
                            <div class="rating-details">
                                <div class="label">${esc(r.source)}</div>
                                <div class="score">${esc(r.value)}</div>
                                ${r.icon === 'imdb' ? renderStarsBar(r.score) : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- MODAL BODY SECTIONS -->
        <div class="modal-sections-body">

            <!-- EMBEDDED YOUTUBE TRAILER PLAYER -->
            <div class="detail-section" id="trailer-section">
                <h3 class="detail-section-title">🎥 Official YouTube Trailer & Clips</h3>
                <div class="video-player-container">
                    <div class="video-iframe-wrapper">
                        <iframe id="youtube-iframe-player" src="https://www.youtube-nocookie.com/embed/${initialVideoId}?autoplay=0&rel=0" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                    <div class="video-tabs-bar">
                        ${trailers.map((v, i) => `
                            <button class="video-tab-btn ${i === 0 ? 'active' : ''}" onclick="switchTrailerVideo('${v.video_id}', this)">
                                🎬 ${esc(v.title || 'Clip')}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- FINANCIALS & BOX OFFICE -->
            ${(m.budget || m.revenue || m.domestic_box_office) ? `
            <div class="detail-section">
                <h3 class="detail-section-title">💰 Box Office & Financial Metrics</h3>
                <div class="finance-grid">
                    ${m.budget ? `<div class="finance-card"><div class="label">Production Budget</div><div class="value blue">${formatCurrency(m.budget)}</div></div>` : ''}
                    ${m.revenue ? `<div class="finance-card"><div class="label">Worldwide Box Office</div><div class="value green">${formatCurrency(m.revenue)}</div></div>` : ''}
                    ${profit !== null ? `<div class="finance-card"><div class="label">Net Profit / Loss</div><div class="value ${profit >= 0 ? 'green' : 'red'}">${profit >= 0 ? '+' : ''}${formatCurrency(profit)}</div>${roi ? `<div class="roi-tag">${roi}% Return on Investment</div>` : ''}</div>` : ''}
                    ${m.domestic_box_office ? `<div class="finance-card"><div class="label">Domestic US Gross</div><div class="value">${esc(m.domestic_box_office)}</div></div>` : ''}
                </div>
            </div>` : ''}

            <!-- WHERE TO STREAM -->
            <div class="detail-section">
                <h3 class="detail-section-title">📺 Where to Watch / Streaming Availability</h3>
                <div class="streaming-grid">
                    ${streamSources.map(s => `
                        <a href="${s.web_url || `https://www.google.com/search?q=watch+${encodeURIComponent(m.title)}`}" target="_blank" class="stream-chip" title="Watch on ${esc(s.name)}">
                            <span class="stream-icon">📺</span>
                            <div class="stream-info">
                                <div class="stream-name">${esc(s.name)}</div>
                                <div class="stream-type">${esc(s.type || 'Stream')}${s.price ? ` ($${s.price})` : ''}</div>
                            </div>
                        </a>
                    `).join('')}
                </div>
            </div>

            <!-- CAST & CREW -->
            ${(m.cast && m.cast.length) ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎭 Cast & Performers (Click to explore)</h3>
                <div class="cast-scroll">
                    ${m.cast.map(c => `
                        <div class="cast-card" onclick="openPersonModal('${escAttr(c.name)}')">
                            <div class="cast-avatar-fallback">${esc(c.name.charAt(0))}</div>
                            <div class="cast-name">${esc(c.name)}</div>
                            <div class="cast-character">${esc(c.character || 'Cast')}</div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- KEY CREW -->
            ${m.crew?.directors?.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎬 Key Crew</h3>
                <div class="crew-grid">
                    ${(m.crew.directors || []).map(c => `<div class="crew-item" onclick="openPersonModal('${escAttr(c.name)}')"><div class="crew-name">${esc(c.name)}</div><div class="crew-job">Director</div></div>`).join('')}
                    ${(m.crew.writers || []).map(c => `<div class="crew-item" onclick="openPersonModal('${escAttr(c.name)}')"><div class="crew-name">${esc(c.name)}</div><div class="crew-job">Writer</div></div>`).join('')}
                    ${(m.crew.composers || []).map(c => `<div class="crew-item" onclick="openPersonModal('${escAttr(c.name)}')"><div class="crew-name">${esc(c.name)}</div><div class="crew-job">Composer</div></div>`).join('')}
                </div>
            </div>` : ''}

            <!-- AI CRITICAL ANALYSIS (Gemini) -->
            ${m.ai_analysis ? `
            <div class="detail-section">
                <h3 class="detail-section-title">✨ AI Critical Intelligence Breakdown</h3>
                <div class="ai-analysis-box">
                    <div class="ai-verdict-banner">
                        <div class="ai-verdict-text">
                            <div class="label">AI Definitive Verdict</div>
                            <div class="verdict">${esc(m.ai_analysis.verdict)}</div>
                        </div>
                        <div class="ai-score-badge-circle">
                            <span class="ai-score-num">${m.ai_analysis.score || '9.0'}</span>
                            <span class="ai-score-max">/ 10</span>
                        </div>
                    </div>

                    ${m.ai_analysis.one_liner ? `<div class="ai-quote-box">"${esc(m.ai_analysis.one_liner)}"</div>` : ''}

                    <div class="ai-pros-cons-grid">
                        ${m.ai_analysis.strengths?.length ? `
                        <div class="ai-column">
                            <div class="ai-column-title" style="color:var(--green)">✅ Cinematic Strengths</div>
                            <ul>${m.ai_analysis.strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
                        </div>` : ''}

                        ${m.ai_analysis.weaknesses?.length ? `
                        <div class="ai-column">
                            <div class="ai-column-title" style="color:var(--orange)">⚠️ Considerations</div>
                            <ul>${m.ai_analysis.weaknesses.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
                        </div>` : ''}
                    </div>

                    ${m.ai_analysis.fun_facts?.length ? `
                    <div class="ai-trivia-list">
                        <div class="label" style="font-size:12px;font-weight:800;color:var(--accent-secondary);text-transform:uppercase;">💡 Production Trivia & Fun Facts</div>
                        ${m.ai_analysis.fun_facts.map(f => `<div class="ai-trivia-item">• ${esc(f)}</div>`).join('')}
                    </div>` : ''}
                </div>
            </div>` : ''}

            <!-- USER REVIEWS SECTION (Interactive Submit + List) -->
            <div class="detail-section">
                <h3 class="detail-section-title">📝 Community & Critic Reviews</h3>
                <div class="reviews-container">
                    <!-- Add Review Form -->
                    <div class="add-review-card">
                        <div class="add-review-title">✍️ Write Your Review for "${esc(m.title)}"</div>
                        <div class="star-picker-wrap">
                            <span class="star-picker-label">Your Rating:</span>
                            <div class="star-picker-stars" id="star-picker">
                                ${[1,2,3,4,5,6,7,8,9,10].map(star => `
                                    <span class="star-pick active" data-star="${star}" onclick="setReviewRating(${star})" onmouseover="hoverReviewRating(${star})" onmouseout="resetHoverReviewRating()">★</span>
                                `).join('')}
                            </div>
                            <span class="star-score-display" id="star-score-display">10 / 10</span>
                        </div>

                        <div class="review-inputs-grid">
                            <input type="text" id="review-author-input" class="review-input-name" placeholder="Your Name or Handle (e.g. CinemaLover)" autocomplete="off">
                            <textarea id="review-content-input" class="review-input-text" placeholder="Share your thoughts about the direction, cast performances, soundtrack, and pacing..."></textarea>
                            <button class="review-submit-btn" onclick="submitUserReview()">Post Review</button>
                        </div>
                    </div>

                    <!-- Reviews List -->
                    <div class="reviews-list" id="modal-reviews-list">
                        ${allReviews.map(r => `
                            <div class="review-card">
                                <div class="review-header">
                                    <div class="review-avatar">${esc(r.author?.charAt(0).toUpperCase() || 'U')}</div>
                                    <div>
                                        <div class="review-author">${esc(r.author || 'Verified User')}</div>
                                        <div class="review-date">${esc(r.created_at || 'Recently')}</div>
                                    </div>
                                    ${r.author_details?.rating ? `<div class="review-rating-badge">⭐ ${r.author_details.rating}/10</div>` : ''}
                                </div>
                                <div class="review-content">${esc(r.content).replace(/\n/g, '<br>')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- SIMILAR RECOMMENDATIONS -->
            ${m.similar?.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎞️ Similar Recommended Movies</h3>
                <div class="movie-scroll">
                    ${m.similar.map((s, i) => movieCardHTML(s, i)).join('')}
                </div>
            </div>` : ''}

        </div>
    `;

    modal.classList.remove('hidden');
    modal.scrollTop = 0;
}

function renderStarsBar(score) {
    const s = parseFloat(score) || 0;
    const filledStars = Math.round(s / 2);
    let starsStr = '';
    for (let i = 1; i <= 5; i++) {
        starsStr += i <= filledStars ? '★' : '☆';
    }
    return `<div class="star-rating-bar">${starsStr}</div>`;
}

function switchTrailerVideo(videoId, btnEl) {
    const iframe = document.getElementById('youtube-iframe-player');
    if (iframe) {
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    document.querySelectorAll('.video-tab-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
}

function scrollToTrailer() {
    const el = document.getElementById('trailer-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function filterByGenreDirect(genreName) {
    closeModal();
    setGenreFilter(genreName, document.querySelector(`.genre-pill[data-genre="${genreName}"]`));
}

function closeModal() {
    const modal = document.getElementById('movie-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════════════
//  REVIEW SUBMISSION SYSTEM
// ═══════════════════════════════════════════════════════

function setReviewRating(star) {
    userSelectedStarRating = star;
    updateStarUI(star);
}

function hoverReviewRating(star) {
    updateStarUI(star);
}

function resetHoverReviewRating() {
    updateStarUI(userSelectedStarRating);
}

function updateStarUI(starCount) {
    document.querySelectorAll('.star-pick').forEach(starEl => {
        const starNum = parseInt(starEl.dataset.star, 10);
        starEl.classList.toggle('active', starNum <= starCount);
    });
    const scoreDisplay = document.getElementById('star-score-display');
    if (scoreDisplay) scoreDisplay.textContent = `${starCount} / 10`;
}

function submitUserReview() {
    if (!currentMovieData) return;

    const authorInput = document.getElementById('review-author-input');
    const contentInput = document.getElementById('review-content-input');

    const author = authorInput ? authorInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';

    if (!author) {
        showToast('Please enter your name');
        return;
    }
    if (!content || content.length < 5) {
        showToast('Please write a brief review comment');
        return;
    }

    const newReview = {
        id: 'user-' + Date.now(),
        author: author,
        content: content,
        created_at: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        author_details: { rating: userSelectedStarRating }
    };

    const movieKey = currentMovieData.id || currentMovieData.title;
    if (!localReviews[movieKey]) localReviews[movieKey] = [];
    localReviews[movieKey].unshift(newReview);
    localStorage.setItem('cinescope_user_reviews', JSON.stringify(localReviews));

    // Clear inputs
    if (authorInput) authorInput.value = '';
    if (contentInput) contentInput.value = '';

    // Prepend to review list in modal
    const list = document.getElementById('modal-reviews-list');
    if (list) {
        const reviewHTML = `
            <div class="review-card" style="border-color: var(--accent-primary)">
                <div class="review-header">
                    <div class="review-avatar">${esc(newReview.author.charAt(0).toUpperCase())}</div>
                    <div>
                        <div class="review-author">${esc(newReview.author)} (You)</div>
                        <div class="review-date">${esc(newReview.created_at)}</div>
                    </div>
                    <div class="review-rating-badge">⭐ ${newReview.author_details.rating}/10</div>
                </div>
                <div class="review-content">${esc(newReview.content).replace(/\n/g, '<br>')}</div>
            </div>
        `;
        list.insertAdjacentHTML('afterbegin', reviewHTML);
    }

    showToast('✨ Review published successfully!');
}

// ═══════════════════════════════════════════════════════
//  WATCHLIST / FAVORITES
// ═══════════════════════════════════════════════════════

function isInWatchlist(idOrTitle) {
    const key = String(idOrTitle).toLowerCase();
    return watchlist.some(m => String(m.id).toLowerCase() === key || m.title.toLowerCase() === key);
}

function toggleWatchlistCard(event, title, id) {
    event.stopPropagation();
    toggleWatchlistMovie({ title, id, vote_average: 8.5 });

    // Update target button visual
    const btn = event.currentTarget;
    const isNowFav = isInWatchlist(id || title);
    btn.classList.toggle('active', isNowFav);
    btn.innerHTML = isNowFav ? '❤️' : '🤍';
}

function toggleWatchlistCurrent() {
    if (!currentMovieData) return;
    toggleWatchlistMovie(currentMovieData);

    const btn = document.getElementById('modal-watchlist-btn');
    const isNowFav = isInWatchlist(currentMovieData.id || currentMovieData.title);
    if (btn) {
        btn.classList.toggle('active', isNowFav);
        btn.innerHTML = `<span>${isNowFav ? '❤️ In Watchlist' : '🤍 Add to Watchlist'}</span>`;
    }
}

function toggleWatchlistMovie(movie) {
    const key = String(movie.id || movie.title).toLowerCase();
    const existingIndex = watchlist.findIndex(m => String(m.id).toLowerCase() === key || m.title.toLowerCase() === key);

    if (existingIndex >= 0) {
        watchlist.splice(existingIndex, 1);
        showToast(`Removed "${movie.title}" from Watchlist`);
    } else {
        watchlist.unshift({
            id: movie.id || Math.floor(Math.random() * 1000000),
            title: movie.title,
            poster_path: movie.poster_path,
            vote_average: movie.vote_average,
            release_date: movie.release_date
        });
        showToast(`Added "${movie.title}" to Watchlist ❤️`);
    }

    localStorage.setItem('cinescope_watchlist', JSON.stringify(watchlist));
    updateWatchlistBadge();
}

function updateWatchlistBadge() {
    const badge = document.getElementById('watchlist-badge');
    const drawerCount = document.getElementById('drawer-count-tag');
    const count = watchlist.length;

    if (badge) badge.textContent = count;
    if (drawerCount) drawerCount.textContent = `${count} saved`;
}

function openWatchlistDrawer() {
    const drawer = document.getElementById('watchlist-drawer');
    const list = document.getElementById('watchlist-items-list');
    if (!drawer || !list) return;

    updateWatchlistBadge();

    if (!watchlist.length) {
        list.innerHTML = `
            <div style="text-align:center; padding: 50px 20px; color: var(--text-muted);">
                <div style="font-size: 40px; margin-bottom: 12px;">🎬</div>
                <h4 style="font-weight:700; color:var(--text-primary);">Your watchlist is empty</h4>
                <p style="font-size:13px; margin-top:6px;">Click the heart icon on any movie to save it for later.</p>
            </div>
        `;
    } else {
        list.innerHTML = watchlist.map(m => `
            <div class="watchlist-item" onclick="openMovieDetail('${escAttr(m.title)}', ${m.id || 0}); closeWatchlistDrawer();">
                <img class="watchlist-item-poster" src="${getPosterSrc(m.poster_path, m.title)}" alt="${esc(m.title)}">
                <div class="watchlist-item-info">
                    <div class="watchlist-item-title">${esc(m.title)}</div>
                    <div class="watchlist-item-meta">⭐ ${m.vote_average ? Number(m.vote_average).toFixed(1) : '—'} &bull; ${m.release_date ? m.release_date.substring(0, 4) : 'TBA'}</div>
                </div>
                <button class="watchlist-item-remove" onclick="removeWatchlistItem(event, '${escAttr(m.title)}', ${m.id || 0})" title="Remove">✕</button>
            </div>
        `).join('');
    }

    drawer.classList.remove('hidden');
}

function closeWatchlistDrawer() {
    const drawer = document.getElementById('watchlist-drawer');
    if (drawer) drawer.classList.add('hidden');
}

function removeWatchlistItem(event, title, id) {
    event.stopPropagation();
    toggleWatchlistMovie({ title, id });
    openWatchlistDrawer(); // Refresh list view
}

function clearWatchlist() {
    if (!watchlist.length) return;
    watchlist = [];
    localStorage.setItem('cinescope_watchlist', JSON.stringify([]));
    updateWatchlistBadge();
    openWatchlistDrawer();
    showToast('Watchlist cleared');
}

// ═══════════════════════════════════════════════════════
//  SHARE MODAL
// ═══════════════════════════════════════════════════════

function openShareModal() {
    if (!currentMovieData) return;
    const modal = document.getElementById('share-modal');
    const preview = document.getElementById('share-movie-preview');
    const urlInput = document.getElementById('share-url-input');

    const shareUrl = window.location.origin + window.location.pathname + `?movie=${encodeURIComponent(currentMovieData.title)}`;
    if (urlInput) urlInput.value = shareUrl;

    if (preview) {
        preview.innerHTML = `
            <img class="share-preview-poster" src="${getPosterSrc(currentMovieData.poster_path, currentMovieData.title)}" alt="${esc(currentMovieData.title)}">
            <div>
                <div class="share-preview-title">${esc(currentMovieData.title)}</div>
                <div class="share-preview-meta">⭐ ${currentMovieData.vote_average || '—'} &bull; ${currentMovieData.release_date ? currentMovieData.release_date.substring(0, 4) : 'TBA'}</div>
            </div>
        `;
    }

    if (modal) modal.classList.remove('hidden');
}

function closeShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) modal.classList.add('hidden');
}

function shareToSocial(platform) {
    if (!currentMovieData) return;
    const title = currentMovieData.title;
    const url = encodeURIComponent(window.location.origin + window.location.pathname + `?movie=${encodeURIComponent(title)}`);
    const text = encodeURIComponent(`Check out "${title}" on CineScope! 🎬`);

    let shareLink = '';
    switch (platform) {
        case 'twitter': shareLink = `https://twitter.com/intent/tweet?text=${text}&url=${url}`; break;
        case 'whatsapp': shareLink = `https://api.whatsapp.com/send?text=${text}%20${url}`; break;
        case 'facebook': shareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`; break;
        case 'reddit': shareLink = `https://reddit.com/submit?url=${url}&title=${text}`; break;
        case 'linkedin': shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`; break;
        case 'telegram': shareLink = `https://t.me/share/url?url=${url}&text=${text}`; break;
    }

    if (shareLink) window.open(shareLink, '_blank', 'width=600,height=500');
}

function copyShareLink() {
    const urlInput = document.getElementById('share-url-input');
    const copyBtn = document.getElementById('copy-link-btn');
    if (!urlInput) return;

    navigator.clipboard.writeText(urlInput.value).then(() => {
        if (copyBtn) copyBtn.textContent = '✓ Copied!';
        showToast('Link copied to clipboard! 📋');
        setTimeout(() => { if (copyBtn) copyBtn.textContent = 'Copy Link'; }, 2500);
    }).catch(() => {
        urlInput.select();
        document.execCommand('copy');
        showToast('Link copied to clipboard! 📋');
    });
}

// ═══════════════════════════════════════════════════════
//  PERSON / FILMOGRAPHY MODAL
// ═══════════════════════════════════════════════════════

async function openPersonModal(personName) {
    showLoading();
    try {
        const data = await apiFetch(`/api/person/${encodeURIComponent(personName)}`);
        const modal = document.getElementById('person-modal');
        const nameEl = document.getElementById('person-name');
        const avatarEl = document.getElementById('person-avatar');
        const grid = document.getElementById('person-filmography-grid');

        if (nameEl) nameEl.textContent = personName;
        if (avatarEl) avatarEl.textContent = personName.charAt(0);

        if (grid) {
            if (data.filmography?.length) {
                grid.innerHTML = data.filmography.map((m, i) => movieCardHTML(m, i)).join('');
            } else {
                grid.innerHTML = `<p style="grid-column:1/-1; color:var(--text-muted); text-align:center; padding:30px;">Search results for movies featuring ${esc(personName)}...</p>`;
            }
        }

        if (modal) modal.classList.remove('hidden');
    } catch (err) {
        showToast(`Could not load details for ${personName}`);
    } finally {
        hideLoading();
    }
}

function closePersonModal() {
    const modal = document.getElementById('person-modal');
    if (modal) modal.classList.add('hidden');
}

// ═══════════════════════════════════════════════════════
//  GLOBAL SHORTCUTS & HELPERS
// ═══════════════════════════════════════════════════════

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        // Pressing '/' focuses hero or navbar search
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            const heroInput = document.getElementById('search-input');
            const navInput = document.getElementById('nav-search-input');
            if (heroInput && window.scrollY < 300) {
                heroInput.focus();
            } else if (navInput) {
                navInput.focus();
            }
        }
        // Pressing Escape closes open modals or search dropdowns
        if (e.key === 'Escape') {
            closeModal();
            closeWatchlistDrawer();
            closeShareModal();
            closePersonModal();
            closeSuggestions();
        }
    });
}

function closeSuggestions() {
    document.getElementById('search-suggestions')?.classList.add('hidden');
    document.getElementById('nav-suggestions')?.classList.add('hidden');
}

function showLoading() {
    document.getElementById('loading')?.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading')?.classList.add('hidden');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add('hidden'), 3500);
}
