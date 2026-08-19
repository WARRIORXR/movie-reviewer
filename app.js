/* ======================================================
   CineScope — Movie Reviewer & Explorer
   Application Logic (TMDB API v3)
   ====================================================== */

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/';
const IMG_W500 = IMG_BASE + 'w500';
const IMG_W780 = IMG_BASE + 'w780';
const IMG_ORIGINAL = IMG_BASE + 'original';
const PLACEHOLDER_POSTER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect fill="%231a1a28" width="200" height="300"/><text fill="%236a6a82" font-family="sans-serif" font-size="14" text-anchor="middle" x="100" y="155">No Poster</text></svg>');
const PLACEHOLDER_AVATAR = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><rect fill="%237c5cfc" width="44" height="44" rx="22"/><text fill="white" font-family="sans-serif" font-size="18" font-weight="700" text-anchor="middle" x="22" y="28">?</text></svg>');

let API_KEY = localStorage.getItem('tmdb_api_key') || '';
let searchDebounce = null;
let currentSearchQuery = '';
let currentSearchPage = 1;
let totalSearchPages = 1;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    if (API_KEY) {
        document.getElementById('api-key-modal').classList.add('hidden');
        loadTrending();
    }

    // Search input events
    const input = document.getElementById('search-input');
    input.addEventListener('input', onSearchInput);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') searchMovies(); });

    // Close suggestions on outside click
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('search-suggestions').classList.add('hidden');
        }
    });

    // ESC to close modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
});

// ==================== API KEY ====================
function saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (!key) { showToast('Please enter a valid API key'); return; }
    API_KEY = key;
    localStorage.setItem('tmdb_api_key', key);
    document.getElementById('api-key-modal').classList.add('hidden');
    showToast('API Key saved! Welcome to CineScope 🎬');
    loadTrending();
}

// ==================== FETCH HELPER ====================
async function tmdbFetch(endpoint, params = {}) {
    const url = new URL(TMDB_BASE + endpoint);
    url.searchParams.set('api_key', API_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);
    return res.json();
}

// ==================== SEARCH ====================
function onSearchInput(e) {
    clearTimeout(searchDebounce);
    const q = e.target.value.trim();
    if (q.length < 2) {
        document.getElementById('search-suggestions').classList.add('hidden');
        return;
    }
    searchDebounce = setTimeout(() => fetchSuggestions(q), 350);
}

async function fetchSuggestions(query) {
    try {
        const data = await tmdbFetch('/search/movie', { query, page: 1 });
        const container = document.getElementById('search-suggestions');
        if (!data.results.length) { container.classList.add('hidden'); return; }

        container.innerHTML = data.results.slice(0, 8).map(m => `
            <div class="suggestion-item" onclick="openMovieDetail(${m.id})">
                <img class="suggestion-poster" src="${m.poster_path ? IMG_W500 + m.poster_path : PLACEHOLDER_POSTER}" alt="${m.title}" loading="lazy">
                <div class="suggestion-info">
                    <div class="suggestion-title">${m.title}</div>
                    <div class="suggestion-year">${m.release_date ? m.release_date.substring(0, 4) : 'N/A'}</div>
                </div>
                <div class="suggestion-rating">⭐ ${m.vote_average ? m.vote_average.toFixed(1) : '—'}</div>
            </div>
        `).join('');
        container.classList.remove('hidden');
    } catch (err) {
        console.error('Suggestion error:', err);
    }
}

async function searchMovies(page = 1) {
    const query = document.getElementById('search-input').value.trim();
    if (!query) { showToast('Please enter a movie name'); return; }

    document.getElementById('search-suggestions').classList.add('hidden');
    currentSearchQuery = query;
    currentSearchPage = page;
    showLoading();

    try {
        const data = await tmdbFetch('/search/movie', { query, page });
        totalSearchPages = data.total_pages;

        document.getElementById('results-title').textContent = `Results for "${query}"`;
        renderMovieGrid(data.results, 'results-grid');
        renderPagination(page, totalSearchPages);

        document.getElementById('trending-section').classList.add('hidden');
        document.getElementById('results-section').classList.remove('hidden');
        document.getElementById('scroll-indicator').classList.add('hidden');
        document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        showToast('Search failed. Please check your API key.');
        console.error(err);
    } finally {
        hideLoading();
    }
}

// ==================== TRENDING / TOP RATED / UPCOMING ====================
async function loadTrending() {
    try {
        const data = await tmdbFetch('/trending/movie/week');
        renderMovieScroll(data.results, 'trending-grid');
    } catch (err) {
        console.error('Trending error:', err);
    }
}

