"""
CineScope — Movie Reviewer & Explorer
Python Flask Backend Server
Powered 100% by Google Gemini AI
"""

import json
import logging
import time
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
from config import GEMINI_API_KEY, GEMINI_BASE_URL, GEMINI_MODELS

# ── App setup ───────────────────────────────────────────────
app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CineScope")

# ── In-Memory Cache ─────────────────────────────────────────
CACHE = {}
CACHE_TTL = 3600  # 1 hour


def get_cached(key):
    entry = CACHE.get(key)
    if entry and (time.time() - entry["time"] < CACHE_TTL):
        return entry["data"]
    return None


def set_cache(key, data):
    CACHE[key] = {"time": time.time(), "data": data}


# ═══════════════════════════════════════════════════════════
#  GEMINI AI CLIENT
# ═══════════════════════════════════════════════════════════

def extract_first_json(text):
    """Safely extracts and parses the primary JSON object or array from a string."""
    if not text:
        return None
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    text = text.strip()

    try:
        return json.loads(text)
    except Exception:
        pass

    start_obj = text.find("{")
    start_arr = text.find("[")

    if start_obj != -1 and (start_arr == -1 or start_obj < start_arr):
        end_obj = text.rfind("}")
        if end_obj != -1:
            try:
                return json.loads(text[start_obj : end_obj + 1])
            except Exception:
                pass
    elif start_arr != -1:
        end_arr = text.rfind("]")
        if end_arr != -1:
            try:
                return json.loads(text[start_arr : end_arr + 1])
            except Exception:
                pass

    return None


def call_gemini_json(prompt, system_instruction=None):
    """
    Calls Google Gemini API with JSON structured output mode.
    Tries fallback models if any encounter an error.
    """
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not configured.")
        return None

    for model in GEMINI_MODELS:
        url = f"{GEMINI_BASE_URL}/models/{model}:generateContent"
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "responseMimeType": "application/json",
            }
        }
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        try:
            r = requests.post(
                url,
                params={"key": GEMINI_API_KEY},
                json=payload,
                timeout=25
            )
            if r.status_code == 200:
                data = r.json()
                raw_text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                parsed = extract_first_json(raw_text)
                if parsed is not None:
                    return parsed
                else:
                    logger.warning(f"Could not parse JSON from {model}: {raw_text[:200]}")
            else:
                logger.warning(f"Model {model} returned status {r.status_code}: {r.text[:200]}")
        except Exception as e:
            logger.warning(f"Error calling model {model}: {e}")

    logger.error("All Gemini models failed for prompt.")
    return None


# ═══════════════════════════════════════════════════════════
#  STATIC FILES
# ═══════════════════════════════════════════════════════════

@app.route("/")
def serve_index():
    return send_from_directory("static", "index.html")


# ═══════════════════════════════════════════════════════════
#  SEARCH ENDPOINT
# ═══════════════════════════════════════════════════════════

@app.route("/api/search")
def search_movies():
    """
    Search movies using Gemini AI knowledge base.
    """
    query = request.args.get("q", "").strip()
    page = request.args.get("page", 1, type=int)

    if not query:
        return jsonify({"results": [], "total_pages": 0, "total_results": 0, "page": 1})

    cache_key = f"search:{query.lower()}:{page}"
    cached = get_cached(cache_key)
    if cached:
        return jsonify(cached)

    prompt = f"""Search for movies matching the user query '{query}' (page {page}).
Return a JSON object with this exact schema:
{{
    "results": [
        {{
            "id": 101,
            "title": "Exact Movie Title",
            "release_date": "YYYY-MM-DD",
            "vote_average": 8.8,
            "overview": "2 sentence summary of plot...",
            "genres": ["Sci-Fi", "Action"],
            "poster_path": "https://image.tmdb.org/t/p/w500/... or null"
        }}
    ],
    "total_pages": 1,
    "total_results": 10,
    "page": {page}
}}
Return 6 to 10 relevant and accurate movies."""

    data = call_gemini_json(prompt, "You are a movie database API powered by Gemini AI. Always return precise JSON matching the schema.")
    if not data:
        data = {"results": [], "total_pages": 0, "total_results": 0, "page": page}

    # Ensure integer or string ID is available on all items
    for idx, item in enumerate(data.get("results", [])):
        if "id" not in item:
            item["id"] = abs(hash(item.get("title", f"movie-{idx}"))) % 1000000

    set_cache(cache_key, data)
    return jsonify(data)


