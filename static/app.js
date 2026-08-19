/* ======================================================
   CineScope — Movie Reviewer & Explorer
   Frontend Application Logic (100% Gemini AI Powered)
   Talks to Python Flask backend (/api/...)
   ====================================================== */

const API_BASE = '';  // Same origin (Flask serves both)

let searchDebounce = null;
let navSearchDebounce = null;
let currentSearchQuery = '';

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // Generate background floating particles
    createParticles();

    // Load initial home page categories
    loadHomeData();

    // Search input events
    const heroInput = document.getElementById('search-input');
    heroInput.addEventListener('input', e => onSearchInput(e, 'search-suggestions'));
    heroInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchMovies(); });

    const navInput = document.getElementById('nav-search-input');
    navInput.addEventListener('input', e => onSearchInput(e, 'nav-suggestions'));
    navInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            document.getElementById('search-input').value = navInput.value;
            searchMovies();
        }
    });

    // Close suggestions on outside click
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-container') && !e.target.closest('.nav-search-wrapper')) {
            document.getElementById('search-suggestions').classList.add('hidden');
            document.getElementById('nav-suggestions').classList.add('hidden');
        }
    });

    // ESC key to close modal
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
    });
});

// ═══════════════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════════════

function createParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;
    const colors = ['#7c5cfc', '#c084fc', '#f472b6', '#06b6d4', '#3b82f6'];
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'hero-particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 8 + 's';
        p.style.animationDuration = (6 + Math.random() * 6) + 's';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.width = (2 + Math.random() * 3) + 'px';
        p.style.height = p.style.width;
        container.appendChild(p);
    }
}

// ═══════════════════════════════════════════════════════
//  FETCH HELPER
// ═══════════════════════════════════════════════════════

