/* ======================================================
   CineScope — Movie Reviewer & Explorer
   Frontend Application Logic v2
   Talks to Python Flask backend (/api/...)
   ====================================================== */

const API_BASE = '';  // Same origin (Flask serves both)
const IMG_BASE = 'https://image.tmdb.org/t/p/';
const IMG_W500 = IMG_BASE + 'w500';
const IMG_W780 = IMG_BASE + 'w780';
const IMG_ORIGINAL = IMG_BASE + 'original';
const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300">' +
    '<rect fill="%2316162a" width="200" height="300"/>' +
    '<text fill="%235e5e7e" font-family="sans-serif" font-size="13" text-anchor="middle" x="100" y="155">No Poster</text></svg>'
);

let searchDebounce = null;
let navSearchDebounce = null;
let currentSearchQuery = '';

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // Generate particles
    createParticles();

    // Load home sections
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

    // ESC to close modal
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
        console.error('Home data error:', err);
    }
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
        if (!data.results || !data.results.length) { container.classList.add('hidden'); return; }

        container.innerHTML = data.results.slice(0, 7).map(m => `
            <div class="suggestion-item" onclick="openMovieDetail(${m.id})">
                <img class="suggestion-poster" src="${m.poster_path ? IMG_W500 + m.poster_path : PLACEHOLDER}" alt="${esc(m.title)}" loading="lazy">
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
            'trending': '🔥 Trending This Week',
            'top-rated': '⭐ Top Rated Movies',
            'upcoming': '🎬 Upcoming Movies',
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
    return `
        <div class="movie-card" onclick="openMovieDetail(${m.id})" style="animation-delay: ${i * 0.04}s">
            <div class="poster-wrapper">
                <img class="poster" src="${m.poster_path ? IMG_W500 + m.poster_path : PLACEHOLDER}" alt="${esc(m.title)}" loading="lazy">
                <div class="card-rating" style="color: ${getRatingColor(m.vote_average)}">
                    ⭐ ${m.vote_average ? m.vote_average.toFixed(1) : '—'}
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
        c.innerHTML = '<div class="no-results" style="grid-column:1/-1"><div class="emoji">🎬</div><h3>No movies found</h3><p>Try a different search term</p></div>';
        return;
    }
    c.innerHTML = movies.map((m, i) => movieCardHTML(m, i)).join('');
}

