"""
CineScope — Movie Reviewer & Explorer
Python Flask Backend Server

Aggregates data from 4 APIs:
  • OMDB  — Ratings (IMDB, Rotten Tomatoes, Metacritic), Awards, Plot
  • TMDB  — Posters, Cast, Crew, Budget, Revenue, Reviews, Similar, Genres
  • Watchmode — Streaming availability
  • YouTube — Official trailers
"""

import logging
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
from config import (
    OMDB_API_KEY, OMDB_BASE_URL,
    TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMG_BASE,
    WATCHMODE_API_KEY, WATCHMODE_BASE_URL,
    YOUTUBE_API_KEY, YOUTUBE_BASE_URL,
)

# ── App setup ───────────────────────────────────────────────
app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CineScope")


# ═══════════════════════════════════════════════════════════
#  STATIC FILES
# ═══════════════════════════════════════════════════════════

@app.route("/")
def serve_index():
    return send_from_directory("static", "index.html")


# ═══════════════════════════════════════════════════════════
#  TMDB HELPERS
# ═══════════════════════════════════════════════════════════

def tmdb_get(endpoint, params=None):
    """Helper for TMDB API calls."""
    url = f"{TMDB_BASE_URL}{endpoint}"
    p = {"api_key": TMDB_API_KEY}
    if params:
        p.update(params)
    try:
        r = requests.get(url, params=p, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"TMDB error: {e}")
        return {}


# ═══════════════════════════════════════════════════════════
#  SEARCH
# ═══════════════════════════════════════════════════════════

@app.route("/api/search")
def search_movies():
    """Search movies via TMDB."""
    query = request.args.get("q", "").strip()
    page = request.args.get("page", 1, type=int)
    if not query:
        return jsonify({"results": [], "total_pages": 0, "total_results": 0})

    data = tmdb_get("/search/movie", {"query": query, "page": page})
    return jsonify({
        "results": data.get("results", []),
        "total_pages": data.get("total_pages", 0),
        "total_results": data.get("total_results", 0),
        "page": data.get("page", 1),
    })


# ═══════════════════════════════════════════════════════════
#  TRENDING / TOP RATED / UPCOMING
# ═══════════════════════════════════════════════════════════

@app.route("/api/trending")
def trending():
    data = tmdb_get("/trending/movie/week")
    return jsonify({"results": data.get("results", [])})


@app.route("/api/top-rated")
def top_rated():
    data = tmdb_get("/movie/top_rated")
    return jsonify({"results": data.get("results", [])})


@app.route("/api/upcoming")
def upcoming():
    data = tmdb_get("/movie/upcoming")
    return jsonify({"results": data.get("results", [])})


@app.route("/api/now-playing")
def now_playing():
    data = tmdb_get("/movie/now_playing")
    return jsonify({"results": data.get("results", [])})


# ═══════════════════════════════════════════════════════════
#  FULL MOVIE DETAIL (aggregates ALL 4 APIs)
# ═══════════════════════════════════════════════════════════

