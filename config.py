"""
CineScope — API Configuration
All API keys are stored server-side for security.
"""

# ── OMDB API (Open Movie Database) ──────────────────────────
# Provides: Title, Year, Plot, Ratings (IMDB, Rotten Tomatoes, Metacritic), Awards
OMDB_API_KEY = "***REMOVED***"
OMDB_BASE_URL = "http://www.omdbapi.com/"

# ── TMDB API (The Movie Database) ───────────────────────────
# Provides: Posters, Cast, Crew, Budget, Revenue, Reviews, Similar, Genres
TMDB_API_KEY = "***REMOVED***"
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMG_BASE = "https://image.tmdb.org/t/p/"

# ── Watchmode API ───────────────────────────────────────────
# Provides: Streaming availability (Netflix, Prime, Disney+, etc.)
WATCHMODE_API_KEY = "***REMOVED***"
WATCHMODE_BASE_URL = "https://api.watchmode.com/v1"

# ── YouTube Data API v3 ────────────────────────────────────
# Provides: Official trailers and video clips
YOUTUBE_API_KEY = "***REMOVED***"
YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3"
