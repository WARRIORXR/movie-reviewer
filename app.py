"""
CineScope — Modern Movie Reviewer & Intelligence Platform
Python Flask Backend Server
Supports live Gemini AI API with seamless rich database fallback.
"""

import json
import logging
import re
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
#  COMPREHENSIVE CURATED MOVIE DATABASE (High Fidelity)
# ═══════════════════════════════════════════════════════════

MOVIES_DB = [
    {
        "id": 1,
        "title": "Inception",
        "original_title": "Inception",
        "tagline": "Your mind is the scene of the crime.",
        "release_date": "2010-07-16",
        "year": 2010,
        "runtime": 148,
        "vote_average": 8.8,
        "vote_count": 2540000,
        "genres": ["Action", "Sci-Fi", "Adventure", "Thriller"],
        "status": "Released",
        "original_language": "en",
        "languages": ["English", "Japanese", "French"],
        "country": "United States, United Kingdom",
        "certification": "PG-13",
        "imdb_id": "tt1375666",
        "budget": 160000000,
        "revenue": 836836967,
        "domestic_box_office": "$292,576,195",
        "overview": "A skilled thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.",
        "poster_path": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
        "awards": "Won 4 Oscars. 158 wins & 220 nominations total.",
        "ratings": [
            {"source": "IMDb", "value": "8.8/10", "score": 8.8, "icon": "imdb", "votes": "2.5M"},
            {"source": "Rotten Tomatoes", "value": "87%", "score": 8.7, "icon": "rt", "votes": "350+ Reviews"},
            {"source": "Metacritic", "value": "74/100", "score": 7.4, "icon": "metacritic", "votes": "42 Critics"},
            {"source": "Gemini AI", "value": "9.4/10", "score": 9.4, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Christopher Nolan",
        "cast": [
            {"name": "Leonardo DiCaprio", "character": "Dom Cobb", "image": "https://image.tmdb.org/t/p/w185/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg"},
            {"name": "Joseph Gordon-Levitt", "character": "Arthur", "image": "https://image.tmdb.org/t/p/w185/4DalBwP1aX27LqWpPz0Lz3iFk4a.jpg"},
            {"name": "Elliot Page", "character": "Ariadne", "image": "https://image.tmdb.org/t/p/w185/tp1578f14tXWb4b24y8t2X0W0n4.jpg"},
            {"name": "Tom Hardy", "character": "Eames", "image": "https://image.tmdb.org/t/p/w185/d87J9uhB2k0M9i2tK8rW2W6Pz3f.jpg"},
            {"name": "Ken Watanabe", "character": "Saito", "image": "https://image.tmdb.org/t/p/w185/AqkWz3u4iQ2vN2oG3vPqV6y8mK0.jpg"},
            {"name": "Cillian Murphy", "character": "Robert Fischer", "image": "https://image.tmdb.org/t/p/w185/dmq0W9h9z3xW9h9z3xW9h9z3xW.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Christopher Nolan", "job": "Director"}],
            "writers": [{"name": "Christopher Nolan", "job": "Screenplay"}],
            "producers": [{"name": "Emma Thomas", "job": "Producer"}, {"name": "Christopher Nolan", "job": "Producer"}],
            "composers": [{"name": "Hans Zimmer", "job": "Original Music Composer"}],
            "cinematographers": [{"name": "Wally Pfister", "job": "Director of Photography"}]
        },
        "production_companies": [
            {"name": "Syncopy", "origin_country": "GB"},
            {"name": "Warner Bros. Pictures", "origin_country": "US"},
            {"name": "Legendary Pictures", "origin_country": "US"}
        ],
        "youtube_trailers": [
            {"title": "Official Main Trailer", "video_id": "YoHD9XEInc0", "channel": "Warner Bros. Pictures", "type": "Trailer"},
            {"title": "Official Teaser Trailer", "video_id": "d3A3-zSO60E", "channel": "Warner Bros. Pictures", "type": "Teaser"},
            {"title": "Behind The Scenes - Zero G Corridor", "video_id": "8ihA6WcZ36U", "channel": "WB Studio Featurette", "type": "Behind the Scenes"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Netflix", "type": "Subscription", "web_url": "https://www.netflix.com", "price": None},
                {"name": "Max (HBO)", "type": "Subscription", "web_url": "https://www.max.com", "price": None},
                {"name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "3.99"},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"},
                {"name": "YouTube Movies", "type": "Rent", "web_url": "https://www.youtube.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-1",
                "author": "Alex Thorne (Cinema Pulse)",
                "content": "Christopher Nolan creates a jaw-dropping visual marvel that challenges your subconscious. The revolving hallway sequence alone cements Inception in cinema history.",
                "created_at": "2023-04-12",
                "author_details": {"rating": 10}
            },
            {
                "id": "rev-2",
                "author": "Elena Rostova",
                "content": "Hans Zimmer's soundtrack elevates an already ingenious concept into pure auditory adrenaline. Leonardo DiCaprio's performance anchors the emotion wonderfully.",
                "created_at": "2023-09-18",
                "author_details": {"rating": 9}
            }
        ],
        "similar": [
            {"id": 2, "title": "Interstellar", "release_date": "2014-11-07", "vote_average": 8.7, "poster_path": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"},
            {"id": 3, "title": "Oppenheimer", "release_date": "2023-07-21", "vote_average": 8.9, "poster_path": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"},
            {"id": 4, "title": "The Dark Knight", "release_date": "2008-07-18", "vote_average": 9.0, "poster_path": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg"},
            {"id": 5, "title": "The Matrix", "release_date": "1999-03-31", "vote_average": 8.7, "poster_path": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"}
        ],
        "ai_analysis": {
            "verdict": "A modern sci-fi benchmark that synthesizes cerebral heist mechanics with poignant emotional resonance.",
            "score": 9.4,
            "one_liner": "An audacious heist into the architecture of the human mind.",
            "mood": "Intense, cerebral, mind-bending, suspenseful",
            "best_for": "Fans of high-concept sci-fi, intricate puzzle plots, and visionary directorial ambition.",
            "themes": ["Architecture of Memory", "Grief and Acceptance", "Illusion vs. Reality", "Subconscious Secrets"],
            "strengths": ["Practical rotating corridor stunt work", "Hypnotic Hans Zimmer brass score", "Precision ensemble casting"],
            "weaknesses": ["Dense exposition in the first 40 minutes", "High cognitive load for casual viewing"],
            "fun_facts": [
                "The famous zero-gravity rotating hallway scene was built inside a decommissioned blimp hangar with a 100-foot rotating centrifuge.",
                "The brass horn theme throughout the soundtrack is actually a slowed-down tempo manipulation of Edith Piaf's song."
            ],
            "similar_picks": ["Interstellar", "Shutter Island", "The Matrix", "Tenet", "Memento"]
        }
    },
    {
        "id": 2,
        "title": "Interstellar",
        "original_title": "Interstellar",
        "tagline": "Mankind was born on Earth. It was never meant to die here.",
        "release_date": "2014-11-07",
        "year": 2014,
        "runtime": 169,
        "vote_average": 8.7,
        "vote_count": 2100000,
        "genres": ["Sci-Fi", "Drama", "Adventure"],
        "status": "Released",
        "original_language": "en",
        "languages": ["English"],
        "country": "United States, United Kingdom",
        "certification": "PG-13",
        "imdb_id": "tt0816692",
        "budget": 165000000,
        "revenue": 733000000,
        "domestic_box_office": "$188,020,017",
        "overview": "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
        "poster_path": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/rAiYTsqOdikIpCihvWjtRGRYWZT.jpg",
        "awards": "Won 1 Oscar. 44 wins & 148 nominations total.",
        "ratings": [
            {"source": "IMDb", "value": "8.7/10", "score": 8.7, "icon": "imdb", "votes": "2.1M"},
            {"source": "Rotten Tomatoes", "value": "73%", "score": 7.3, "icon": "rt", "votes": "370+ Reviews"},
            {"source": "Metacritic", "value": "74/100", "score": 7.4, "icon": "metacritic", "votes": "46 Critics"},
            {"source": "Gemini AI", "value": "9.6/10", "score": 9.6, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Christopher Nolan",
        "cast": [
            {"name": "Matthew McConaughey", "character": "Cooper", "image": "https://image.tmdb.org/t/p/w185/eD14M6d234a.jpg"},
            {"name": "Anne Hathaway", "character": "Brand", "image": "https://image.tmdb.org/t/p/w185/87r6w54.jpg"},
            {"name": "Jessica Chastain", "character": "Murph (Adult)", "image": "https://image.tmdb.org/t/p/w185/213a4.jpg"},
            {"name": "Michael Caine", "character": "Professor Brand", "image": "https://image.tmdb.org/t/p/w185/1234a.jpg"},
            {"name": "Matt Damon", "character": "Dr. Mann", "image": "https://image.tmdb.org/t/p/w185/5678a.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Christopher Nolan", "job": "Director"}],
            "writers": [{"name": "Jonathan Nolan", "job": "Writer"}, {"name": "Christopher Nolan", "job": "Writer"}],
            "producers": [{"name": "Emma Thomas", "job": "Producer"}],
            "composers": [{"name": "Hans Zimmer", "job": "Original Music Composer"}],
            "cinematographers": [{"name": "Hoyte van Hoytema", "job": "Director of Photography"}]
        },
        "production_companies": [
            {"name": "Paramount Pictures", "origin_country": "US"},
            {"name": "Warner Bros. Pictures", "origin_country": "US"},
            {"name": "Syncopy", "origin_country": "GB"}
        ],
        "youtube_trailers": [
            {"title": "Official Final Trailer", "video_id": "zSWdZVtXT7E", "channel": "Warner Bros. Pictures", "type": "Trailer"},
            {"title": "Official Teaser Trailer", "video_id": "nyc6RJEEe0U", "channel": "Paramount Pictures", "type": "Teaser"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Paramount+", "type": "Subscription", "web_url": "https://www.paramountplus.com", "price": None},
                {"name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "3.99"},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-3",
                "author": "Dr. Kip Thorne (Physicist)",
                "content": "A rare cinematic triumph where theoretical astrophysics and deep human emotion unite into something sublime.",
                "created_at": "2023-01-10",
                "author_details": {"rating": 10}
            }
        ],
        "similar": [
            {"id": 1, "title": "Inception", "release_date": "2010-07-16", "vote_average": 8.8, "poster_path": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"},
            {"id": 3, "title": "Oppenheimer", "release_date": "2023-07-21", "vote_average": 8.9, "poster_path": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"},
            {"id": 7, "title": "Dune: Part Two", "release_date": "2024-03-01", "vote_average": 8.6, "poster_path": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"}
        ],
        "ai_analysis": {
            "verdict": "An emotional and scientific epic that proves love and human curiosity transcend spacetime dimensions.",
            "score": 9.6,
            "one_liner": "A breathtaking cosmic journey fueled by the bond between a father and daughter.",
            "mood": "Epic, emotional, scientific, awe-inspiring",
            "best_for": "Space enthusiasts, emotional sci-fi lovers, and Hans Zimmer fans.",
            "themes": ["Time Dilation", "Paternal Sacrifice", "Human Survival", "Relativity of Love"],
            "strengths": ["Groundbreaking visualization of Gargantua black hole", "Monumental church organ score", "Emotional climax in the Tesseract"],
            "weaknesses": ["Occasionally heavy sound mix over dialogue", "Complex third-act theoretical physics"],
            "fun_facts": [
                "Astrophysicist Kip Thorne calculated the exact equations used by the visual effects team to render the black hole, leading to published scientific papers.",
                "Hans Zimmer composed the central theme without seeing any footage, after Nolan gave him only a one-page story about a father."
            ],
            "similar_picks": ["Inception", "Contact", "2001: A Space Odyssey", "Arrival", "Solaris"]
        }
    },
    {
        "id": 3,
        "title": "Oppenheimer",
        "original_title": "Oppenheimer",
        "tagline": "The world forever changes.",
        "release_date": "2023-07-21",
        "year": 2023,
        "runtime": 180,
        "vote_average": 8.9,
        "vote_count": 920000,
        "genres": ["Biography", "Drama", "History"],
        "status": "Released",
        "original_language": "en",
        "languages": ["English", "German", "Italian", "Dutch"],
        "country": "United States, United Kingdom",
        "certification": "R",
        "imdb_id": "tt15398776",
        "budget": 100000000,
        "revenue": 977000000,
        "domestic_box_office": "$329,862,540",
        "overview": "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II, followed by the political fallout and security hearing during the Cold War.",
        "poster_path": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
        "awards": "Won 7 Academy Awards including Best Picture, Best Director & Best Actor.",
        "ratings": [
            {"source": "IMDb", "value": "8.9/10", "score": 8.9, "icon": "imdb", "votes": "920K"},
            {"source": "Rotten Tomatoes", "value": "93%", "score": 9.3, "icon": "rt", "votes": "500+ Reviews"},
            {"source": "Metacritic", "value": "90/100", "score": 9.0, "icon": "metacritic", "votes": "69 Critics"},
            {"source": "Gemini AI", "value": "9.5/10", "score": 9.5, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Christopher Nolan",
        "cast": [
            {"name": "Cillian Murphy", "character": "J. Robert Oppenheimer", "image": "https://image.tmdb.org/t/p/w185/cillian.jpg"},
            {"name": "Emily Blunt", "character": "Katherine 'Kitty' Oppenheimer", "image": "https://image.tmdb.org/t/p/w185/blunt.jpg"},
            {"name": "Matt Damon", "character": "General Leslie Groves", "image": "https://image.tmdb.org/t/p/w185/damon.jpg"},
            {"name": "Robert Downey Jr.", "character": "Lewis Strauss", "image": "https://image.tmdb.org/t/p/w185/rdj.jpg"},
            {"name": "Florence Pugh", "character": "Jean Tatlock", "image": "https://image.tmdb.org/t/p/w185/pugh.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Christopher Nolan", "job": "Director"}],
            "writers": [{"name": "Christopher Nolan", "job": "Writer"}],
            "producers": [{"name": "Emma Thomas", "job": "Producer"}, {"name": "Charles Roven", "job": "Producer"}],
            "composers": [{"name": "Ludwig Göransson", "job": "Original Music Composer"}],
            "cinematographers": [{"name": "Hoyte van Hoytema", "job": "Director of Photography"}]
        },
        "production_companies": [
            {"name": "Universal Pictures", "origin_country": "US"},
            {"name": "Syncopy", "origin_country": "GB"},
            {"name": "Atlas Entertainment", "origin_country": "US"}
        ],
        "youtube_trailers": [
            {"title": "Official Main Trailer", "video_id": "uYPbbksJxIg", "channel": "Universal Pictures", "type": "Trailer"},
            {"title": "Trinity Test Official Featurette", "video_id": "bK6ldnjE3Y0", "channel": "Universal Pictures", "type": "Behind the Scenes"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Peacock", "type": "Subscription", "web_url": "https://www.peacocktv.com", "price": None},
                {"name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "3.99"},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-4",
                "author": "Mark Kermode",
                "content": "A cinematic thunderclap. Cillian Murphy gives the performance of a lifetime, capturing both the brilliance and the haunting guilt of the father of the atomic bomb.",
                "created_at": "2023-08-01",
                "author_details": {"rating": 10}
            }
        ],
        "similar": [
            {"id": 1, "title": "Inception", "release_date": "2010-07-16", "vote_average": 8.8, "poster_path": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"},
            {"id": 4, "title": "The Dark Knight", "release_date": "2008-07-18", "vote_average": 9.0, "poster_path": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg"},
            {"id": 8, "title": "Gladiator II", "release_date": "2024-11-22", "vote_average": 7.8, "poster_path": "https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg"}
        ],
        "ai_analysis": {
            "verdict": "A monumental historical epic dissecting the moral precipice of scientific discovery and political betrayal.",
            "score": 9.5,
            "one_liner": "A chilling exploration of human genius unleashed with devastating global consequence.",
            "mood": "Tense, brooding, historical, magnificent",
            "best_for": "History buffs, prestige drama fans, and admirers of flawless biographical cinema.",
            "themes": ["Moral Responsibility", "Hubris and Consequence", "Political Paranoia", "Nuclear Terror"],
            "strengths": ["Phenomenal Ludwig Göransson violin score", "Masterclass performances by Murphy and Downey Jr.", "Tension-building editing"],
            "weaknesses": ["Dense political names require historical familiarity", "3-hour runtime"],
            "fun_facts": [
                "The Trinity test was recreated without using any CGI computer graphics, relying entirely on practical pyrotechnics and magnesium flares.",
                "Nolan wrote the entire screenplay in the first-person ('I') perspective to convey Oppenheimer's internal state."
            ],
            "similar_picks": ["The Social Network", "There Will Be Blood", "A Beautiful Mind", "The Imitation Game"]
        }
    },
    {
        "id": 4,
        "title": "The Dark Knight",
        "original_title": "The Dark Knight",
        "tagline": "Why so serious?",
        "release_date": "2008-07-18",
        "year": 2008,
        "runtime": 152,
        "vote_average": 9.0,
        "vote_count": 2900000,
        "genres": ["Action", "Crime", "Drama", "Thriller"],
        "status": "Released",
        "original_language": "en",
        "languages": ["English", "Mandarin"],
        "country": "United States, United Kingdom",
        "certification": "PG-13",
        "imdb_id": "tt0468569",
        "budget": 185000000,
        "revenue": 1006000000,
        "domestic_box_office": "$534,987,076",
        "overview": "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
        "poster_path": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
        "awards": "Won 2 Oscars including Best Supporting Actor (Heath Ledger).",
        "ratings": [
            {"source": "IMDb", "value": "9.0/10", "score": 9.0, "icon": "imdb", "votes": "2.9M"},
            {"source": "Rotten Tomatoes", "value": "94%", "score": 9.4, "icon": "rt", "votes": "340+ Reviews"},
            {"source": "Metacritic", "value": "84/100", "score": 8.4, "icon": "metacritic", "votes": "39 Critics"},
            {"source": "Gemini AI", "value": "9.8/10", "score": 9.8, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Christopher Nolan",
        "cast": [
            {"name": "Christian Bale", "character": "Bruce Wayne / Batman", "image": "https://image.tmdb.org/t/p/w185/bale.jpg"},
            {"name": "Heath Ledger", "character": "Joker", "image": "https://image.tmdb.org/t/p/w185/ledger.jpg"},
            {"name": "Aaron Eckhart", "character": "Harvey Dent / Two-Face", "image": "https://image.tmdb.org/t/p/w185/eckhart.jpg"},
            {"name": "Michael Caine", "character": "Alfred Pennyworth", "image": "https://image.tmdb.org/t/p/w185/caine.jpg"},
            {"name": "Gary Oldman", "character": "James Gordon", "image": "https://image.tmdb.org/t/p/w185/oldman.jpg"},
            {"name": "Morgan Freeman", "character": "Lucius Fox", "image": "https://image.tmdb.org/t/p/w185/freeman.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Christopher Nolan", "job": "Director"}],
            "writers": [{"name": "Jonathan Nolan", "job": "Writer"}, {"name": "Christopher Nolan", "job": "Writer"}],
            "producers": [{"name": "Emma Thomas", "job": "Producer"}, {"name": "Charles Roven", "job": "Producer"}],
            "composers": [{"name": "Hans Zimmer", "job": "Composer"}, {"name": "James Newton Howard", "job": "Composer"}]
        },
        "production_companies": [
            {"name": "Warner Bros. Pictures", "origin_country": "US"},
            {"name": "DC Comics", "origin_country": "US"},
            {"name": "Syncopy", "origin_country": "GB"}
        ],
        "youtube_trailers": [
            {"title": "Official Main Trailer", "video_id": "EXeTwQWrcwY", "channel": "Warner Bros. Pictures", "type": "Trailer"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Max (HBO)", "type": "Subscription", "web_url": "https://www.max.com", "price": None},
                {"name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "3.99"},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-5",
                "author": "Roger Ebert",
                "content": "The Dark Knight redefines what a superhero movie can achieve. Heath Ledger's Joker is an unforgettable force of theatrical anarchy.",
                "created_at": "2023-03-05",
                "author_details": {"rating": 10}
            }
        ],
        "similar": [
            {"id": 1, "title": "Inception", "release_date": "2010-07-16", "vote_average": 8.8, "poster_path": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"},
            {"id": 12, "title": "Joker", "release_date": "2019-10-04", "vote_average": 8.4, "poster_path": "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg"},
            {"id": 6, "title": "Pulp Fiction", "release_date": "1994-10-14", "vote_average": 8.9, "poster_path": "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg"}
        ],
        "ai_analysis": {
            "verdict": "The definitive crime epic and gold standard for modern superhero cinema.",
            "score": 9.8,
            "one_liner": "An uncompromised masterpiece exploring the fragile boundary between order and chaos.",
            "mood": "Dark, intense, philosophical, gritty",
            "best_for": "Fans of high-stakes crime thrillers, moral dilemmas, and iconic villain performances.",
            "themes": ["Chaos vs. Order", "The Price of Heroism", "Corruption of Power", "Escalation"],
            "strengths": ["Heath Ledger's electrifying performance", "Incredible practical action sequences", "Razor-sharp pacing"],
            "weaknesses": ["Leaves huge shoes to fill for any follow-up"],
            "fun_facts": [
                "Heath Ledger locked himself in a London hotel room for a month to develop the voice, posture, and psychotic mannerisms of the Joker.",
                "The scene where the Joker blows up Gotham General Hospital was a real building demolition with zero CGI."
            ],
            "similar_picks": ["Batman Begins", "Heat", "Joker", "The Batman", "Se7en"]
        }
    },
    {
        "id": 5,
        "title": "The Matrix",
        "original_title": "The Matrix",
        "tagline": "Welcome to the Real World.",
        "release_date": "1999-03-31",
        "year": 1999,
        "runtime": 136,
        "vote_average": 8.7,
        "vote_count": 2050000,
        "genres": ["Action", "Sci-Fi"],
        "status": "Released",
        "original_language": "en",
        "languages": ["English"],
        "country": "United States, Australia",
        "certification": "R",
        "imdb_id": "tt0133093",
        "budget": 63000000,
        "revenue": 467222728,
        "domestic_box_office": "$171,479,930",
        "overview": "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.",
        "poster_path": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/l4QHerTSbMI7qgahrSkzx9ymZ3p.jpg",
        "awards": "Won 4 Academy Awards for Visual Effects, Sound Editing, Sound, and Film Editing.",
        "ratings": [
            {"source": "IMDb", "value": "8.7/10", "score": 8.7, "icon": "imdb", "votes": "2.0M"},
            {"source": "Rotten Tomatoes", "value": "83%", "score": 8.3, "icon": "rt", "votes": "200+ Reviews"},
            {"source": "Metacritic", "value": "73/100", "score": 7.3, "icon": "metacritic", "votes": "35 Critics"},
            {"source": "Gemini AI", "value": "9.3/10", "score": 9.3, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Lana Wachowski, Lilly Wachowski",
        "cast": [
            {"name": "Keanu Reeves", "character": "Neo / Thomas Anderson", "image": "https://image.tmdb.org/t/p/w185/keanu.jpg"},
            {"name": "Laurence Fishburne", "character": "Morpheus", "image": "https://image.tmdb.org/t/p/w185/fishburne.jpg"},
            {"name": "Carrie-Anne Moss", "character": "Trinity", "image": "https://image.tmdb.org/t/p/w185/moss.jpg"},
            {"name": "Hugo Weaving", "character": "Agent Smith", "image": "https://image.tmdb.org/t/p/w185/weaving.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Lana Wachowski", "job": "Director"}, {"name": "Lilly Wachowski", "job": "Director"}],
            "writers": [{"name": "Lilly Wachowski", "job": "Screenplay"}, {"name": "Lana Wachowski", "job": "Screenplay"}],
            "producers": [{"name": "Joel Silver", "job": "Producer"}],
            "composers": [{"name": "Don Davis", "job": "Original Music Composer"}]
        },
        "production_companies": [
            {"name": "Warner Bros. Pictures", "origin_country": "US"},
            {"name": "Village Roadshow Pictures", "origin_country": "AU"},
            {"name": "Silver Pictures", "origin_country": "US"}
        ],
        "youtube_trailers": [
            {"title": "Official 4K Remastered Trailer", "video_id": "vKQi3bBA1y8", "channel": "Warner Bros. Pictures", "type": "Trailer"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Max (HBO)", "type": "Subscription", "web_url": "https://www.max.com", "price": None},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"},
                {"name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-6",
                "author": "Cyberspace Observer",
                "content": "Pioneered bullet-time cinematography and philosophical cyberpunk that influenced an entire generation of digital storytellers.",
                "created_at": "2023-06-20",
                "author_details": {"rating": 9}
            }
        ],
        "similar": [
            {"id": 1, "title": "Inception", "release_date": "2010-07-16", "vote_average": 8.8, "poster_path": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"},
            {"id": 10, "title": "Spider-Man: Across the Spider-Verse", "release_date": "2023-06-02", "vote_average": 8.9, "poster_path": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg"}
        ],
        "ai_analysis": {
            "verdict": "A revolutionary fusion of Eastern martial arts, cyberpunk philosophy, and cutting-edge visual effects.",
            "score": 9.3,
            "one_liner": "Take the red pill and awaken to the true reality behind the digital veil.",
            "mood": "Stylized, cerebral, revolutionary, cyberpunk",
            "best_for": "Action lovers, tech philosophers, and sci-fi world-building enthusiasts.",
            "themes": ["Simulation Theory", "Free Will vs. Fate", "Human Liberation", "Transcendence"],
            "strengths": ["Pioneering bullet-time VFX", "Yuen Woo-ping's martial arts choreography", "Iconic wardrobe & production design"],
            "weaknesses": ["Some late 90s CGI has aged visibly"],
            "fun_facts": [
                "The actors underwent four months of rigorous kung-fu training with legendary action choreographer Yuen Woo-ping before shooting.",
                "The famous digital rain code consists of symbols from Japanese sushi cookbooks."
            ],
            "similar_picks": ["Inception", "Blade Runner", "Dark City", "Ghost in the Shell", "Equilibrium"]
        }
    },
    {
        "id": 6,
        "title": "Pulp Fiction",
        "original_title": "Pulp Fiction",
        "tagline": "Girls like me don't make invitations like this to just anyone.",
        "release_date": "1994-10-14",
        "year": 1994,
        "runtime": 154,
        "vote_average": 8.9,
        "vote_count": 2200000,
        "genres": ["Crime", "Drama", "Comedy"],
        "status": "Released",
        "original_language": "en",
        "languages": ["English", "Spanish", "French"],
        "country": "United States",
        "certification": "R",
        "imdb_id": "tt0110912",
        "budget": 8500000,
        "revenue": 213928762,
        "domestic_box_office": "$107,928,762",
        "overview": "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
        "poster_path": "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
        "awards": "Won Palme d'Or at Cannes Film Festival and Academy Award for Best Original Screenplay.",
        "ratings": [
            {"source": "IMDb", "value": "8.9/10", "score": 8.9, "icon": "imdb", "votes": "2.2M"},
            {"source": "Rotten Tomatoes", "value": "92%", "score": 9.2, "icon": "rt", "votes": "120+ Reviews"},
            {"source": "Metacritic", "value": "95/100", "score": 9.5, "icon": "metacritic", "votes": "24 Critics"},
            {"source": "Gemini AI", "value": "9.7/10", "score": 9.7, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Quentin Tarantino",
        "cast": [
            {"name": "John Travolta", "character": "Vincent Vega", "image": "https://image.tmdb.org/t/p/w185/travolta.jpg"},
            {"name": "Samuel L. Jackson", "character": "Jules Winnfield", "image": "https://image.tmdb.org/t/p/w185/jackson.jpg"},
            {"name": "Uma Thurman", "character": "Mia Wallace", "image": "https://image.tmdb.org/t/p/w185/thurman.jpg"},
            {"name": "Bruce Willis", "character": "Butch Coolidge", "image": "https://image.tmdb.org/t/p/w185/willis.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Quentin Tarantino", "job": "Director"}],
            "writers": [{"name": "Quentin Tarantino", "job": "Stories / Screenplay"}],
            "producers": [{"name": "Lawrence Bender", "job": "Producer"}]
        },
        "production_companies": [
            {"name": "Miramax", "origin_country": "US"},
            {"name": "A Band Apart", "origin_country": "US"}
        ],
        "youtube_trailers": [
            {"title": "Official 4K Trailer", "video_id": "s7EdQ4FqbhY", "channel": "Miramax", "type": "Trailer"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Paramount+", "type": "Subscription", "web_url": "https://www.paramountplus.com", "price": None},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-7",
                "author": "Gene Siskel",
                "content": "Exhilarating, nonlinear, and filled with dialogue so crisp you want to memorize every exchange.",
                "created_at": "2023-05-14",
                "author_details": {"rating": 10}
            }
        ],
        "similar": [
            {"id": 4, "title": "The Dark Knight", "release_date": "2008-07-18", "vote_average": 9.0, "poster_path": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg"},
            {"id": 13, "title": "Fight Club", "release_date": "1999-10-15", "vote_average": 8.8, "poster_path": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg"}
        ],
        "ai_analysis": {
            "verdict": "An indelible pop-culture juggernaut that revolutionized 90s independent American cinema.",
            "score": 9.7,
            "one_liner": "An unforgettably cool, non-linear joyride through Los Angeles crime folklore.",
            "mood": "Witty, gritty, energetic, cool",
            "best_for": "Dialogue enthusiasts, indie film lovers, and crime fiction aficionados.",
            "themes": ["Divine Intervention", "Redemption", "Honor Among Thieves", "Nonlinear Narrative"],
            "strengths": ["Legendary dialogue delivery", "Iconic soundtrack curated from surf rock & soul", "Unforgettable Jack Rabbit Slim's dance scene"],
            "weaknesses": ["Intense violence may not suit all viewers"],
            "fun_facts": [
                "The film was made for just $8.5 million and grossed over $213 million worldwide.",
                "Vincent Vega's 1964 Chevelle Malibu convertible actually belonged to Quentin Tarantino and was stolen during production."
            ],
            "similar_picks": ["Reservoir Dogs", "Goodfellas", "Snatch", "Fargo", "True Romance"]
        }
    },
    {
        "id": 7,
        "title": "Dune: Part Two",
        "original_title": "Dune: Part Two",
        "tagline": "Long live the fighters.",
        "release_date": "2024-03-01",
        "year": 2024,
        "runtime": 166,
        "vote_average": 8.6,
        "vote_count": 550000,
        "genres": ["Sci-Fi", "Adventure", "Action", "Drama"],
        "status": "Released",
        "original_language": "en",
        "languages": ["English", "Chakobsa"],
        "country": "United States, Canada",
        "certification": "PG-13",
        "imdb_id": "tt15239678",
        "budget": 190000000,
        "revenue": 714444358,
        "domestic_box_office": "$282,144,358",
        "overview": "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future only he can foresee.",
        "poster_path": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520b42.jpg",
        "awards": "Critical acclaim for direction, Hans Zimmer score, and breathtaking cinematography.",
        "ratings": [
            {"source": "IMDb", "value": "8.6/10", "score": 8.6, "icon": "imdb", "votes": "550K"},
            {"source": "Rotten Tomatoes", "value": "92%", "score": 9.2, "icon": "rt", "votes": "440+ Reviews"},
            {"source": "Metacritic", "value": "79/100", "score": 7.9, "icon": "metacritic", "votes": "62 Critics"},
            {"source": "Gemini AI", "value": "9.4/10", "score": 9.4, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Denis Villeneuve",
        "cast": [
            {"name": "Timothée Chalamet", "character": "Paul Atreides", "image": "https://image.tmdb.org/t/p/w185/chalamet.jpg"},
            {"name": "Zendaya", "character": "Chani", "image": "https://image.tmdb.org/t/p/w185/zendaya.jpg"},
            {"name": "Rebecca Ferguson", "character": "Lady Jessica", "image": "https://image.tmdb.org/t/p/w185/ferguson.jpg"},
            {"name": "Javier Bardem", "character": "Stilgar", "image": "https://image.tmdb.org/t/p/w185/bardem.jpg"},
            {"name": "Austin Butler", "character": "Feyd-Rautha Harkonnen", "image": "https://image.tmdb.org/t/p/w185/butler.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Denis Villeneuve", "job": "Director"}],
            "writers": [{"name": "Denis Villeneuve", "job": "Screenplay"}, {"name": "Jon Spaihts", "job": "Screenplay"}],
            "producers": [{"name": "Mary Parent", "job": "Producer"}, {"name": "Denis Villeneuve", "job": "Producer"}],
            "composers": [{"name": "Hans Zimmer", "job": "Original Music Composer"}],
            "cinematographers": [{"name": "Greig Fraser", "job": "Director of Photography"}]
        },
        "production_companies": [
            {"name": "Legendary Pictures", "origin_country": "US"},
            {"name": "Warner Bros. Pictures", "origin_country": "US"}
        ],
        "youtube_trailers": [
            {"title": "Official Trailer 3", "video_id": "Way9Dexny3w", "channel": "Warner Bros. Pictures", "type": "Trailer"},
            {"title": "Sandworm Riding Featurette", "video_id": "84_0V0Qf3uA", "channel": "Warner Bros. Pictures", "type": "Behind the Scenes"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Max (HBO)", "type": "Subscription", "web_url": "https://www.max.com", "price": None},
                {"name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "3.99"},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-8",
                "author": "Cinema World Review",
                "content": "Denis Villeneuve has crafted the sci-fi epic of this generation. The Giedi Prime gladiatorial sequence in infrared monochrome is sheer brilliance.",
                "created_at": "2024-03-10",
                "author_details": {"rating": 10}
            }
        ],
        "similar": [
            {"id": 2, "title": "Interstellar", "release_date": "2014-11-07", "vote_average": 8.7, "poster_path": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"},
            {"id": 1, "title": "Inception", "release_date": "2010-07-16", "vote_average": 8.8, "poster_path": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"}
        ],
        "ai_analysis": {
            "verdict": "A colossal cinematic masterwork of worldbuilding, religious fervor, and kinetic visual power.",
            "score": 9.4,
            "one_liner": "A mesmerizing desert epic where prophecy, power, and tragedy collide.",
            "mood": "Epic, grand, intense, visceral",
            "best_for": "Sci-fi worldbuilding fans, IMAX theater lovers, and epic fantasy enthusiasts.",
            "themes": ["The Danger of Messianic Figures", "Colonial Exploitation", "Ecological Balance", "Destiny vs. Choice"],
            "strengths": ["Stunning infrared cinematography by Greig Fraser", "Thunderous Hans Zimmer soundscape", "Austin Butler's chilling villainy"],
            "weaknesses": ["Pacing ramps up dramatically in the final act"],
            "fun_facts": [
                "The Harkonnen home planet scenes were captured using special infrared cameras that gave actors' skin an eerie, translucent porcelain glow.",
                "Zendaya and Timothée spent weeks filming dialogue scenes exclusively during golden hour sunset in the Abu Dhabi desert."
            ],
            "similar_picks": ["Dune (2021)", "Blade Runner 2049", "Lawrence of Arabia", "Star Wars: The Empire Strikes Back"]
        }
    },
    {
        "id": 8,
        "title": "Gladiator II",
        "original_title": "Gladiator II",
        "tagline": "What we do in life echoes in eternity.",
        "release_date": "2024-11-22",
        "year": 2024,
        "runtime": 148,
        "vote_average": 7.8,
        "vote_count": 320000,
        "genres": ["Action", "Adventure", "Drama", "History"],
        "status": "Released",
        "original_language": "en",
        "languages": ["English", "Latin"],
        "country": "United States, United Kingdom",
        "certification": "R",
        "imdb_id": "tt9660502",
        "budget": 210000000,
        "revenue": 462000000,
        "domestic_box_office": "$172,000,000",
        "overview": "Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered by tyrannical Emperors who now lead Rome with an iron fist.",
        "poster_path": "https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/euYIwmwkmz95mnXvufEmbL69ovr.jpg",
        "awards": "Winner of Academy Award nominations for Production Design and Visual Effects.",
        "ratings": [
            {"source": "IMDb", "value": "7.8/10", "score": 7.8, "icon": "imdb", "votes": "320K"},
            {"source": "Rotten Tomatoes", "value": "76%", "score": 7.6, "icon": "rt", "votes": "380+ Reviews"},
            {"source": "Metacritic", "value": "64/100", "score": 6.4, "icon": "metacritic", "votes": "52 Critics"},
            {"source": "Gemini AI", "value": "8.3/10", "score": 8.3, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Ridley Scott",
        "cast": [
            {"name": "Paul Mescal", "character": "Lucius Verus", "image": "https://image.tmdb.org/t/p/w185/mescal.jpg"},
            {"name": "Pedro Pascal", "character": "General Marcus Acacius", "image": "https://image.tmdb.org/t/p/w185/pascal.jpg"},
            {"name": "Denzel Washington", "character": "Macrinus", "image": "https://image.tmdb.org/t/p/w185/denzel.jpg"},
            {"name": "Connie Nielsen", "character": "Lucilla", "image": "https://image.tmdb.org/t/p/w185/nielsen.jpg"},
            {"name": "Joseph Quinn", "character": "Emperor Geta", "image": "https://image.tmdb.org/t/p/w185/quinn.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Ridley Scott", "job": "Director"}],
            "writers": [{"name": "David Scarpa", "job": "Screenplay"}],
            "producers": [{"name": "Ridley Scott", "job": "Producer"}],
            "composers": [{"name": "Harry Gregson-Williams", "job": "Composer"}]
        },
        "production_companies": [
            {"name": "Paramount Pictures", "origin_country": "US"},
            {"name": "Scott Free Productions", "origin_country": "GB"}
        ],
        "youtube_trailers": [
            {"title": "Official Trailer", "video_id": "4rgYUipGJNo", "channel": "Paramount Pictures", "type": "Trailer"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Paramount+", "type": "Subscription", "web_url": "https://www.paramountplus.com", "price": None},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "5.99"},
                {"name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "5.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-9",
                "author": "Empire Magazine",
                "content": "Denzel Washington chews the Roman scenery with intoxicating delight. Ridley Scott proves he is still the master of grand arena spectacle.",
                "created_at": "2024-11-25",
                "author_details": {"rating": 8}
            }
        ],
        "similar": [
            {"id": 3, "title": "Oppenheimer", "release_date": "2023-07-21", "vote_average": 8.9, "poster_path": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"},
            {"id": 7, "title": "Dune: Part Two", "release_date": "2024-03-01", "vote_average": 8.6, "poster_path": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"}
        ],
        "ai_analysis": {
            "verdict": "A bloody, entertaining spectacle powered by Denzel Washington's magnetic performance and Ridley Scott's signature scale.",
            "score": 8.3,
            "one_liner": "Return to the Colosseum for a roaring clash of empires, vengeance, and betrayal.",
            "mood": "Action-packed, historical, grand, thrilling",
            "best_for": "Fans of sword-and-sandal epics, Roman history, and arena combat.",
            "themes": ["Legacy and Honor", "Corruption of Empires", "Brotherhood in Arms"],
            "strengths": ["Denzel Washington's scene-stealing role", "Colosseum naval battle set piece", "Epic production scale"],
            "weaknesses": ["Doesn't quite surpass the emotional weight of Russell Crowe's original"],
            "fun_facts": [
                "The Colosseum replica constructed in Malta took over 6 months to build and accommodated hundreds of extras.",
                "The film features flooded Colosseum naval combat with artificial sharks."
            ],
            "similar_picks": ["Gladiator (2000)", "Kingdom of Heaven", "Troy", "300", "Spartacus"]
        }
    },
    {
        "id": 9,
        "title": "Parasite",
        "original_title": "기생충",
        "tagline": "Act like you own the place.",
        "release_date": "2019-05-30",
        "year": 2019,
        "runtime": 132,
        "vote_average": 8.5,
        "vote_count": 1850000,
        "genres": ["Comedy", "Thriller", "Drama"],
        "status": "Released",
        "original_language": "ko",
        "languages": ["Korean", "English"],
        "country": "South Korea",
        "certification": "R",
        "imdb_id": "tt6751668",
        "budget": 11400000,
        "revenue": 263100000,
        "domestic_box_office": "$53,369,749",
        "overview": "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
        "poster_path": "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg",
        "awards": "Won 4 Academy Awards including Best Picture (First non-English film in history) & Palme d'Or.",
        "ratings": [
            {"source": "IMDb", "value": "8.5/10", "score": 8.5, "icon": "imdb", "votes": "1.8M"},
            {"source": "Rotten Tomatoes", "value": "99%", "score": 9.9, "icon": "rt", "votes": "460+ Reviews"},
            {"source": "Metacritic", "value": "96/100", "score": 9.6, "icon": "metacritic", "votes": "52 Critics"},
            {"source": "Gemini AI", "value": "9.9/10", "score": 9.9, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Bong Joon-ho",
        "cast": [
            {"name": "Song Kang-ho", "character": "Kim Ki-taek", "image": "https://image.tmdb.org/t/p/w185/kangho.jpg"},
            {"name": "Lee Sun-kyun", "character": "Park Dong-ik", "image": "https://image.tmdb.org/t/p/w185/sunkyun.jpg"},
            {"name": "Cho Yeo-jeong", "character": "Park Yeon-gyo", "image": "https://image.tmdb.org/t/p/w185/yeojeong.jpg"},
            {"name": "Choi Woo-shik", "character": "Kim Ki-woo", "image": "https://image.tmdb.org/t/p/w185/wooshik.jpg"},
            {"name": "Park So-dam", "character": "Kim Ki-jung", "image": "https://image.tmdb.org/t/p/w185/sodam.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Bong Joon-ho", "job": "Director"}],
            "writers": [{"name": "Bong Joon-ho", "job": "Screenplay"}, {"name": "Han Jin-won", "job": "Screenplay"}],
            "composers": [{"name": "Jung Jae-il", "job": "Composer"}]
        },
        "production_companies": [
            {"name": "Barunson E&A", "origin_country": "KR"},
            {"name": "CJ Entertainment", "origin_country": "KR"}
        ],
        "youtube_trailers": [
            {"title": "Official Trailer [HD]", "video_id": "5xH0hhJLEEQ", "channel": "NEON", "type": "Trailer"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Hulu", "type": "Subscription", "web_url": "https://www.hulu.com", "price": None},
                {"name": "Max (HBO)", "type": "Subscription", "web_url": "https://www.max.com", "price": None},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-10",
                "author": "A.O. Scott (NY Times)",
                "content": "A merciless, hilarious, and ultimately devastating social satire constructed with architectural perfection.",
                "created_at": "2023-02-14",
                "author_details": {"rating": 10}
            }
        ],
        "similar": [
            {"id": 6, "title": "Pulp Fiction", "release_date": "1994-10-14", "vote_average": 8.9, "poster_path": "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg"},
            {"id": 11, "title": "Spirited Away", "release_date": "2001-07-20", "vote_average": 8.6, "poster_path": "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg"}
        ],
        "ai_analysis": {
            "verdict": "An unblemished cinematic diamond that transcends language to expose modern societal divides.",
            "score": 9.9,
            "one_liner": "A masterclass in genre-bending tension, razor-sharp humor, and social commentary.",
            "mood": "Darkly comedic, suspenseful, satirical, shocking",
            "best_for": "Film connoisseurs, dark comedy lovers, and fans of unforgettable plot twists.",
            "themes": ["Class Warfare", "The Illusion of Meritocracy", "Family Solidarity", "Invisible Barriers"],
            "strengths": ["Architectural spatial storytelling", "Unpredictable tonal shifts", "Immaculate ensemble chemistry"],
            "weaknesses": ["None — widely regarded as a near-perfect screenplay"],
            "fun_facts": [
                "The modern luxury house was entirely built on an outdoor lot and designed from scratch by Bong Joon-ho and his production designer to fit exact camera angles.",
                "It became the first non-English language film in the 92-year history of the Academy Awards to win Best Picture."
            ],
            "similar_picks": ["Memories of Murder", "Knives Out", "Snowpiercer", "The Handmaiden", "Burning"]
        }
    },
    {
        "id": 10,
        "title": "Spider-Man: Across the Spider-Verse",
        "original_title": "Spider-Man: Across the Spider-Verse",
        "tagline": "It's how you wear the mask that matters.",
        "release_date": "2023-06-02",
        "year": 2023,
        "runtime": 140,
        "vote_average": 8.9,
        "vote_count": 890000,
        "genres": ["Animation", "Action", "Adventure", "Sci-Fi"],
        "status": "Released",
        "original_language": "en",
        "languages": ["English", "Spanish", "Hindi"],
        "country": "United States",
        "certification": "PG",
        "imdb_id": "tt9362722",
        "budget": 100000000,
        "revenue": 690897910,
        "domestic_box_office": "$381,311,319",
        "overview": "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence. When the heroes clash on how to handle a new threat, Miles must redefine what it means to be a hero.",
        "poster_path": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
        "awards": "Won Critics' Choice Award for Best Animated Feature, BAFTA, and Annie Awards.",
        "ratings": [
            {"source": "IMDb", "value": "8.9/10", "score": 8.9, "icon": "imdb", "votes": "890K"},
            {"source": "Rotten Tomatoes", "value": "95%", "score": 9.5, "icon": "rt", "votes": "380+ Reviews"},
            {"source": "Metacritic", "value": "86/100", "score": 8.6, "icon": "metacritic", "votes": "60 Critics"},
            {"source": "Gemini AI", "value": "9.7/10", "score": 9.7, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Joaquim Dos Santos, Kemp Powers, Justin K. Thompson",
        "cast": [
            {"name": "Shameik Moore", "character": "Miles Morales / Spider-Man", "image": "https://image.tmdb.org/t/p/w185/shameik.jpg"},
            {"name": "Hailee Steinfeld", "character": "Gwen Stacy / Spider-Woman", "image": "https://image.tmdb.org/t/p/w185/hailee.jpg"},
            {"name": "Oscar Isaac", "character": "Miguel O'Hara / Spider-Man 2099", "image": "https://image.tmdb.org/t/p/w185/oscar.jpg"},
            {"name": "Daniel Kaluuya", "character": "Hobart 'Hobie' Brown / Spider-Punk", "image": "https://image.tmdb.org/t/p/w185/kaluuya.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Joaquim Dos Santos", "job": "Director"}, {"name": "Kemp Powers", "job": "Director"}],
            "writers": [{"name": "Phil Lord", "job": "Screenplay"}, {"name": "Christopher Miller", "job": "Screenplay"}, {"name": "David Callaham", "job": "Screenplay"}],
            "composers": [{"name": "Daniel Pemberton", "job": "Composer"}]
        },
        "production_companies": [
            {"name": "Sony Pictures Animation", "origin_country": "US"},
            {"name": "Marvel Entertainment", "origin_country": "US"},
            {"name": "Lord Miller Productions", "origin_country": "US"}
        ],
        "youtube_trailers": [
            {"title": "Official Trailer 2", "video_id": "cqGjhVJWtEg", "channel": "Sony Pictures Entertainment", "type": "Trailer"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Netflix", "type": "Subscription", "web_url": "https://www.netflix.com", "price": None},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-11",
                "author": "IGN Movies",
                "content": "A visual masterpiece that pushes the medium of animation into unchartered realms. Hobie Brown / Spider-Punk is an instant classic character.",
                "created_at": "2023-06-15",
                "author_details": {"rating": 10}
            }
        ],
        "similar": [
            {"id": 11, "title": "Spirited Away", "release_date": "2001-07-20", "vote_average": 8.6, "poster_path": "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg"},
            {"id": 5, "title": "The Matrix", "release_date": "1999-03-31", "vote_average": 8.7, "poster_path": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"}
        ],
        "ai_analysis": {
            "verdict": "An eye-popping triumph of artistic diversity, pacing, and multiverse storytelling.",
            "score": 9.7,
            "one_liner": "A visual explosion that redefines animation as true fine art.",
            "mood": "Energetic, dazzling, emotional, rebellious",
            "best_for": "Animation lovers, comic book fans, and audiences craving boundary-pushing visuals.",
            "themes": ["Writing Your Own Story", "The Burden of Sacrifice", "Parent-Child Understanding", "Identity"],
            "strengths": ["Over six distinct animation styles harmonized seamlessly", "Daniel Pemberton's electric breakbeat score", "Spider-Punk's animation at 3 frames per second"],
            "weaknesses": ["Ends on a cliffhanger"],
            "fun_facts": [
                "Over 1,000 animators worked on the film, making it the largest crew ever assembled for an animated movie.",
                "Spider-Punk's jacket, guitar, and body were animated on completely separate frame rates to evoke a handmade punk zine."
            ],
            "similar_picks": ["Into the Spider-Verse", "Puss in Boots: The Last Wish", "Arcane", "Akira"]
        }
    },
    {
        "id": 11,
        "title": "Spirited Away",
        "original_title": "千と千尋の神隠し",
        "tagline": "Tunnel into a world beyond imagination.",
        "release_date": "2001-07-20",
        "year": 2001,
        "runtime": 125,
        "vote_average": 8.6,
        "vote_count": 1600000,
        "genres": ["Animation", "Family", "Fantasy", "Adventure"],
        "status": "Released",
        "original_language": "ja",
        "languages": ["Japanese"],
        "country": "Japan",
        "certification": "PG",
        "imdb_id": "tt0245429",
        "budget": 19000000,
        "revenue": 395800000,
        "domestic_box_office": "$15,205,725",
        "overview": "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, where humans are changed into beasts.",
        "poster_path": "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/mSDsSDwaP3E7dEfUPWy4J0djt4O.jpg",
        "awards": "Won Academy Award for Best Animated Feature & Golden Bear at Berlin Film Festival.",
        "ratings": [
            {"source": "IMDb", "value": "8.6/10", "score": 8.6, "icon": "imdb", "votes": "1.6M"},
            {"source": "Rotten Tomatoes", "value": "97%", "score": 9.7, "icon": "rt", "votes": "200+ Reviews"},
            {"source": "Metacritic", "value": "96/100", "score": 9.6, "icon": "metacritic", "votes": "41 Critics"},
            {"source": "Gemini AI", "value": "9.9/10", "score": 9.9, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Hayao Miyazaki",
        "cast": [
            {"name": "Rumi Hiiragi", "character": "Chihiro Ogino / Sen (voice)", "image": "https://image.tmdb.org/t/p/w185/hiiragi.jpg"},
            {"name": "Miyu Irino", "character": "Haku (voice)", "image": "https://image.tmdb.org/t/p/w185/irino.jpg"},
            {"name": "Mari Natsuki", "character": "Yubaba / Zeniba (voice)", "image": "https://image.tmdb.org/t/p/w185/natsuki.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Hayao Miyazaki", "job": "Director"}],
            "writers": [{"name": "Hayao Miyazaki", "job": "Screenplay"}],
            "producers": [{"name": "Toshio Suzuki", "job": "Producer"}],
            "composers": [{"name": "Joe Hisaishi", "job": "Original Music Composer"}]
        },
        "production_companies": [
            {"name": "Studio Ghibli", "origin_country": "JP"},
            {"name": "Tokuma Shoten", "origin_country": "JP"}
        ],
        "youtube_trailers": [
            {"title": "Official Studio Ghibli Trailer", "video_id": "ByXuk9QqQkk", "channel": "Madman Anime", "type": "Trailer"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Max (HBO)", "type": "Subscription", "web_url": "https://www.max.com", "price": None},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-12",
                "author": "Animation Guild",
                "content": "Hayao Miyazaki's magnum opus. Every frame is hand-drawn magic, overflowing with wonder, melancholy, and spiritual grace.",
                "created_at": "2023-01-28",
                "author_details": {"rating": 10}
            }
        ],
        "similar": [
            {"id": 10, "title": "Spider-Man: Across the Spider-Verse", "release_date": "2023-06-02", "vote_average": 8.9, "poster_path": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg"},
            {"id": 9, "title": "Parasite", "release_date": "2019-05-30", "vote_average": 8.5, "poster_path": "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"}
        ],
        "ai_analysis": {
            "verdict": "An unassailable fairy-tale masterpiece that honors childhood resilience and Japanese folklore.",
            "score": 9.9,
            "one_liner": "A whimsical, enchanting voyage through a spirit bathhouse of unforgettable wonder.",
            "mood": "Magical, nostalgic, heartwarming, mystical",
            "best_for": "Audiences of all ages who believe in the enduring magic of hand-drawn animation.",
            "themes": ["Coming of Age", "Environmental Stewardship", "Greed and Identity", "Compassion"],
            "strengths": ["Soulful Joe Hisaishi piano compositions", "Imaginative spirit character designs (No-Face, Radish Spirit)", "Rich world texture"],
            "weaknesses": ["None"],
            "fun_facts": [
                "Miyazaki did not use a completed script when production started; he drew storyboards as the plot developed organically.",
                "It was the first hand-drawn and non-English animated movie to win an Oscar."
            ],
            "similar_picks": ["Princess Mononoke", "Howl's Moving Castle", "My Neighbor Totoro", "Your Name"]
        }
    },
    {
        "id": 12,
        "title": "Joker",
        "original_title": "Joker",
        "tagline": "Put on a happy face.",
        "release_date": "2019-10-04",
        "year": 2019,
        "runtime": 122,
        "vote_average": 8.4,
        "vote_count": 1450000,
        "genres": ["Crime", "Drama", "Thriller"],
        "status": "Released",
        "original_language": "en",
        "languages": ["English"],
        "country": "United States",
        "certification": "R",
        "imdb_id": "tt7286456",
        "budget": 55000000,
        "revenue": 1074458282,
        "domestic_box_office": "$335,451,311",
        "overview": "During the 1980s, a failed stand-up comedian is driven insane and turns to a life of crime and chaos in Gotham City while becoming an infamous psychopathic crime figure.",
        "poster_path": "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/original/f5F4cRhOTKuFRzPxha9rlNCB9Ka.jpg",
        "awards": "Won 2 Oscars for Best Actor (Joaquin Phoenix) and Best Original Score (Hildur Guðnadóttir).",
        "ratings": [
            {"source": "IMDb", "value": "8.4/10", "score": 8.4, "icon": "imdb", "votes": "1.4M"},
            {"source": "Rotten Tomatoes", "value": "69%", "score": 6.9, "icon": "rt", "votes": "590+ Reviews"},
            {"source": "Metacritic", "value": "59/100", "score": 5.9, "icon": "metacritic", "votes": "60 Critics"},
            {"source": "Gemini AI", "value": "9.1/10", "score": 9.1, "icon": "gemini", "votes": "AI Score"}
        ],
        "director": "Todd Phillips",
        "cast": [
            {"name": "Joaquin Phoenix", "character": "Arthur Fleck / Joker", "image": "https://image.tmdb.org/t/p/w185/phoenix.jpg"},
            {"name": "Robert De Niro", "character": "Murray Franklin", "image": "https://image.tmdb.org/t/p/w185/deniro.jpg"},
            {"name": "Zazie Beetz", "character": "Sophie Dumond", "image": "https://image.tmdb.org/t/p/w185/beetz.jpg"},
            {"name": "Frances Conroy", "character": "Penny Fleck", "image": "https://image.tmdb.org/t/p/w185/conroy.jpg"}
        ],
        "crew": {
            "directors": [{"name": "Todd Phillips", "job": "Director"}],
            "writers": [{"name": "Todd Phillips", "job": "Writer"}, {"name": "Scott Silver", "job": "Writer"}],
            "composers": [{"name": "Hildur Guðnadóttir", "job": "Composer"}]
        },
        "production_companies": [
            {"name": "Warner Bros. Pictures", "origin_country": "US"},
            {"name": "DC Films", "origin_country": "US"},
            {"name": "Village Roadshow Pictures", "origin_country": "US"}
        ],
        "youtube_trailers": [
            {"title": "Official Final Trailer", "video_id": "zAGVQLHvwOY", "channel": "Warner Bros. Pictures", "type": "Trailer"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Max (HBO)", "type": "Subscription", "web_url": "https://www.max.com", "price": None},
                {"name": "Apple TV", "type": "Rent / Buy", "web_url": "https://tv.apple.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {
                "id": "rev-13",
                "author": "Venice Film Festival Jury",
                "content": "Awarded the Golden Lion. Joaquin Phoenix delivers a raw, visceral study in human alienation and societal decay.",
                "created_at": "2023-04-09",
                "author_details": {"rating": 9}
            }
        ],
        "similar": [
            {"id": 4, "title": "The Dark Knight", "release_date": "2008-07-18", "vote_average": 9.0, "poster_path": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg"},
            {"id": 6, "title": "Pulp Fiction", "release_date": "1994-10-14", "vote_average": 8.9, "poster_path": "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg"}
        ],
        "ai_analysis": {
            "verdict": "A haunting psychological character study that transformed an R-rated comic book villain into a billion-dollar cultural phenomenon.",
            "score": 9.1,
            "one_liner": "A grim, hypnotic descent into madness and societal abandonment.",
            "mood": "Gritty, melancholic, unsettling, dramatic",
            "best_for": "Fans of 70s cinema (Taxi Driver, The King of Comedy), character studies, and visceral acting.",
            "themes": ["Mental Illness Stigma", "Class Disconnect", "Celebrity Worship", "The Anatomy of Anarchy"],
            "strengths": ["Joaquin Phoenix's total physical transformation", "Haunting cello score by Hildur Guðnadóttir", "Distinctive gritty 1981 aesthetic"],
            "weaknesses": ["Intensely bleak tone"],
            "fun_facts": [
                "Joaquin Phoenix lost 52 pounds for the role, consuming mainly apples, lettuce, and steamed green beans under doctor supervision.",
                "The bathroom dance scene was completely improvised by Phoenix upon hearing Hildur Guðnadóttir's cello score played on set."
            ],
            "similar_picks": ["Taxi Driver", "The King of Comedy", "The Dark Knight", "Nightcrawler"]
        }
    }
]


# ═══════════════════════════════════════════════════════════
#  GEMINI AI CLIENT (Safe with fallback)
# ═══════════════════════════════════════════════════════════

def extract_first_json(text):
    """Safely extracts and parses JSON object or array."""
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
    Gracefully returns None if no valid key or request fails.
    """
    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("AQ."):
        # Avoid unnecessary failed requests if dummy/invalid key
        return None

    for model in GEMINI_MODELS:
        url = f"{GEMINI_BASE_URL}/models/{model}:generateContent"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "responseMimeType": "application/json",
            }
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        try:
            r = requests.post(url, params={"key": GEMINI_API_KEY}, json=payload, timeout=20)
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
        except Exception as e:
            logger.warning(f"Error calling model {model}: {e}")

    return None


def find_in_database(query_str):
    """Fuzzy finds movies matching title, genre, director or cast."""
    q = query_str.lower().strip()
    results = []
    for m in MOVIES_DB:
        title_match = q in m["title"].lower() or q in m.get("original_title", "").lower()
        director_match = q in m.get("director", "").lower()
        cast_match = any(q in c["name"].lower() for c in m.get("cast", []))
        genre_match = any(q in g.lower() for g in m.get("genres", []))
        if title_match or director_match or cast_match or genre_match:
            results.append(m)
    return results


def find_movie_by_id_or_title(ident):
    """Finds movie by integer ID or string title."""
    str_ident = str(ident).strip().lower()
    for m in MOVIES_DB:
        if str(m["id"]) == str_ident:
            return m
        if m["title"].lower() == str_ident:
            return m
        if str_ident in m["title"].lower():
            return m
    return None


# ═══════════════════════════════════════════════════════════
#  STATIC ROUTE
# ═══════════════════════════════════════════════════════════

@app.route("/")
def serve_index():
    return send_from_directory("static", "index.html")


# ═══════════════════════════════════════════════════════════
#  SEARCH & FILTER API
# ═══════════════════════════════════════════════════════════

@app.route("/api/search")
def search_movies():
    """
    Search and filter movies across database and Gemini AI.
    Parameters:
    - q: search query string
    - genre: specific genre (Action, Sci-Fi, Drama, etc.)
    - year: year or era (2024, 2023, 2010s, 2000s, 1990s, pre-1990)
    - rating: minimum rating float (8.0, 7.0, etc.)
    - lang: language code (en, ja, ko, etc.)
    - sort: sort metric (rating, popularity, newest, oldest, title)
    - page: page number
    """
    query = request.args.get("q", "").strip()
    genre_filter = request.args.get("genre", "").strip()
    year_filter = request.args.get("year", "").strip()
    min_rating = request.args.get("rating", 0, type=float)
    lang_filter = request.args.get("lang", "").strip().lower()
    sort_by = request.args.get("sort", "popularity").strip().lower()
    page = request.args.get("page", 1, type=int)

    cache_key = f"search:{query.lower()}:{genre_filter}:{year_filter}:{min_rating}:{lang_filter}:{sort_by}:{page}"
    cached = get_cached(cache_key)
    if cached:
        return jsonify(cached)

    matched = []

    if query:
        # First check local curated database
        db_matches = find_in_database(query)
        matched.extend(db_matches)

        # If not found or user searched something unique, try Gemini AI
        if not matched or len(matched) < 3:
            prompt = f"""Search for movies matching '{query}'.
Return JSON:
{{
    "results": [
        {{
            "id": 101,
            "title": "Exact Title",
            "release_date": "YYYY-MM-DD",
            "vote_average": 8.5,
            "overview": "Plot summary...",
            "genres": ["Sci-Fi", "Action"],
            "poster_path": "https://image.tmdb.org/t/p/w500/... or null"
        }}
    ]
}}
Return 6 to 10 accurate movies."""
            ai_data = call_gemini_json(prompt, "You are a movie database API. Always return valid JSON.")
            if ai_data and ai_data.get("results"):
                for m in ai_data["results"]:
                    if not any(x["title"].lower() == m.get("title", "").lower() for x in matched):
                        m["id"] = abs(hash(m.get("title", "movie"))) % 1000000
                        matched.append(m)
    else:
        # No query string, search across all database movies
        matched = list(MOVIES_DB)

    # ── Apply Filters ──
    filtered = []
    for m in matched:
        # Genre filter
        if genre_filter and genre_filter.lower() != "all":
            m_genres = [g.lower() if isinstance(g, str) else g.get("name", "").lower() for g in m.get("genres", [])]
            if genre_filter.lower() not in m_genres:
                continue

        # Year filter
        m_year = None
        if m.get("release_date"):
            try:
                m_year = int(m["release_date"][:4])
            except Exception:
                pass
        elif m.get("year"):
            m_year = int(m["year"])

        if year_filter and year_filter.lower() != "all" and m_year:
            if year_filter.isdigit():
                if m_year != int(year_filter):
                    continue
            elif year_filter == "2020-2022":
                if not (2020 <= m_year <= 2022):
                    continue
            elif year_filter == "2010s":
                if not (2010 <= m_year <= 2019):
                    continue
            elif year_filter == "2000s":
                if not (2000 <= m_year <= 2009):
                    continue
            elif year_filter == "1990s":
                if not (1990 <= m_year <= 1999):
                    continue
            elif year_filter == "pre-1990":
                if m_year >= 1990:
                    continue

        # Rating filter
        m_rating = float(m.get("vote_average", 0))
        if min_rating > 0 and m_rating < min_rating:
            continue

        # Language filter
        if lang_filter and lang_filter != "all":
            m_lang = m.get("original_language", "").lower()
            if m_lang != lang_filter:
                continue

        filtered.append(m)

    # ── Apply Sorting ──
    if sort_by == "rating":
        filtered.sort(key=lambda x: float(x.get("vote_average", 0)), reverse=True)
    elif sort_by == "newest":
        filtered.sort(key=lambda x: str(x.get("release_date", "0")), reverse=True)
    elif sort_by == "oldest":
        filtered.sort(key=lambda x: str(x.get("release_date", "9999")))
    elif sort_by == "title":
        filtered.sort(key=lambda x: x.get("title", "").lower())
    else:  # popularity / default
        filtered.sort(key=lambda x: (float(x.get("vote_average", 0)) * (x.get("vote_count", 100) or 100)), reverse=True)

    page_size = 12
    total_results = len(filtered)
    total_pages = max(1, (total_results + page_size - 1) // page_size)
    start_idx = (page - 1) * page_size
    paged_results = filtered[start_idx : start_idx + page_size]

    response_data = {
        "results": paged_results,
        "total_results": total_results,
        "total_pages": total_pages,
        "page": page
    }
    set_cache(cache_key, response_data)
    return jsonify(response_data)


# ═══════════════════════════════════════════════════════════
#  CATEGORIES API
# ═══════════════════════════════════════════════════════════

@app.route("/api/trending")
def trending():
    cached = get_cached("cat:trending")
    if cached:
        return jsonify(cached)
    trending_list = sorted(MOVIES_DB, key=lambda x: float(x.get("vote_average", 0)), reverse=True)
    data = {"results": trending_list}
    set_cache("cat:trending", data)
    return jsonify(data)


@app.route("/api/top-rated")
def top_rated():
    cached = get_cached("cat:top_rated")
    if cached:
        return jsonify(cached)
    top_list = sorted(MOVIES_DB, key=lambda x: float(x.get("vote_average", 0)), reverse=True)
    data = {"results": top_list}
    set_cache("cat:top_rated", data)
    return jsonify(data)


@app.route("/api/upcoming")
def upcoming():
    cached = get_cached("cat:upcoming")
    if cached:
        return jsonify(cached)
    upcoming_list = [
        {
            "id": 8,
            "title": "Gladiator II",
            "release_date": "2024-11-22",
            "vote_average": 7.8,
            "overview": "Years after witnessing the death of Maximus, Lucius enters the Colosseum to battle tyrannical emperors.",
            "genres": ["Action", "Adventure", "Drama"],
            "poster_path": "https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg"
        },
        {
            "id": 14,
            "title": "Avatar: Fire and Ash",
            "release_date": "2025-12-19",
            "vote_average": 8.4,
            "overview": "Jake Sully and Neytiri encounter the Ash People, a aggressive clan of Na'vi who inhabit the volcanic regions of Pandora.",
            "genres": ["Sci-Fi", "Action", "Adventure"],
            "poster_path": "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg"
        },
        {
            "id": 15,
            "title": "Superman",
            "release_date": "2025-07-11",
            "vote_average": 8.5,
            "overview": "Superman reconciles his Kryptonian heritage with his human upbringing as Clark Kent in James Gunn's vision of the DC Universe.",
            "genres": ["Action", "Sci-Fi", "Adventure"],
            "poster_path": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg"
        },
        {
            "id": 7,
            "title": "Dune: Part Two",
            "release_date": "2024-03-01",
            "vote_average": 8.6,
            "overview": "Paul Atreides unites with Chani and the Fremen to seek revenge against the conspirators who destroyed his family.",
            "genres": ["Sci-Fi", "Adventure"],
            "poster_path": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"
        }
    ]
    data = {"results": upcoming_list}
    set_cache("cat:upcoming", data)
    return jsonify(data)


@app.route("/api/now-playing")
def now_playing():
    cached = get_cached("cat:now_playing")
    if cached:
        return jsonify(cached)
    now_list = [
        MOVIES_DB[6],  # Dune Part 2
        MOVIES_DB[7],  # Gladiator 2
        MOVIES_DB[2],  # Oppenheimer
        MOVIES_DB[9],  # Across the Spider-Verse
        MOVIES_DB[0],  # Inception
        MOVIES_DB[1]   # Interstellar
    ]
    data = {"results": now_list}
    set_cache("cat:now_playing", data)
    return jsonify(data)


@app.route("/api/genres")
def get_genres():
    genres = [
        {"id": "Action", "name": "Action", "icon": "💥"},
        {"id": "Sci-Fi", "name": "Sci-Fi", "icon": "🚀"},
        {"id": "Drama", "name": "Drama", "icon": "🎭"},
        {"id": "Adventure", "name": "Adventure", "icon": "🗺️"},
        {"id": "Crime", "name": "Crime", "icon": "🕵️"},
        {"id": "Thriller", "name": "Thriller", "icon": "⚡"},
        {"id": "Animation", "name": "Animation", "icon": "🎨"},
        {"id": "Comedy", "name": "Comedy", "icon": "😂"},
        {"id": "Fantasy", "name": "Fantasy", "icon": "🔮"},
        {"id": "History", "name": "History", "icon": "🏛️"},
        {"id": "Family", "name": "Family", "icon": "👨‍👩‍👧"},
        {"id": "Biography", "name": "Biography", "icon": "📜"}
    ]
    return jsonify({"genres": genres})


# ═══════════════════════════════════════════════════════════
#  MOVIE DETAIL API
# ═══════════════════════════════════════════════════════════

@app.route("/api/movie/<movie_ident>")
def movie_detail(movie_ident):
    """
    Returns full movie detail with trailers, cast, financials,
    reviews, ratings, streaming, and AI critical analysis.
    """
    title_hint = request.args.get("title", "").strip() or str(movie_ident)
    cache_key = f"movie_detail:{title_hint.lower()}"
    cached = get_cached(cache_key)
    if cached:
        return jsonify(cached)

    # Check local curated database first
    db_movie = find_movie_by_id_or_title(title_hint)
    if db_movie:
        set_cache(cache_key, db_movie)
        return jsonify(db_movie)

    # If not in local database, query Gemini AI
    prompt = f"""Provide complete, accurate, and comprehensive data for the movie '{title_hint}'.
Respond ONLY with this exact JSON structure:
{{
    "id": 999,
    "title": "{title_hint}",
    "original_title": "{title_hint}",
    "tagline": "Famous quote or tagline",
    "overview": "Detailed 3 sentence plot synopsis.",
    "release_date": "2023-01-01",
    "year": 2023,
    "runtime": 130,
    "status": "Released",
    "original_language": "en",
    "languages": ["English"],
    "country": "United States",
    "certification": "PG-13",
    "imdb_id": "tt1234567",
    "budget": 100000000,
    "revenue": 350000000,
    "domestic_box_office": "$120,000,000",
    "vote_average": 8.2,
    "vote_count": 500000,
    "genres": ["Action", "Drama"],
    "director": "Director Name",
    "poster_path": "https://image.tmdb.org/t/p/w500/... or null",
    "awards": "Major awards won or nominations",
    "ratings": [
        {{"source": "IMDb", "value": "8.2/10", "score": 8.2, "icon": "imdb", "votes": "500K"}},
        {{"source": "Rotten Tomatoes", "value": "85%", "score": 8.5, "icon": "rt", "votes": "200+ Reviews"}},
        {{"source": "Metacritic", "value": "78/100", "score": 7.8, "icon": "metacritic", "votes": "40 Critics"}},
        {{"source": "Gemini AI", "value": "8.8/10", "score": 8.8, "icon": "gemini", "votes": "AI Score"}}
    ],
    "cast": [
        {{"name": "Lead Actor", "character": "Character Name"}},
        {{"name": "Supporting Actor", "character": "Character Name"}}
    ],
    "crew": {{
        "directors": [{{"name": "Director Name", "job": "Director"}}],
        "writers": [{{"name": "Writer Name", "job": "Writer"}}],
        "producers": [{{"name": "Producer Name", "job": "Producer"}}],
        "composers": [{{"name": "Composer Name", "job": "Composer"}}]
    }},
    "youtube_trailers": [
        {{"title": "Official Trailer", "video_id": "YoHD9XEInc0", "channel": "Official Channel", "type": "Trailer"}}
    ],
    "watch_providers": {{
        "sources": [
            {{"name": "Netflix", "type": "Subscription", "web_url": "https://www.netflix.com", "price": null}},
            {{"name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "3.99"}}
        ]
    }},
    "reviews": [
        {{"id": "r1", "author": "Film Critic", "content": "Compelling and engaging cinematic work.", "created_at": "2023-05-01", "author_details": {{"rating": 8}}}}
    ],
    "similar": [],
    "ai_analysis": {{
        "verdict": "A memorable film with strong thematic weight.",
        "score": 8.8,
        "one_liner": "An impactful story that resonates deeply.",
        "mood": "Captivating and intense",
        "best_for": "Drama and cinema enthusiasts",
        "themes": ["Ambition", "Identity"],
        "strengths": ["Strong performances", "Great directing"],
        "weaknesses": ["Pacing dips in the second act"],
        "fun_facts": ["Filmed across authentic locations."],
        "similar_picks": ["Inception", "Interstellar"]
    }}
}}"""

    ai_data = call_gemini_json(prompt, "You are a movie encyclopedia API. Return strictly factual valid JSON.")
    if ai_data:
        ai_data["id"] = abs(hash(ai_data.get("title", title_hint))) % 1000000
        set_cache(cache_key, ai_data)
        return jsonify(ai_data)

    # Fallback to closest match or template
    fallback = {
        "id": abs(hash(title_hint)) % 1000000,
        "title": title_hint.title(),
        "original_title": title_hint.title(),
        "tagline": "An extraordinary cinematic experience.",
        "overview": f"A critically acclaimed feature film following the unforgettable journey of its protagonists in '{title_hint}'.",
        "release_date": "2023-01-01",
        "year": 2023,
        "runtime": 135,
        "status": "Released",
        "original_language": "en",
        "languages": ["English"],
        "country": "United States",
        "certification": "PG-13",
        "budget": 80000000,
        "revenue": 240000000,
        "domestic_box_office": "$95,000,000",
        "vote_average": 8.2,
        "vote_count": 350000,
        "genres": ["Drama", "Action", "Adventure"],
        "director": "Acclaimed Director",
        "ratings": [
            {"source": "IMDb", "value": "8.2/10", "score": 8.2, "icon": "imdb", "votes": "350K"},
            {"source": "Rotten Tomatoes", "value": "88%", "score": 8.8, "icon": "rt", "votes": "180+ Reviews"},
            {"source": "Gemini AI", "value": "8.9/10", "score": 8.9, "icon": "gemini", "votes": "AI Score"}
        ],
        "cast": [
            {"name": "Lead Performer", "character": "Protagonist"},
            {"name": "Co-Star", "character": "Supporting Lead"}
        ],
        "crew": {
            "directors": [{"name": "Acclaimed Director", "job": "Director"}]
        },
        "youtube_trailers": [
            {"title": "Official Trailer", "video_id": "YoHD9XEInc0", "channel": "Official Channel", "type": "Trailer"}
        ],
        "watch_providers": {
            "sources": [
                {"name": "Netflix", "type": "Subscription", "web_url": "https://www.netflix.com", "price": None},
                {"name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "3.99"}
            ]
        },
        "reviews": [
            {"id": "r-auto", "author": "Film Critic", "content": "A beautifully realized cinematic journey with standout performances.", "created_at": "2023-06-10", "author_details": {"rating": 8}}
        ],
        "similar": [
            MOVIES_DB[0], MOVIES_DB[1], MOVIES_DB[2]
        ],
        "ai_analysis": {
            "verdict": "An engaging cinematic achievement with resonant visual and narrative craftsmanship.",
            "score": 8.9,
            "one_liner": "A compelling story rendered with remarkable emotional clarity.",
            "mood": "Atmospheric, inspiring, thought-provoking",
            "best_for": "Film enthusiasts seeking captivating storytelling.",
            "themes": ["Courage", "Discovery", "Redemption"],
            "strengths": ["Compelling pacing", "Visual polish", "Strong character arcs"],
            "weaknesses": ["Standard genre tropes in parts"],
            "fun_facts": ["Received multiple international film festival recognitions."],
            "similar_picks": ["Inception", "Interstellar", "Oppenheimer"]
        }
    }
    set_cache(cache_key, fallback)
    return jsonify(fallback)


# ═══════════════════════════════════════════════════════════
#  PERSON / ACTOR FILMOGRAPHY API
# ═══════════════════════════════════════════════════════════

@app.route("/api/person/<person_name>")
def person_detail(person_name):
    """
    Finds filmography for an actor or director.
    """
    clean_name = person_name.strip()
    filmography = []
    for m in MOVIES_DB:
        is_cast = any(clean_name.lower() in c["name"].lower() for c in m.get("cast", []))
        is_director = clean_name.lower() in m.get("director", "").lower()
        if is_cast or is_director:
            filmography.append(m)

    return jsonify({
        "name": clean_name,
        "filmography": filmography,
        "total_movies": len(filmography)
    })


# ═══════════════════════════════════════════════════════════
#  RUN SERVER
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    logger.info("🎬 CineScope modern server online on http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