function renderMovieScroll(movies, containerId) {
    const c = document.getElementById(containerId);
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
//  MOVIE DETAIL (FULL MULTI-API DATA)
// ═══════════════════════════════════════════════════════

async function openMovieDetail(movieId) {
    showLoading();
    closeSuggestions();

    try {
        const movie = await apiFetch(`/api/movie/${movieId}`);
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

    // Watch providers — merge TMDB + Watchmode
    const tmdbWP = m.watch_providers?.tmdb || {};
    const region = tmdbWP['US'] || tmdbWP['IN'] || tmdbWP['GB'] || Object.values(tmdbWP)[0] || null;
    const watchmodeItems = m.watch_providers?.watchmode || [];

    // Crew
    const crew = m.crew || {};

    body.innerHTML = `
        <!-- BACKDROP -->
        <div class="detail-backdrop">
            <img src="${m.backdrop_path ? IMG_ORIGINAL + m.backdrop_path : (m.poster_path ? IMG_W780 + m.poster_path : PLACEHOLDER)}" alt="${esc(m.title)}">
            <div class="detail-backdrop-overlay"></div>
        </div>

        <!-- HEADER -->
        <div class="detail-header">
            <div class="detail-poster">
                <img src="${m.poster_path ? IMG_W500 + m.poster_path : PLACEHOLDER}" alt="${esc(m.title)}">
            </div>
            <div class="detail-info">
                <h1 class="detail-title">${esc(m.title)}</h1>
                ${m.tagline ? `<p class="detail-tagline">"${esc(m.tagline)}"</p>` : ''}

                <div class="detail-meta">
                    ${m.release_date ? `<span class="meta-badge">📅 ${new Date(m.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>` : ''}
                    ${m.runtime ? `<span class="meta-badge">⏱️ ${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m</span>` : ''}
                    ${m.certification ? `<span class="meta-badge">🎫 ${m.certification}</span>` : ''}
                    ${m.original_language ? `<span class="meta-badge">🌐 ${m.original_language.toUpperCase()}</span>` : ''}
                    ${m.status ? `<span class="meta-badge">📌 ${m.status}</span>` : ''}
                    ${m.imdb_id ? `<span class="meta-badge"><a href="https://www.imdb.com/title/${m.imdb_id}" target="_blank" style="color:var(--imdb-yellow);font-weight:700;">IMDb ↗</a></span>` : ''}
                </div>

                <div class="detail-genres">
                    ${(m.genres || []).map(g => `<span class="genre-tag">${esc(g.name)}</span>`).join('')}
                </div>

                ${m.overview ? `<p class="detail-overview">${esc(m.overview)}</p>` : ''}

                <!-- RATINGS SHOWCASE -->
                ${m.ratings && m.ratings.length ? `
                <div class="ratings-showcase">
                    ${m.ratings.map(r => `
                        <div class="rating-card">
                            <div class="rating-source-icon ${r.icon}">
                                ${r.icon === 'imdb' ? 'IMDb' : r.icon === 'rt' ? '🍅' : r.icon === 'metacritic' ? 'MC' : 'T'}
                            </div>
                            <div class="rating-info">
                                <div class="rating-source-name">${esc(r.source)}</div>
                                <div class="rating-value">${esc(r.value)}</div>
                                ${r.votes ? `<div class="rating-votes">${r.votes} votes</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>` : ''}
            </div>
        </div>

        <div class="detail-body">

            <!-- AWARDS -->
            ${m.omdb?.awards && m.omdb.awards !== 'N/A' ? `
            <div class="awards-bar">
                <span class="awards-icon">🏆</span>
                <span class="awards-text">${esc(m.omdb.awards)}</span>
            </div>` : ''}

            <!-- FINANCIALS -->
            ${(m.budget || m.revenue) ? `
            <div class="detail-section">
                <h3 class="detail-section-title">💰 Box Office & Financials</h3>
                <div class="finance-grid">
                    ${m.budget ? `<div class="finance-card"><div class="label">Budget</div><div class="value blue">${formatCurrency(m.budget)}</div></div>` : ''}
                    ${m.revenue ? `<div class="finance-card"><div class="label">Box Office Revenue</div><div class="value green">${formatCurrency(m.revenue)}</div></div>` : ''}
                    ${profit !== null ? `<div class="finance-card"><div class="label">Profit / Loss</div><div class="value ${profit >= 0 ? 'green' : 'red'}">${profit >= 0 ? '+' : ''}${formatCurrency(profit)}</div>${roi ? `<div class="sub">${roi}% ROI</div>` : ''}</div>` : ''}
                    ${m.omdb?.box_office && m.omdb.box_office !== 'N/A' ? `<div class="finance-card"><div class="label">US Box Office (OMDB)</div><div class="value emerald">${esc(m.omdb.box_office)}</div></div>` : ''}
                    ${m.popularity ? `<div class="finance-card"><div class="label">Popularity</div><div class="value cyan">${m.popularity.toFixed(0)}</div></div>` : ''}
                </div>
            </div>` : ''}

            <!-- WHERE TO WATCH (Watchmode) -->
            <div class="detail-section">
                <h3 class="detail-section-title">📺 Where to Watch</h3>
                ${watchmodeItems.length ? `
                <div class="streaming-grid">
                    ${watchmodeItems.map(s => `
                        <a href="${s.web_url || '#'}" target="_blank" class="stream-chip" title="${esc(s.name)}">
                            <div class="chip-icon">📺</div>
                            <div class="chip-info">
                                <div class="chip-name">${esc(s.name)}</div>
                                <div class="chip-type">${esc(s.type || 'Stream')}</div>
                            </div>
                            ${s.price ? `<div class="chip-price">$${s.price}</div>` : ''}
                        </a>
                    `).join('')}
                </div>
                <p class="watch-note">* Data from Watchmode API. Availability may vary by region.</p>
                ` : region ? `
                <div class="streaming-grid">
                    ${(region.flatrate || []).map(p => `
                        <div class="stream-chip">
                            <img src="${IMG_W500 + p.logo_path}" alt="${esc(p.provider_name)}">
                            <div class="chip-info"><div class="chip-name">${esc(p.provider_name)}</div><div class="chip-type">Stream</div></div>
                        </div>
                    `).join('')}
                    ${(region.rent || []).map(p => `
                        <div class="stream-chip">
                            <img src="${IMG_W500 + p.logo_path}" alt="${esc(p.provider_name)}">
                            <div class="chip-info"><div class="chip-name">${esc(p.provider_name)}</div><div class="chip-type">Rent</div></div>
                        </div>
                    `).join('')}
                    ${(region.buy || []).map(p => `
                        <div class="stream-chip">
                            <img src="${IMG_W500 + p.logo_path}" alt="${esc(p.provider_name)}">
                            <div class="chip-info"><div class="chip-name">${esc(p.provider_name)}</div><div class="chip-type">Buy</div></div>
                        </div>
                    `).join('')}
                </div>
                <p class="watch-note">* Data from TMDB / JustWatch. Availability may vary by region.</p>
                ` : '<div class="no-results"><p>No streaming data available for this title.</p></div>'}
            </div>

            <!-- TRAILERS (YouTube API) -->
            ${m.youtube_trailers && m.youtube_trailers.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎥 Trailers & Videos</h3>
                <div class="videos-grid">
                    ${m.youtube_trailers.map(v => `
                        <div class="video-card" onclick="window.open('https://www.youtube.com/watch?v=${v.video_id}', '_blank')">
                            <img src="${v.thumbnail || `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`}" alt="${esc(v.title)}">
                            <div class="video-play"><div class="video-play-btn">▶</div></div>
                            <div class="video-title">
                                ${esc(v.title)}
                                <div class="video-channel">${esc(v.channel)}</div>
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
                            <img src="${c.profile_path ? IMG_W500 + c.profile_path : PLACEHOLDER}" alt="${esc(c.name)}" loading="lazy">
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
            <div class="detail-section">
                <h3 class="detail-section-title">📝 Reviews ${m.total_reviews ? `(${m.total_reviews})` : ''}</h3>
                ${m.reviews && m.reviews.length ? m.reviews.map(r => {
                    const avatarUrl = r.author_details?.avatar_path
                        ? (r.author_details.avatar_path.startsWith('/http')
                            ? r.author_details.avatar_path.substring(1)
                            : IMG_W500 + r.author_details.avatar_path)
                        : null;
                    const initial = r.author ? r.author.charAt(0).toUpperCase() : '?';
                    const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
                    const rating = r.author_details?.rating;
                    return `
                    <div class="review-card">
                        <div class="review-header">
                            <div class="review-avatar">${avatarUrl ? `<img src="${avatarUrl}" alt="${esc(r.author)}">` : initial}</div>
                            <div>
                                <div class="review-author">${esc(r.author)}</div>
                                <div class="review-date">${date}</div>
                            </div>
                            ${rating ? `<div class="review-rating-badge">⭐ ${rating}/10</div>` : ''}
                        </div>
                        <div class="review-content" id="review-${r.id}">${r.content ? r.content.replace(/\n/g, '<br>') : ''}</div>
                        <button class="review-toggle" onclick="toggleReview('review-${r.id}', this)">Read more</button>
                    </div>`;
                }).join('') : '<div class="no-results"><p>No reviews available yet.</p></div>'}
            </div>

            <!-- EXTRA INFO -->
            ${m.omdb && (m.omdb.country || m.omdb.language) ? `
            <div class="detail-section">
                <h3 class="detail-section-title">📋 Additional Info</h3>
                <div class="info-grid">
                    ${m.omdb.country && m.omdb.country !== 'N/A' ? `<div class="info-item"><div class="info-label">Country</div><div class="info-value">${esc(m.omdb.country)}</div></div>` : ''}
                    ${m.omdb.language && m.omdb.language !== 'N/A' ? `<div class="info-item"><div class="info-label">Language</div><div class="info-value">${esc(m.omdb.language)}</div></div>` : ''}
                    ${m.omdb.rated && m.omdb.rated !== 'N/A' ? `<div class="info-item"><div class="info-label">Rated</div><div class="info-value">${esc(m.omdb.rated)}</div></div>` : ''}
                    ${m.omdb.dvd && m.omdb.dvd !== 'N/A' ? `<div class="info-item"><div class="info-label">DVD Release</div><div class="info-value">${esc(m.omdb.dvd)}</div></div>` : ''}
                    ${m.spoken_languages?.length ? `<div class="info-item"><div class="info-label">Spoken Languages</div><div class="info-value">${m.spoken_languages.map(l => esc(l.english_name || l.name)).join(', ')}</div></div>` : ''}
                </div>
            </div>` : ''}

            <!-- PRODUCTION -->
            ${m.production_companies?.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🏢 Production</h3>
                <div class="production-grid">
                    ${m.production_companies.map(c => `
                        <div class="production-chip">
                            ${c.logo_path ? `<img src="${IMG_W500 + c.logo_path}" alt="${esc(c.name)}">` : `<div class="prod-placeholder">🏢</div>`}
                            <div>
                                <div class="prod-name">${esc(c.name)}</div>
                                ${c.origin_country ? `<div class="prod-country">${esc(c.origin_country)}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- SIMILAR MOVIES -->
            ${m.similar?.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎞️ Similar Movies</h3>
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

function toggleReview(id, btn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('expanded');
    btn.textContent = el.classList.contains('expanded') ? 'Show less' : 'Read more';
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