# ═══════════════════════════════════════════════════════════
#  CATEGORY ENDPOINTS
# ═══════════════════════════════════════════════════════════

@app.route("/api/trending")
def trending():
    cached = get_cached("cat:trending")
    if cached:
        return jsonify(cached)

    prompt = """Return a list of 12 popular/trending blockbuster movies right now.
Return a JSON object with this exact schema:
{
    "results": [
        {
            "id": 1,
            "title": "Movie Title",
            "release_date": "2024-03-01",
            "vote_average": 8.5,
            "overview": "Short plot synopsis...",
            "genres": ["Action", "Sci-Fi"]
        }
    ]
}"""
    data = call_gemini_json(prompt)
    if not data:
        data = {"results": []}

    for idx, item in enumerate(data.get("results", [])):
        item["id"] = abs(hash(item.get("title", f"trending-{idx}"))) % 1000000

    set_cache("cat:trending", data)
    return jsonify(data)


@app.route("/api/top-rated")
def top_rated():
    cached = get_cached("cat:top_rated")
    if cached:
        return jsonify(cached)

    prompt = """Return a list of 12 all-time highest-rated critically acclaimed movies (e.g. The Shawshank Redemption, The Godfather, The Dark Knight, Pulp Fiction, Inception, Interstellar, 12 Angry Men, etc.).
Return a JSON object with this exact schema:
{
    "results": [
        {
            "id": 1,
            "title": "Movie Title",
            "release_date": "1994-09-23",
            "vote_average": 9.3,
            "overview": "Short plot synopsis...",
            "genres": ["Drama", "Crime"]
        }
    ]
}"""
    data = call_gemini_json(prompt)
    if not data:
        data = {"results": []}

    for idx, item in enumerate(data.get("results", [])):
        item["id"] = abs(hash(item.get("title", f"top-{idx}"))) % 1000000

    set_cache("cat:top_rated", data)
    return jsonify(data)


@app.route("/api/upcoming")
def upcoming():
    cached = get_cached("cat:upcoming")
    if cached:
        return jsonify(cached)

    prompt = """Return a list of 12 highly anticipated upcoming or recent major movie releases.
Return a JSON object with schema:
{
    "results": [
        {
            "id": 1,
            "title": "Movie Title",
            "release_date": "2025-05-15",
            "vote_average": 8.0,
            "overview": "Short plot synopsis...",
            "genres": ["Action", "Adventure"]
        }
    ]
}"""
    data = call_gemini_json(prompt)
    if not data:
        data = {"results": []}

    for idx, item in enumerate(data.get("results", [])):
        item["id"] = abs(hash(item.get("title", f"upcoming-{idx}"))) % 1000000

    set_cache("cat:upcoming", data)
    return jsonify(data)


@app.route("/api/now-playing")
def now_playing():
    cached = get_cached("cat:now_playing")
    if cached:
        return jsonify(cached)

    prompt = """Return a list of 12 movies currently in theaters or recently released on streaming.
Return a JSON object with schema:
{
    "results": [
        {
            "id": 1,
            "title": "Movie Title",
            "release_date": "2024-11-20",
            "vote_average": 7.9,
            "overview": "Short plot synopsis...",
            "genres": ["Drama", "Thriller"]
        }
    ]
}"""
    data = call_gemini_json(prompt)
    if not data:
        data = {"results": []}

    for idx, item in enumerate(data.get("results", [])):
        item["id"] = abs(hash(item.get("title", f"now-{idx}"))) % 1000000

    set_cache("cat:now_playing", data)
    return jsonify(data)