@app.route("/api/movie/<int:movie_id>")
def movie_detail(movie_id):
    """
    Aggregates data from TMDB, OMDB, Watchmode, and YouTube
    into a single comprehensive response.
    """
    # ── 1. TMDB: core details ──────────────────────────────
    movie = tmdb_get(f"/movie/{movie_id}", {
        "append_to_response": "release_dates"
    })
    if not movie or "id" not in movie:
        return jsonify({"error": "Movie not found"}), 404

    # ── 2. TMDB: credits ──────────────────────────────────
    credits = tmdb_get(f"/movie/{movie_id}/credits")

    # ── 3. TMDB: reviews ──────────────────────────────────
    reviews = tmdb_get(f"/movie/{movie_id}/reviews")

    # ── 4. TMDB: similar ──────────────────────────────────
    similar = tmdb_get(f"/movie/{movie_id}/similar")

    # ── 5. TMDB: watch providers ──────────────────────────
    tmdb_watch = tmdb_get(f"/movie/{movie_id}/watch/providers")

    # ── 6. OMDB: ratings, awards, extra metadata ─────────
    omdb_data = fetch_omdb_data(movie.get("imdb_id") or movie.get("title", ""))

    # ── 7. Watchmode: streaming availability ─────────────
    watchmode_data = fetch_watchmode_data(movie.get("imdb_id", ""))

    # ── 8. YouTube: trailers ─────────────────────────────
    youtube_data = fetch_youtube_trailers(
        movie.get("title", ""),
        movie.get("release_date", "")[:4] if movie.get("release_date") else ""
    )

    # ── Certification ────────────────────────────────────
    certification = ""
    if movie.get("release_dates", {}).get("results"):
        us_release = next(
            (r for r in movie["release_dates"]["results"]
             if r["iso_3166_1"] == "US"), None
        )
        if us_release and us_release.get("release_dates"):
            certification = us_release["release_dates"][0].get("certification", "")

    # ── Build response ───────────────────────────────────
    result = {
        # Core info
        "id": movie.get("id"),
        "title": movie.get("title"),
        "tagline": movie.get("tagline"),
        "overview": movie.get("overview"),
        "release_date": movie.get("release_date"),
        "runtime": movie.get("runtime"),
        "status": movie.get("status"),
        "original_language": movie.get("original_language"),
        "popularity": movie.get("popularity"),
        "imdb_id": movie.get("imdb_id"),
        "certification": certification,

        # Images
        "poster_path": movie.get("poster_path"),
        "backdrop_path": movie.get("backdrop_path"),

        # Genres
        "genres": movie.get("genres", []),

        # Financials
        "budget": movie.get("budget", 0),
        "revenue": movie.get("revenue", 0),

        # TMDB rating
        "vote_average": movie.get("vote_average"),
        "vote_count": movie.get("vote_count"),

        # OMDB enrichment
        "omdb": omdb_data,

        # All ratings aggregated
        "ratings": build_ratings(movie, omdb_data),

        # Credits
        "cast": (credits.get("cast") or [])[:20],
        "crew": {
            "directors": [c for c in (credits.get("crew") or []) if c.get("job") == "Director"],
            "writers": [c for c in (credits.get("crew") or []) if c.get("department") == "Writing"][:4],
            "producers": [c for c in (credits.get("crew") or []) if c.get("job") == "Producer"][:4],
            "composers": [c for c in (credits.get("crew") or []) if c.get("job") == "Original Music Composer"][:2],
            "cinematographers": [c for c in (credits.get("crew") or []) if c.get("job") == "Director of Photography"][:2],
        },

        # Reviews
        "reviews": reviews.get("results", [])[:6],
        "total_reviews": reviews.get("total_results", 0),

        # Streaming / Where to Watch
        "watch_providers": {
            "tmdb": tmdb_watch.get("results", {}),
            "watchmode": watchmode_data,
        },

        # Trailers
        "youtube_trailers": youtube_data,

        # Similar
        "similar": (similar.get("results") or [])[:12],

        # Production
        "production_companies": movie.get("production_companies", []),
        "production_countries": movie.get("production_countries", []),
        "spoken_languages": movie.get("spoken_languages", []),
    }

    return jsonify(result)


# ═══════════════════════════════════════════════════════════
#  OMDB INTEGRATION
# ═══════════════════════════════════════════════════════════

def fetch_omdb_data(imdb_id_or_title):
    """Fetch movie data from OMDB for ratings, awards, etc."""
    if not imdb_id_or_title:
        return {}
    try:
        params = {"apikey": OMDB_API_KEY}
        if imdb_id_or_title.startswith("tt"):
            params["i"] = imdb_id_or_title
        else:
            params["t"] = imdb_id_or_title

        r = requests.get(OMDB_BASE_URL, params=params, timeout=8)
        r.raise_for_status()
        data = r.json()

        if data.get("Response") == "False":
            return {}

        return {
            "rated": data.get("Rated", "N/A"),
            "awards": data.get("Awards", "N/A"),
            "metascore": data.get("Metascore", "N/A"),
            "imdb_rating": data.get("imdbRating", "N/A"),
            "imdb_votes": data.get("imdbVotes", "N/A"),
            "box_office": data.get("BoxOffice", "N/A"),
            "dvd": data.get("DVD", "N/A"),
            "production": data.get("Production", "N/A"),
            "website": data.get("Website", "N/A"),
            "ratings": data.get("Ratings", []),
            "plot": data.get("Plot", ""),
            "director": data.get("Director", ""),
            "actors": data.get("Actors", ""),
            "writer": data.get("Writer", ""),
            "country": data.get("Country", ""),
            "language": data.get("Language", ""),
        }
    except Exception as e:
        logger.warning(f"OMDB fetch error: {e}")
        return {}


# ═══════════════════════════════════════════════════════════
#  WATCHMODE INTEGRATION
# ═══════════════════════════════════════════════════════════

