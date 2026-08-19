"""
CineScope — API Configuration
All API keys are stored server-side for security.
"""

# ── OMDB API (Open Movie Database) ──────────────────────────
# Provides: Title, Year, Plot, Ratings (IMDB, Rotten Tomatoes, Metacritic), Awards
OMDB_API_KEY = "b501ccee"
OMDB_BASE_URL = "http://www.omdbapi.com/"

# ── TMDB API (The Movie Database) ───────────────────────────
# Provides: Posters, Cast, Crew, Budget, Revenue, Reviews, Similar, Genres
TMDB_API_KEY = "5ad127b6be5b77aa124a8c1743dd33e7"
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMG_BASE = "https://image.tmdb.org/t/p/"

# ── Watchmode API ───────────────────────────────────────────
# Provides: Streaming availability (Netflix, Prime, Disney+, etc.)
WATCHMODE_API_KEY = "8e4svmLGGt4J6vyCqMMrcAu4OoIWg3ETaz4Mzsxq"
WATCHMODE_BASE_URL = "https://api.watchmode.com/v1"

# ── YouTube Data API v3 ────────────────────────────────────
# Provides: Official trailers and video clips
YOUTUBE_API_KEY = "AIzaSyBwB_Ls-jh-9KmVtirmUueQAFC8OG5uPzM"
YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3"