# ═══════════════════════════════════════════════════════════
#  FULL MOVIE DETAIL (100% GEMINI AI POWERED)
# ═══════════════════════════════════════════════════════════

@app.route("/api/movie/<movie_ident>")
def movie_detail(movie_ident):
    """
    Returns complete movie details, financial metrics, streaming info,
    cast, crew, reviews, ratings, and AI analysis from Gemini.
    """
    title_hint = request.args.get("title", "").strip() or str(movie_ident)

    cache_key = f"movie:{title_hint.lower()}"
    cached = get_cached(cache_key)
    if cached:
        return jsonify(cached)

    prompt = f"""Provide complete, accurate, and comprehensive data for the movie '{title_hint}' (ID or Title reference: {movie_ident}).

Respond ONLY with this exact JSON structure:
{{
    "id": 12345,
    "title": "Official Movie Title",
    "tagline": "Famous tagline or quote",
    "overview": "Comprehensive 3-4 sentence plot synopsis without major spoilers.",
    "release_date": "YYYY-MM-DD",
    "runtime": 148,
    "status": "Released",
    "original_language": "en",
    "popularity": 120.5,
    "certification": "PG-13",
    "imdb_id": "tt1375666",
    "genres": [{{"id": 1, "name": "Action"}}, {{"id": 2, "name": "Sci-Fi"}}],
    "budget": 160000000,
    "revenue": 836836967,
    "vote_average": 8.8,
    "vote_count": 2500000,
    "awards": "Won 4 Academy Awards. 158 wins & 220 nominations total.",
    "ratings": [
        {{"source": "IMDb", "value": "8.8/10", "score": 8.8, "icon": "imdb", "votes": "2.5M"}},
        {{"source": "Rotten Tomatoes", "value": "87%", "score": 8.7, "icon": "rt", "votes": null}},
        {{"source": "Metacritic", "value": "74/100", "score": 7.4, "icon": "metacritic", "votes": null}},
        {{"source": "Gemini AI", "value": "9.2/10", "score": 9.2, "icon": "gemini", "votes": "AI Score"}}
    ],
    "omdb": {{
        "awards": "Won 4 Academy Awards. 158 wins & 220 nominations total.",
        "box_office": "$292,576,195",
        "country": "United States, United Kingdom",
        "language": "English, Japanese, French",
        "rated": "PG-13",
        "dvd": "07 Dec 2010"
    }},
    "cast": [
        {{"name": "Leonardo DiCaprio", "character": "Dom Cobb"}},
        {{"name": "Joseph Gordon-Levitt", "character": "Arthur"}},
        {{"name": "Elliot Page", "character": "Ariadne"}},
        {{"name": "Tom Hardy", "character": "Eames"}},
        {{"name": "Ken Watanabe", "character": "Saito"}},
        {{"name": "Cillian Murphy", "character": "Robert Fischer"}},
        {{"name": "Marion Cotillard", "character": "Mal Cobb"}},
        {{"name": "Michael Caine", "character": "Prof. Stephen Miles"}}
    ],
    "crew": {{
        "directors": [{{"name": "Christopher Nolan", "job": "Director"}}],
        "writers": [{{"name": "Christopher Nolan", "job": "Writer"}}],
        "producers": [{{"name": "Emma Thomas", "job": "Producer"}}, {{"name": "Christopher Nolan", "job": "Producer"}}],
        "composers": [{{"name": "Hans Zimmer", "job": "Composer"}}],
        "cinematographers": [{{"name": "Wally Pfister", "job": "Cinematographer"}}]
    }},
    "watch_providers": {{
        "sources": [
            {{"name": "Netflix", "type": "Stream", "web_url": "https://www.netflix.com", "price": null}},
            {{"name": "Max (HBO)", "type": "Stream", "web_url": "https://www.max.com", "price": null}},
            {{"name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "3.99"}},
            {{"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"}},
            {{"name": "YouTube Movies", "type": "Rent", "web_url": "https://www.youtube.com", "price": "3.99"}}
        ]
    }},
    "youtube_trailers": [
        {{"title": "Official Main Trailer", "video_id": "YoHD9XEInc0", "channel": "Warner Bros. Pictures"}},
        {{"title": "Official Teaser Trailer", "video_id": "d3A3-zSO60E", "channel": "Warner Bros. Pictures"}}
    ],
    "reviews": [
        {{
            "id": "rev1",
            "author": "FilmCritic_Alex",
            "content": "A breathtaking masterpiece of original storytelling and visual innovation. Christopher Nolan delivers on every level.",
            "created_at": "2023-05-10",
            "author_details": {{"rating": 10}}
        }},
        {{
            "id": "rev2",
            "author": "CinemaLover99",
            "content": "Hans Zimmer's score paired with stunning cinematography makes this one of the greatest films of the 21st century.",
            "created_at": "2023-08-22",
            "author_details": {{"rating": 9}}
        }}
    ],
    "total_reviews": 2,
    "similar": [
        {{"id": 201, "title": "Interstellar", "release_date": "2014-11-07", "vote_average": 8.7}},
        {{"id": 202, "title": "Shutter Island", "release_date": "2010-02-19", "vote_average": 8.2}},
        {{"id": 203, "title": "The Matrix", "release_date": "1999-03-31", "vote_average": 8.7}},
        {{"id": 204, "title": "Tenet", "release_date": "2020-08-26", "vote_average": 7.3}}
    ],
    "production_companies": [
        {{"name": "Syncopy", "origin_country": "GB"}},
        {{"name": "Warner Bros. Pictures", "origin_country": "US"}},
        {{"name": "Legendary Pictures", "origin_country": "US"}}
    ],
    "spoken_languages": [
        {{"name": "English", "english_name": "English"}},
        {{"name": "Japanese", "english_name": "Japanese"}},
        {{"name": "French", "english_name": "French"}}
    ],
    "ai_analysis": {{
        "verdict": "An essential cinematic achievement that rewards multiple viewings with deeper emotional and intellectual layers.",
        "score": 9.2,
        "one_liner": "A mind-bending heist that dreams bigger than any Hollywood thriller before it.",
        "mood": "Intense, cerebral, and mind-bending",
        "best_for": "Fans of high-concept sci-fi, mind games, and visionary world-building.",
        "themes": ["Nature of Reality", "Grief and Guilt", "Subconscious Desires", "Memory Architecture"],
        "strengths": ["Groundbreaking visual effects", "Iconic Hans Zimmer soundtrack", "Impeccable ensemble cast"],
        "weaknesses": ["Heavy exposition in the first act", "Complex rules demand total focus"],
        "fun_facts": [
            "The revolving hallway sequence was filmed using a massive 100-foot rotating centrifuge set.",
            "The iconic 'BRAAAM' brass horns in the score are slowed-down tempo manipulations of Edith Piaf's 'Non, je ne regrette rien'."
        ],
        "similar_picks": ["Interstellar", "The Prestige", "Memento", "Paprika"]
    }}
}}"""

    data = call_gemini_json(prompt, "You are a movie encyclopedia that generates factual, detailed, high-fidelity movie records in JSON.")
    if not data:
        return jsonify({"error": "Movie details could not be retrieved from Gemini AI."}), 500

    set_cache(cache_key, data)
    return jsonify(data)


@app.route("/api/ai-analysis/<movie_ident>")
def ai_analysis(movie_ident):
    """
    Returns AI analysis for a movie.
    """
    title_hint = request.args.get("title", "").strip() or str(movie_ident)
    movie_res = movie_detail(title_hint)
    try:
        data = movie_res.get_json()
        return jsonify({"ai_analysis": data.get("ai_analysis", {})})
    except Exception:
        return jsonify({"ai_analysis": {}})


# ═══════════════════════════════════════════════════════════
#  RUN
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    logger.info("🎬 CineScope server starting on http://localhost:5000 (Gemini AI Powered)")
    app.run(debug=True, host="0.0.0.0", port=5000)