async function apiFetch(endpoint) {
    const res = await fetch(API_BASE + endpoint);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

// ═══════════════════════════════════════════════════════
//  HOME DATA
// ═══════════════════════════════════════════════════════

async function loadHomeData() {
    try {
        const [trending, nowPlaying] = await Promise.all([
            apiFetch('/api/trending'),
            apiFetch('/api/now-playing'),
        ]);
        renderMovieScroll(trending.results, 'trending-grid');
        renderMovieScroll(nowPlaying.results, 'now-playing-grid');
    } catch (err) {
        console.error('Home data load error:', err);
    }
}

// ═══════════════════════════════════════════════════════
//  POSTER GENERATOR
// ═══════════════════════════════════════════════════════

function getPosterSrc(posterPath, title) {
    if (posterPath && posterPath.startsWith('http')) return posterPath;
    const cleanTitle = (title || 'Movie').replace(/["'<>]/g, '');
    const shortTitle = cleanTitle.length > 24 ? cleanTitle.substring(0, 21) + '...' : cleanTitle;
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231a162b"/><stop offset="50%" stop-color="%23241b44"/><stop offset="100%" stop-color="%23120f24"/></linearGradient><linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%237c5cfc"/><stop offset="100%" stop-color="%23f472b6"/></linearGradient></defs><rect width="300" height="450" fill="url(%23g)" rx="12"/><circle cx="150" cy="180" r="55" fill="url(%23a)" opacity="0.18"/><text x="150" y="195" font-family="sans-serif" font-size="42" text-anchor="middle">🎬</text><rect x="30" y="315" width="240" height="2" fill="url(%23a)" opacity="0.4"/><text x="150" y="355" font-family="system-ui, sans-serif" font-size="17" font-weight="700" fill="%23f1f1f8" text-anchor="middle">${encodeURIComponent(shortTitle)}</text><text x="150" y="385" font-family="system-ui, sans-serif" font-size="12" fill="%23a855f7" text-anchor="middle">✨ Gemini AI</text></svg>`;
}

// ═══════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════

function onSearchInput(e, suggestionsId) {
    clearTimeout(searchDebounce);
    const q = e.target.value.trim();
    if (q.length < 2) {
        document.getElementById(suggestionsId).classList.add('hidden');
        return;
    }
    searchDebounce = setTimeout(() => fetchSuggestions(q, suggestionsId), 300);
}

async function fetchSuggestions(query, suggestionsId) {
    try {
        const data = await apiFetch(`/api/search?q=${encodeURIComponent(query)}&page=1`);
        const container = document.getElementById(suggestionsId);
        if (!data.results || !data.results.length) {
            container.classList.add('hidden');
            return;
        }

        container.innerHTML = data.results.slice(0, 7).map(m => `
            <div class="suggestion-item" onclick="openMovieDetail('${escAttr(m.title)}', ${m.id || 0})">
                <img class="suggestion-poster" src="${getPosterSrc(m.poster_path, m.title)}" alt="${esc(m.title)}" loading="lazy">
                <div class="suggestion-info">
                    <div class="suggestion-title">${esc(m.title)}</div>
                    <div class="suggestion-year">${m.release_date ? m.release_date.substring(0, 4) : 'N/A'}</div>
                </div>
                <div class="suggestion-rating">⭐ ${m.vote_average ? m.vote_average.toFixed(1) : '—'}</div>
            </div>
        `).join('');
        container.classList.remove('hidden');
    } catch (err) {
        console.error('Suggestions error:', err);
    }
}

async function searchMovies(page = 1) {
    const query = document.getElementById('search-input').value.trim();
    if (!query) { showToast('Please enter a movie name'); return; }

    closeSuggestions();
    currentSearchQuery = query;
    showLoading();

    try {
        const data = await apiFetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`);
        document.getElementById('results-title').textContent = `Results for "${query}"`;
        renderMovieGrid(data.results, 'results-grid');
        renderPagination(page, data.total_pages);
        showResultsSection();
    } catch (err) {
        showToast('Search failed. Please try again.');
        console.error(err);
    } finally {
        hideLoading();
    }
}

// ═══════════════════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════════════════

async function showCategory(cat) {
    showLoading();
    try {
        const data = await apiFetch(`/api/${cat}`);
        const titles = {
            'trending': '🔥 Trending Blockbusters',
            'top-rated': '⭐ All-Time Highest Rated',
            'upcoming': '🎬 Anticipated Upcoming Releases',
            'now-playing': '🍿 Now Playing in Theaters',
        };
        document.getElementById('results-title').textContent = titles[cat] || cat;
        renderMovieGrid(data.results, 'results-grid');
        document.getElementById('pagination').classList.add('hidden');
        showResultsSection();
    } catch (err) {
        showToast('Failed to load movies');
    } finally {
        hideLoading();
    }
}

function showResultsSection() {
    document.getElementById('trending-section').classList.add('hidden');
    document.getElementById('now-playing-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');
    document.getElementById('scroll-indicator').classList.add('hidden');
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════
//  RENDER HELPERS
// ═══════════════════════════════════════════════════════

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function escAttr(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function getRatingColor(rating) {
    if (rating >= 7.5) return 'var(--green)';
    if (rating >= 6) return 'var(--yellow)';
    if (rating >= 4) return 'var(--orange)';
    return 'var(--red)';
}

function formatCurrency(amount) {
    if (!amount) return 'N/A';
    if (amount >= 1e9) return '$' + (amount / 1e9).toFixed(2) + 'B';
    if (amount >= 1e6) return '$' + (amount / 1e6).toFixed(1) + 'M';
    if (amount >= 1e3) return '$' + (amount / 1e3).toFixed(0) + 'K';
    return '$' + amount.toLocaleString();
}

function movieCardHTML(m, i) {
    const posterUrl = getPosterSrc(m.poster_path, m.title);
    return `
        <div class="movie-card" onclick="openMovieDetail('${escAttr(m.title)}', ${m.id || 0})" style="animation-delay: ${i * 0.04}s">
            <div class="poster-wrapper">
                <img class="poster" src="${posterUrl}" alt="${esc(m.title)}" loading="lazy">
                <div class="card-rating" style="color: ${getRatingColor(m.vote_average)}">
                    ⭐ ${m.vote_average ? Number(m.vote_average).toFixed(1) : '—'}
                </div>
                <div class="poster-overlay"><span>View Details →</span></div>
            </div>
            <div class="card-body">
                <div class="card-title" title="${esc(m.title)}">${esc(m.title)}</div>
                <div class="card-meta"><span>${m.release_date ? m.release_date.substring(0, 4) : 'TBA'}</span></div>
            </div>
        </div>`;
}

function renderMovieGrid(movies, containerId) {
    const c = document.getElementById(containerId);
    if (!movies || !movies.length) {
        c.innerHTML = '<div class="no-results" style="grid-column:1/-1"><div class="emoji">🎬</div><h3>No movies found</h3><p>Try searching for any movie title</p></div>';
        return;
    }
    c.innerHTML = movies.map((m, i) => movieCardHTML(m, i)).join('');
}

function renderMovieScroll(movies, containerId) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = (movies || []).map((m, i) => movieCardHTML(m, i)).join('');
}

function renderPagination(current, total) {
    const c = document.getElementById('pagination');
    if (!total || total <= 1) { c.classList.add('hidden'); return; }
    c.classList.remove('hidden');
    const maxShow = 5;
    let start = Math.max(1, current - Math.floor(maxShow / 2));
    let end = Math.min(total, start + maxShow - 1);
    if (end - start < maxShow - 1) start = Math.max(1, end - maxShow + 1);

    let html = `<button ${current === 1 ? 'disabled' : ''} onclick="searchMovies(${current - 1})">← Prev</button>`;
    for (let i = start; i <= end; i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="searchMovies(${i})">${i}</button>`;
    }
    html += `<button ${current >= total ? 'disabled' : ''} onclick="searchMovies(${current + 1})">Next →</button>`;
    c.innerHTML = html;
}

// ═══════════════════════════════════════════════════════
//  MOVIE DETAIL (100% GEMINI AI POWERED)
// ═══════════════════════════════════════════════════════

async function openMovieDetail(movieTitleOrIdent, movieId = 0) {
    showLoading();
    closeSuggestions();

    try {
        const queryParam = encodeURIComponent(movieTitleOrIdent);
        const movie = await apiFetch(`/api/movie/${queryParam}?title=${queryParam}`);
        renderMovieModal(movie);
    } catch (err) {
        showToast('Failed to load movie details');
        console.error(err);
    } finally {
        hideLoading();
    }
}

function renderMovieModal(m) {
    const modal = document.getElementById('movie-modal');
    const body = document.getElementById('modal-body');
    document.body.style.overflow = 'hidden';

    // Financials
    const profit = (m.revenue && m.budget) ? m.revenue - m.budget : null;
    const roi = (profit && m.budget) ? ((profit / m.budget) * 100).toFixed(0) : null;

    // Streaming sources from Gemini
    const streamSources = m.watch_providers?.sources || [];

    // Crew
    const crew = m.crew || {};

    // Poster and backdrop
    const posterSrc = getPosterSrc(m.poster_path, m.title);

    body.innerHTML = `
        <!-- BACKDROP -->
        <div class="detail-backdrop">
            <div class="detail-backdrop-art"></div>
            <div class="detail-backdrop-overlay"></div>
        </div>

        <!-- HEADER -->
        <div class="detail-header">
            <div class="detail-poster">
                <img src="${posterSrc}" alt="${esc(m.title)}">
            </div>
            <div class="detail-info">
                <h1 class="detail-title">${esc(m.title)}</h1>
                ${m.tagline ? `<p class="detail-tagline">"${esc(m.tagline)}"</p>` : ''}

                <div class="detail-meta">
                    ${m.release_date ? `<span class="meta-badge">📅 ${m.release_date.substring(0, 4)}</span>` : ''}
                    ${m.runtime ? `<span class="meta-badge">⏱️ ${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m</span>` : ''}
                    ${m.certification ? `<span class="meta-badge">🎫 ${m.certification}</span>` : ''}
                    ${m.original_language ? `<span class="meta-badge">🌐 ${m.original_language.toUpperCase()}</span>` : ''}
                    ${m.status ? `<span class="meta-badge">📌 ${m.status}</span>` : ''}
                    ${m.imdb_id ? `<span class="meta-badge"><a href="https://www.imdb.com/title/${m.imdb_id}" target="_blank" style="color:var(--imdb-yellow);font-weight:700;">IMDb ↗</a></span>` : ''}
                </div>

                <div class="detail-genres">
                    ${(m.genres || []).map(g => `<span class="genre-tag">${esc(typeof g === 'string' ? g : g.name)}</span>`).join('')}
                </div>

                ${m.overview ? `<p class="detail-overview">${esc(m.overview)}</p>` : ''}

                <!-- RATINGS SHOWCASE -->
                ${m.ratings && m.ratings.length ? `
                <div class="ratings-showcase">
                    ${m.ratings.map(r => `
                        <div class="rating-card">
                            <div class="rating-source-icon ${r.icon}">
                                ${r.icon === 'imdb' ? 'IMDb' : r.icon === 'rt' ? '🍅' : r.icon === 'metacritic' ? 'MC' : '✨'}
                            </div>
                            <div class="rating-info">
                                <div class="rating-source-name">${esc(r.source)}</div>
                                <div class="rating-value">${esc(r.value)}</div>
                                ${r.votes ? `<div class="rating-votes">${r.votes}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>` : ''}
            </div>
        </div>

        <div class="detail-body">

            <!-- AWARDS -->
            ${m.awards || m.omdb?.awards ? `
            <div class="awards-bar">
                <span class="awards-icon">🏆</span>
                <span class="awards-text">${esc(m.awards || m.omdb.awards)}</span>
            </div>` : ''}

            <!-- AI ANALYSIS (Gemini) -->
            ${m.ai_analysis ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🤖 AI Critical Analysis <span class="ai-badge">Gemini AI</span></h3>
                <div class="ai-analysis-container">
                    ${renderAiAnalysisHTML(m.ai_analysis)}
                </div>
            </div>` : ''}

            <!-- FINANCIALS -->
            ${(m.budget || m.revenue) ? `
            <div class="detail-section">
                <h3 class="detail-section-title">💰 Box Office & Financials</h3>
                <div class="finance-grid">
                    ${m.budget ? `<div class="finance-card"><div class="label">Budget</div><div class="value blue">${formatCurrency(m.budget)}</div></div>` : ''}
                    ${m.revenue ? `<div class="finance-card"><div class="label">Box Office Revenue</div><div class="value green">${formatCurrency(m.revenue)}</div></div>` : ''}
                    ${profit !== null ? `<div class="finance-card"><div class="label">Profit / Loss</div><div class="value ${profit >= 0 ? 'green' : 'red'}">${profit >= 0 ? '+' : ''}${formatCurrency(profit)}</div>${roi ? `<div class="sub">${roi}% ROI</div>` : ''}</div>` : ''}
                    ${m.omdb?.box_office ? `<div class="finance-card"><div class="label">US Domestic Box Office</div><div class="value emerald">${esc(m.omdb.box_office)}</div></div>` : ''}
                </div>
            </div>` : ''}

            <!-- WHERE TO WATCH -->
            <div class="detail-section">
                <h3 class="detail-section-title">📺 Where to Watch</h3>
                ${streamSources.length ? `
                <div class="streaming-grid">
                    ${streamSources.map(s => `
                        <a href="${s.web_url || `https://www.google.com/search?q=watch+${encodeURIComponent(m.title)}`}" target="_blank" class="stream-chip" title="${esc(s.name)}">
                            <div class="chip-icon">📺</div>
                            <div class="chip-info">
                                <div class="chip-name">${esc(s.name)}</div>
                                <div class="chip-type">${esc(s.type || 'Stream')}</div>
                            </div>
                            ${s.price ? `<div class="chip-price">$${s.price}</div>` : ''}
                        </a>
                    `).join('')}
                </div>
                <p class="watch-note">* Streaming availability identified via Gemini AI.</p>
                ` : '<div class="no-results"><p>Available across major digital platforms (Netflix, Prime Video, Apple TV).</p></div>'}
            </div>

            <!-- TRAILERS -->
            ${m.youtube_trailers && m.youtube_trailers.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎥 Official Trailers & Clips</h3>
                <div class="videos-grid">
                    ${m.youtube_trailers.map(v => `
                        <div class="video-card" onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(m.title + ' official trailer')}', '_blank')">
                            <div class="video-thumbnail-placeholder">
                                <span class="trailer-play-icon">▶</span>
                            </div>
                            <div class="video-title">
                                ${esc(v.title)}
                                <div class="video-channel">${esc(v.channel || 'Official Studio')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- CAST -->
            ${m.cast && m.cast.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎭 Cast</h3>
                <div class="cast-scroll">
                    ${m.cast.map(c => `
                        <div class="cast-card">
                            <div class="cast-avatar-fallback">${esc(c.name.charAt(0))}</div>
                            <div class="cast-name" title="${esc(c.name)}">${esc(c.name)}</div>
                            <div class="cast-character" title="${esc(c.character)}">${esc(c.character) || '—'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- KEY CREW -->
            ${hasAnyCrew(crew) ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎬 Key Crew</h3>
                <div class="crew-grid">
                    ${(crew.directors || []).map(c => `<div class="crew-item"><div class="crew-name">${esc(c.name)}</div><div class="crew-job">Director</div></div>`).join('')}
                    ${(crew.writers || []).map(c => `<div class="crew-item"><div class="crew-name">${esc(c.name)}</div><div class="crew-job">${esc(c.job || 'Writer')}</div></div>`).join('')}
                    ${(crew.producers || []).map(c => `<div class="crew-item"><div class="crew-name">${esc(c.name)}</div><div class="crew-job">Producer</div></div>`).join('')}
                    ${(crew.composers || []).map(c => `<div class="crew-item"><div class="crew-name">${esc(c.name)}</div><div class="crew-job">Composer</div></div>`).join('')}
                    ${(crew.cinematographers || []).map(c => `<div class="crew-item"><div class="crew-name">${esc(c.name)}</div><div class="crew-job">Cinematographer</div></div>`).join('')}
                </div>
            </div>` : ''}

            <!-- REVIEWS -->
            ${m.reviews && m.reviews.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">📝 Critical & Audience Reviews</h3>
                ${m.reviews.map(r => `
                    <div class="review-card">
                        <div class="review-header">
                            <div class="review-avatar">${esc(r.author ? r.author.charAt(0).toUpperCase() : 'U')}</div>
                            <div>
                                <div class="review-author">${esc(r.author)}</div>
                                <div class="review-date">${r.created_at || 'Verified Review'}</div>
                            </div>
                            ${r.author_details?.rating ? `<div class="review-rating-badge">⭐ ${r.author_details.rating}/10</div>` : ''}
                        </div>
                        <div class="review-content" id="review-${r.id || 'r'}">${r.content ? r.content.replace(/\n/g, '<br>') : ''}</div>
                    </div>
                `).join('')}
            </div>` : ''}

            <!-- SIMILAR MOVIES -->
            ${m.similar?.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎞️ Similar Recommendations</h3>
                <div class="similar-scroll movie-scroll">
                    ${m.similar.map((s, i) => movieCardHTML(s, i)).join('')}
                </div>
            </div>` : ''}
        </div>
    `;

    modal.classList.remove('hidden');
    modal.scrollTop = 0;
}

function hasAnyCrew(crew) {
    if (!crew) return false;
    return (crew.directors?.length || crew.writers?.length || crew.producers?.length ||
            crew.composers?.length || crew.cinematographers?.length);
}

function renderAiAnalysisHTML(ai) {
    return `
        <!-- Verdict + Score -->
        <div class="ai-verdict-row">
            <div class="ai-verdict-card">
                <div class="ai-verdict-icon">🎯</div>
                <div class="ai-verdict-text">
                    <div class="ai-label">AI Verdict</div>
                    <div class="ai-verdict">${esc(ai.verdict || '')}</div>
                </div>
            </div>
            <div class="ai-score-card">
                <div class="ai-score-ring" style="--score-pct: ${(parseFloat(ai.score) || 0) * 10}%">
                    <span class="ai-score-value">${esc(String(ai.score || '?'))}</span>
                    <span class="ai-score-label">/10</span>
                </div>
                <div class="ai-score-subtitle">AI Score</div>
            </div>
        </div>

        <!-- One-liner -->
        ${ai.one_liner ? `
        <div class="ai-oneliner">
            <span class="ai-oneliner-quote">"</span>${esc(ai.one_liner)}<span class="ai-oneliner-quote">"</span>
        </div>` : ''}

        <!-- Mood + Best For -->
        <div class="ai-meta-row">
            ${ai.mood ? `<div class="ai-meta-chip"><span class="ai-meta-icon">🎭</span><div><div class="ai-meta-label">Mood</div><div class="ai-meta-value">${esc(ai.mood)}</div></div></div>` : ''}
            ${ai.best_for ? `<div class="ai-meta-chip"><span class="ai-meta-icon">👤</span><div><div class="ai-meta-label">Best For</div><div class="ai-meta-value">${esc(ai.best_for)}</div></div></div>` : ''}
        </div>

        <!-- Themes -->
        ${ai.themes?.length ? `
        <div class="ai-tags-section">
            <div class="ai-label">🎨 Key Themes</div>
            <div class="ai-tags">${ai.themes.map(t => `<span class="ai-tag">${esc(t)}</span>`).join('')}</div>
        </div>` : ''}

        <!-- Strengths + Weaknesses -->
        <div class="ai-pros-cons">
            ${ai.strengths?.length ? `
            <div class="ai-pros">
                <div class="ai-label">✅ Strengths</div>
                <ul>${ai.strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
            </div>` : ''}
            ${ai.weaknesses?.length ? `
            <div class="ai-cons">
                <div class="ai-label">⚠️ Weaknesses</div>
                <ul>${ai.weaknesses.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
            </div>` : ''}
        </div>

        <!-- Fun Facts -->
        ${ai.fun_facts?.length ? `
        <div class="ai-facts">
            <div class="ai-label">💡 Fun Facts</div>
            ${ai.fun_facts.map(f => `<div class="ai-fact-item"><span class="ai-fact-dot">•</span>${esc(f)}</div>`).join('')}
        </div>` : ''}

        <!-- AI Similar Picks -->
        ${ai.similar_picks?.length ? `
        <div class="ai-picks">
            <div class="ai-label">🎬 AI Recommends</div>
            <div class="ai-picks-list">${ai.similar_picks.map(p => `<span class="ai-pick-chip" onclick="openMovieDetail('${escAttr(p)}')">${esc(p)}</span>`).join('')}</div>
        </div>` : ''}
    `;
}

function closeModal() {
    document.getElementById('movie-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════

function goHome() {
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('trending-section').classList.remove('hidden');
    document.getElementById('now-playing-section').classList.remove('hidden');
    document.getElementById('scroll-indicator').classList.remove('hidden');
    document.getElementById('search-input').value = '';
    document.getElementById('nav-search-input').value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════════════════

function closeSuggestions() {
    document.getElementById('search-suggestions').classList.add('hidden');
    document.getElementById('nav-suggestions').classList.add('hidden');
}

function showLoading() { document.getElementById('loading').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading').classList.add('hidden'); }

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3500);
}
