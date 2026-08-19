"""
CineScope — API Configuration
Loads API keys from environment variables or .env file.
"""

import os

# ── Try loading from .env file ──────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, rely on env vars

# ── OMDB API (Open Movie Database) ──────────────────────────
# Provides: Title, Year, Plot, Ratings (IMDB, Rotten Tomatoes, Metacritic), Awards
OMDB_API_KEY = os.environ.get("OMDB_API_KEY", "")
OMDB_BASE_URL = "http://www.omdbapi.com/"

# ── TMDB API (The Movie Database) ───────────────────────────
# Provides: Posters, Cast, Crew, Budget, Revenue, Reviews, Similar, Genres
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMG_BASE = "https://image.tmdb.org/t/p/"

# ── Watchmode API ───────────────────────────────────────────
# Provides: Streaming availability (Netflix, Prime, Disney+, etc.)
WATCHMODE_API_KEY = os.environ.get("WATCHMODE_API_KEY", "")
WATCHMODE_BASE_URL = "https://api.watchmode.com/v1"

# ── YouTube Data API v3 ────────────────────────────────────
# Provides: Official trailers and video clips
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3"

# ── Google Gemini API ──────────────────────────────────────
# Provides: AI-powered movie analysis, insights, and recommendations
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_MODEL = "gemini-2.0-flash"