async function showTrending() {
    showLoading();
    try {
        const data = await tmdbFetch('/trending/movie/week');
        document.getElementById('results-title').textContent = '🔥 Trending This Week';
        renderMovieGrid(data.results, 'results-grid');
        document.getElementById('pagination').classList.add('hidden');
        showResultsSection();
    } catch (err) { showToast('Failed to load trending'); }
    finally { hideLoading(); }
}

async function showTopRated() {
    showLoading();
    try {
        const data = await tmdbFetch('/movie/top_rated');
        document.getElementById('results-title').textContent = '⭐ Top Rated Movies';
        renderMovieGrid(data.results, 'results-grid');
        document.getElementById('pagination').classList.add('hidden');
        showResultsSection();
    } catch (err) { showToast('Failed to load top rated'); }
    finally { hideLoading(); }
}

async function showUpcoming() {
    showLoading();
    try {
        const data = await tmdbFetch('/movie/upcoming');
        document.getElementById('results-title').textContent = '🎬 Upcoming Movies';
        renderMovieGrid(data.results, 'results-grid');
        document.getElementById('pagination').classList.add('hidden');
        showResultsSection();
    } catch (err) { showToast('Failed to load upcoming'); }
    finally { hideLoading(); }
}

function showResultsSection() {
    document.getElementById('trending-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');
    document.getElementById('scroll-indicator').classList.add('hidden');
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
}

// ==================== RENDER HELPERS ====================
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