def fetch_watchmode_data(imdb_id):
    """Fetch streaming sources from Watchmode API."""
    if not imdb_id:
        return []
    try:
        # Step 1: Get Watchmode title ID from IMDB ID
        search_url = f"{WATCHMODE_BASE_URL}/search/"
        r = requests.get(search_url, params={
            "apiKey": WATCHMODE_API_KEY,
            "search_field": "imdb_id",
            "search_value": imdb_id,
        }, timeout=8)
        r.raise_for_status()
        search_data = r.json()

        if not search_data.get("title_results"):
            return []

        title_id = search_data["title_results"][0]["id"]

        # Step 2: Get sources for this title
        sources_url = f"{WATCHMODE_BASE_URL}/title/{title_id}/sources/"
        r2 = requests.get(sources_url, params={
            "apiKey": WATCHMODE_API_KEY,
        }, timeout=8)
        r2.raise_for_status()
        sources = r2.json()

        # Deduplicate by name + type
        seen = set()
        unique_sources = []
        for s in sources:
            key = f"{s.get('name', '')}|{s.get('type', '')}"
            if key not in seen:
                seen.add(key)
                unique_sources.append({
                    "name": s.get("name", "Unknown"),
                    "type": s.get("type", ""),
                    "region": s.get("region", "US"),
                    "web_url": s.get("web_url", ""),
                    "price": s.get("price"),
                    "format": s.get("format", ""),
                    "ios_url": s.get("ios_url", ""),
                    "android_url": s.get("android_url", ""),
                })
        return unique_sources

    except Exception as e:
        logger.warning(f"Watchmode fetch error: {e}")
        return []


# ═══════════════════════════════════════════════════════════
#  YOUTUBE INTEGRATION
# ═══════════════════════════════════════════════════════════

def fetch_youtube_trailers(title, year):
    """Search YouTube for official trailers."""
    if not title:
        return []
    try:
        query = f"{title} {year} official trailer".strip()
        r = requests.get(f"{YOUTUBE_BASE_URL}/search", params={
            "key": YOUTUBE_API_KEY,
            "q": query,
            "part": "snippet",
            "type": "video",
            "maxResults": 6,
            "order": "relevance",
            "videoCategoryId": "1",  # Film & Animation
        }, timeout=8)
        r.raise_for_status()
        data = r.json()

        results = []
        for item in data.get("items", []):
            snippet = item.get("snippet", {})
            results.append({
                "video_id": item["id"]["videoId"],
                "title": snippet.get("title", ""),
                "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                "channel": snippet.get("channelTitle", ""),
                "published_at": snippet.get("publishedAt", ""),
            })
        return results

    except Exception as e:
        logger.warning(f"YouTube fetch error: {e}")
        return []


# ═══════════════════════════════════════════════════════════
#  RATINGS AGGREGATOR
# ═══════════════════════════════════════════════════════════

def build_ratings(movie, omdb_data):
    """Aggregate all ratings into a unified structure."""
    ratings = []

    # TMDB rating
    if movie.get("vote_average"):
        ratings.append({
            "source": "TMDB",
            "value": f"{movie['vote_average']:.1f}/10",
            "score": movie["vote_average"],
            "icon": "tmdb",
            "votes": movie.get("vote_count", 0),
        })

    # OMDB ratings (IMDB, Rotten Tomatoes, Metacritic)
    for r in omdb_data.get("ratings", []):
        source = r.get("Source", "")
        value = r.get("Value", "")
        score = 0

        if source == "Internet Movie Database":
            try:
                score = float(value.split("/")[0])
            except (ValueError, IndexError):
                score = 0
            ratings.append({
                "source": "IMDb",
                "value": value,
                "score": score,
                "icon": "imdb",
                "votes": omdb_data.get("imdb_votes", "N/A"),
            })
        elif source == "Rotten Tomatoes":
            try:
                score = float(value.replace("%", "")) / 10
            except ValueError:
                score = 0
            ratings.append({
                "source": "Rotten Tomatoes",
                "value": value,
                "score": score,
                "icon": "rt",
                "votes": None,
            })
        elif source == "Metacritic":
            try:
                score = float(value.split("/")[0]) / 10
            except (ValueError, IndexError):
                score = 0
            ratings.append({
                "source": "Metacritic",
                "value": value,
                "score": score,
                "icon": "metacritic",
                "votes": None,
            })

    return ratings


# ═══════════════════════════════════════════════════════════
#  RUN
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    logger.info("🎬 CineScope server starting on http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