function renderMovieGrid(movies, containerId) {
    const container = document.getElementById(containerId);
    if (!movies.length) {
        container.innerHTML = `
            <div class="no-results" style="grid-column: 1/-1">
                <div class="emoji">🎬</div>
                <h3>No movies found</h3>
                <p>Try a different search term</p>
            </div>`;
        return;
    }

    container.innerHTML = movies.map((m, i) => `
        <div class="movie-card" onclick="openMovieDetail(${m.id})" style="animation-delay: ${i * 0.05}s">
            <div class="poster-wrapper">
                <img class="poster" src="${m.poster_path ? IMG_W500 + m.poster_path : PLACEHOLDER_POSTER}" alt="${m.title}" loading="lazy">
                <div class="card-rating" style="color: ${getRatingColor(m.vote_average)}">
                    ⭐ ${m.vote_average ? m.vote_average.toFixed(1) : '—'}
                </div>
                <div class="poster-overlay"><span>View Details →</span></div>
            </div>
            <div class="card-body">
                <div class="card-title" title="${m.title}">${m.title}</div>
                <div class="card-meta">
                    <span>${m.release_date ? m.release_date.substring(0, 4) : 'TBA'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderMovieScroll(movies, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = movies.map((m, i) => `
        <div class="movie-card" onclick="openMovieDetail(${m.id})" style="animation-delay: ${i * 0.06}s">
            <div class="poster-wrapper">
                <img class="poster" src="${m.poster_path ? IMG_W500 + m.poster_path : PLACEHOLDER_POSTER}" alt="${m.title}" loading="lazy">
                <div class="card-rating" style="color: ${getRatingColor(m.vote_average)}">
                    ⭐ ${m.vote_average ? m.vote_average.toFixed(1) : '—'}
                </div>
                <div class="poster-overlay"><span>View Details →</span></div>
            </div>
            <div class="card-body">
                <div class="card-title" title="${m.title}">${m.title}</div>
                <div class="card-meta">
                    <span>${m.release_date ? m.release_date.substring(0, 4) : 'TBA'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (total <= 1) { container.classList.add('hidden'); return; }

    container.classList.remove('hidden');
    const maxShow = 5;
    let start = Math.max(1, current - Math.floor(maxShow / 2));
    let end = Math.min(total, start + maxShow - 1);
    if (end - start < maxShow - 1) start = Math.max(1, end - maxShow + 1);

    let html = `<button ${current === 1 ? 'disabled' : ''} onclick="searchMovies(${current - 1})">← Prev</button>`;
    for (let i = start; i <= end; i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="searchMovies(${i})">${i}</button>`;
    }
    html += `<button ${current === total ? 'disabled' : ''} onclick="searchMovies(${current + 1})">Next →</button>`;
    container.innerHTML = html;
}

// ==================== MOVIE DETAIL ====================
async function openMovieDetail(movieId) {
    showLoading();
    document.getElementById('search-suggestions').classList.add('hidden');

    try {
        // Fetch all data in parallel
        const [movie, credits, reviews, watchProviders, videos, similar] = await Promise.all([
            tmdbFetch(`/movie/${movieId}`, { append_to_response: 'release_dates' }),
            tmdbFetch(`/movie/${movieId}/credits`),
            tmdbFetch(`/movie/${movieId}/reviews`),
            tmdbFetch(`/movie/${movieId}/watch/providers`),
            tmdbFetch(`/movie/${movieId}/videos`),
            tmdbFetch(`/movie/${movieId}/similar`)
        ]);

        renderMovieModal(movie, credits, reviews, watchProviders, videos, similar);
    } catch (err) {
        showToast('Failed to load movie details');
        console.error(err);
    } finally {
        hideLoading();
    }
}

function renderMovieModal(movie, credits, reviews, watchProviders, videos, similar) {
    const modal = document.getElementById('movie-modal');
    const body = document.getElementById('modal-body');
    document.body.style.overflow = 'hidden';

    // Compute profit
    const profit = (movie.revenue && movie.budget) ? movie.revenue - movie.budget : null;
    const roi = (profit && movie.budget) ? ((profit / movie.budget) * 100).toFixed(0) : null;

    // Director and key crew
    const directors = credits.crew ? credits.crew.filter(c => c.job === 'Director') : [];
    const writers = credits.crew ? credits.crew.filter(c => c.department === 'Writing').slice(0, 3) : [];
    const producers = credits.crew ? credits.crew.filter(c => c.job === 'Producer').slice(0, 3) : [];
    const composers = credits.crew ? credits.crew.filter(c => c.job === 'Original Music Composer').slice(0, 2) : [];
    const dops = credits.crew ? credits.crew.filter(c => c.job === 'Director of Photography').slice(0, 2) : [];

    // Watch providers (US first, then IN, then first available)
    const wp = watchProviders.results || {};
    const region = wp['US'] || wp['IN'] || wp['GB'] || Object.values(wp)[0] || null;

    // Certification
    let certification = '';
    if (movie.release_dates && movie.release_dates.results) {
        const usRelease = movie.release_dates.results.find(r => r.iso_3166_1 === 'US');
        if (usRelease && usRelease.release_dates.length) {
            certification = usRelease.release_dates[0].certification || '';
        }
    }

    // Videos (trailers first)
    const trailers = (videos.results || [])
        .filter(v => v.site === 'YouTube')
        .sort((a, b) => (b.type === 'Trailer' ? 1 : 0) - (a.type === 'Trailer' ? 1 : 0))
        .slice(0, 4);

    body.innerHTML = `
        <!-- BACKDROP -->
        <div class="detail-backdrop">
            <img src="${movie.backdrop_path ? IMG_ORIGINAL + movie.backdrop_path : (movie.poster_path ? IMG_W780 + movie.poster_path : PLACEHOLDER_POSTER)}" alt="${movie.title}">
            <div class="detail-backdrop-overlay"></div>
        </div>

        <!-- HEADER -->
        <div class="detail-header">
            <div class="detail-poster">
                <img src="${movie.poster_path ? IMG_W500 + movie.poster_path : PLACEHOLDER_POSTER}" alt="${movie.title}">
            </div>
            <div class="detail-info">
                <h1 class="detail-title">${movie.title}</h1>
                ${movie.tagline ? `<p class="detail-tagline">"${movie.tagline}"</p>` : ''}
                
                <div class="detail-meta">
                    <span class="meta-badge rating"><span class="star">⭐</span> ${movie.vote_average ? movie.vote_average.toFixed(1) : '—'} / 10 <span style="opacity:0.6;margin-left:4px">(${movie.vote_count ? movie.vote_count.toLocaleString() : 0} votes)</span></span>
                    ${movie.release_date ? `<span class="meta-badge">📅 ${new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>` : ''}
                    ${movie.runtime ? `<span class="meta-badge">⏱️ ${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m</span>` : ''}
                    ${certification ? `<span class="meta-badge">🎫 ${certification}</span>` : ''}
                    ${movie.original_language ? `<span class="meta-badge">🌐 ${movie.original_language.toUpperCase()}</span>` : ''}
                    ${movie.status ? `<span class="meta-badge">📌 ${movie.status}</span>` : ''}
                </div>

                <div class="detail-genres">
                    ${(movie.genres || []).map(g => `<span class="genre-tag">${g.name}</span>`).join('')}
                </div>

                ${movie.overview ? `<p class="detail-overview">${movie.overview}</p>` : ''}
            </div>
        </div>

        <div class="detail-body">
            <!-- FINANCIALS -->
            ${(movie.budget || movie.revenue) ? `
            <div class="detail-section">
                <h3 class="detail-section-title">💰 Box Office & Financials</h3>
                <div class="finance-grid">
                    ${movie.budget ? `
                    <div class="finance-card">
                        <div class="label">Budget</div>
                        <div class="value blue">${formatCurrency(movie.budget)}</div>
                    </div>` : ''}
                    ${movie.revenue ? `
                    <div class="finance-card">
                        <div class="label">Box Office Revenue</div>
                        <div class="value green">${formatCurrency(movie.revenue)}</div>
                    </div>` : ''}
                    ${profit !== null ? `
                    <div class="finance-card">
                        <div class="label">Profit / Loss</div>
                        <div class="value ${profit >= 0 ? 'green' : 'red'}">${profit >= 0 ? '+' : ''}${formatCurrency(profit)}</div>
                        ${roi ? `<div class="sub">${roi}% ROI</div>` : ''}
                    </div>` : ''}
                    ${movie.popularity ? `
                    <div class="finance-card">
                        <div class="label">Popularity Score</div>
                        <div class="value cyan">${movie.popularity.toFixed(0)}</div>
                    </div>` : ''}
                </div>
            </div>` : ''}

            <!-- WHERE TO WATCH -->
            ${region ? `
            <div class="detail-section">
                <h3 class="detail-section-title">📺 Where to Watch</h3>
                <div class="watch-providers-grid">
                    ${(region.flatrate || []).map(p => `
                        <div class="watch-provider">
                            <img src="${IMG_W500 + p.logo_path}" alt="${p.provider_name}">
                            <div>
                                <div class="provider-name">${p.provider_name}</div>
                                <div class="provider-type">Stream</div>
                            </div>
                        </div>
                    `).join('')}
                    ${(region.rent || []).map(p => `
                        <div class="watch-provider">
                            <img src="${IMG_W500 + p.logo_path}" alt="${p.provider_name}">
                            <div>
                                <div class="provider-name">${p.provider_name}</div>
                                <div class="provider-type">Rent</div>
                            </div>
                        </div>
                    `).join('')}
                    ${(region.buy || []).map(p => `
                        <div class="watch-provider">
                            <img src="${IMG_W500 + p.logo_path}" alt="${p.provider_name}">
                            <div>
                                <div class="provider-name">${p.provider_name}</div>
                                <div class="provider-type">Buy</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <p class="watch-region-note">* Availability data powered by JustWatch. Availability may vary by region.</p>
            </div>` : `
            <div class="detail-section">
                <h3 class="detail-section-title">📺 Where to Watch</h3>
                <div class="no-results">
                    <p>No streaming data available for this title.</p>
                </div>
            </div>`}

            <!-- TRAILERS & VIDEOS -->
            ${trailers.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎥 Trailers & Videos</h3>
                <div class="videos-grid">
                    ${trailers.map(v => `
                        <div class="video-card" onclick="window.open('https://www.youtube.com/watch?v=${v.key}', '_blank')">
                            <img src="https://img.youtube.com/vi/${v.key}/hqdefault.jpg" alt="${v.name}">
                            <div class="video-play"><div class="video-play-btn">▶</div></div>
                            <div class="video-title">${v.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- CAST -->
            ${credits.cast && credits.cast.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎭 Cast</h3>
                <div class="cast-scroll">
                    ${credits.cast.slice(0, 20).map(c => `
                        <div class="cast-card">
                            <img src="${c.profile_path ? IMG_W500 + c.profile_path : PLACEHOLDER_POSTER}" alt="${c.name}" loading="lazy">
                            <div class="cast-name" title="${c.name}">${c.name}</div>
                            <div class="cast-character" title="${c.character}">${c.character || '—'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- KEY CREW -->
            ${(directors.length || writers.length || producers.length || composers.length || dops.length) ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎬 Key Crew</h3>
                <div class="crew-grid">
                    ${directors.map(c => `<div class="crew-item"><div class="crew-name">${c.name}</div><div class="crew-job">Director</div></div>`).join('')}
                    ${writers.map(c => `<div class="crew-item"><div class="crew-name">${c.name}</div><div class="crew-job">${c.job}</div></div>`).join('')}
                    ${producers.map(c => `<div class="crew-item"><div class="crew-name">${c.name}</div><div class="crew-job">Producer</div></div>`).join('')}
                    ${composers.map(c => `<div class="crew-item"><div class="crew-name">${c.name}</div><div class="crew-job">Composer</div></div>`).join('')}
                    ${dops.map(c => `<div class="crew-item"><div class="crew-name">${c.name}</div><div class="crew-job">Cinematographer</div></div>`).join('')}
                </div>
            </div>` : ''}

            <!-- REVIEWS -->
            <div class="detail-section">
                <h3 class="detail-section-title">📝 Reviews ${reviews.results.length ? `(${reviews.total_results})` : ''}</h3>
                ${reviews.results.length ? reviews.results.slice(0, 5).map(r => {
                    const avatarUrl = r.author_details.avatar_path
                        ? (r.author_details.avatar_path.startsWith('/http')
                            ? r.author_details.avatar_path.substring(1)
                            : IMG_W500 + r.author_details.avatar_path)
                        : null;
                    const initial = r.author ? r.author.charAt(0).toUpperCase() : '?';
                    const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
                    const rating = r.author_details.rating;
                    return `
                    <div class="review-card">
                        <div class="review-header">
                            <div class="review-avatar">
                                ${avatarUrl ? `<img src="${avatarUrl}" alt="${r.author}">` : initial}
                            </div>
                            <div>
                                <div class="review-author">${r.author}</div>
                                <div class="review-date">${date}</div>
                            </div>
                            ${rating ? `<div class="review-rating-badge">⭐ ${rating}/10</div>` : ''}
                        </div>
                        <div class="review-content" id="review-${r.id}">${r.content.replace(/\n/g, '<br>')}</div>
                        <button class="review-toggle" onclick="toggleReview('review-${r.id}', this)">Read more</button>
                    </div>`;
                }).join('') : `
                <div class="no-results">
                    <p>No reviews available yet. Be the first to review on TMDB!</p>
                </div>`}
            </div>

            <!-- PRODUCTION COMPANIES -->
            ${movie.production_companies && movie.production_companies.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🏢 Production</h3>
                <div class="watch-providers-grid">
                    ${movie.production_companies.map(c => `
                        <div class="watch-provider">
                            ${c.logo_path ? `<img src="${IMG_W500 + c.logo_path}" alt="${c.name}" style="background:white;padding:4px;border-radius:4px;">` : '<div style="width:36px;height:36px;background:var(--bg-glass-light);border-radius:4px;display:flex;align-items:center;justify-content:center">🏢</div>'}
                            <div>
                                <div class="provider-name">${c.name}</div>
                                ${c.origin_country ? `<div class="provider-type">${c.origin_country}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- SIMILAR MOVIES -->
            ${similar.results && similar.results.length ? `
            <div class="detail-section">
                <h3 class="detail-section-title">🎞️ Similar Movies</h3>
                <div class="similar-scroll movie-scroll">
                    ${similar.results.slice(0, 12).map((m, i) => `
                        <div class="movie-card" onclick="openMovieDetail(${m.id})" style="animation-delay: ${i * 0.05}s">
                            <div class="poster-wrapper">
                                <img class="poster" src="${m.poster_path ? IMG_W500 + m.poster_path : PLACEHOLDER_POSTER}" alt="${m.title}" loading="lazy">
                                <div class="card-rating" style="color: ${getRatingColor(m.vote_average)}">
                                    ⭐ ${m.vote_average ? m.vote_average.toFixed(1) : '—'}
                                </div>
                                <div class="poster-overlay"><span>View Details →</span></div>
                            </div>
                            <div class="card-body">
                                <div class="card-title" title="${m.title}">${m.title}</div>
                                <div class="card-meta"><span>${m.release_date ? m.release_date.substring(0, 4) : 'TBA'}</span></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}
        </div>
    `;

    modal.classList.remove('hidden');
    modal.scrollTop = 0;
}

function toggleReview(id, btn) {
    const el = document.getElementById(id);
    el.classList.toggle('expanded');
    btn.textContent = el.classList.contains('expanded') ? 'Show less' : 'Read more';
}

function closeModal() {
    document.getElementById('movie-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

// ==================== NAVIGATION ====================
function goHome() {
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('trending-section').classList.remove('hidden');
    document.getElementById('scroll-indicator').classList.remove('hidden');
    document.getElementById('search-input').value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== UTILITY ====================
function showLoading() { document.getElementById('loading').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading').classList.add('hidden'); }

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}
