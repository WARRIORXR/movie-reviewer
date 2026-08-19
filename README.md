# CineScope 🎬 — Movie Reviewer & Explorer

A premium, full-stack movie discovery platform powered by **4 APIs** and built with **Python + JavaScript**. Search any movie and instantly get comprehensive details.

![CineScope](https://img.shields.io/badge/CineScope-Movie%20Reviewer-7c5cfc?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-Flask-3776ab?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)

## ✨ Features

| Feature | Data Source |
|---------|------------|
| 🔍 Smart Search with autocomplete | TMDB |
| ⭐ Ratings from IMDb, Rotten Tomatoes, Metacritic | OMDB |
| 💰 Budget, Revenue, Profit/Loss, ROI | TMDB |
| 📺 Where to Stream/Rent/Buy (200+ services) | Watchmode |
| 🎥 Official Trailers & Videos | YouTube API |
| 🏆 Awards (Oscars, Golden Globes, etc.) | OMDB |
| 🎭 Full Cast & Crew | TMDB |
| 📝 User Reviews with ratings | TMDB |
| 🎞️ Similar Movies | TMDB |
| 🔥 Trending / Top Rated / Upcoming / Now Playing | TMDB |
| 📱 Fully Responsive Design | — |

## 🛠️ Tech Stack

### Backend (Python)
- **Flask** — Lightweight web framework
- **Requests** — HTTP client for API calls
- **Flask-CORS** — Cross-origin resource sharing

### Frontend (JavaScript + HTML + CSS)
- **Vanilla JavaScript** — No frameworks, pure performance
- **CSS3** — Custom properties, glassmorphism, animations
- **Google Fonts** — Inter, Outfit, JetBrains Mono

### APIs
- **TMDB** — Posters, cast, crew, budget, revenue, reviews, similar, genres
- **OMDB** — Ratings (IMDb, Rotten Tomatoes, Metacritic), awards, plot
- **Watchmode** — Streaming availability across 200+ services
- **YouTube Data API v3** — Official trailers and video clips

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- pip

### Installation

```bash
# Clone the repository
git clone https://github.com/WARRIORXR/movie-reviewer.git
cd movie-reviewer

# Install Python dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

### Open in Browser
Navigate to **http://localhost:5000** and start exploring movies!

## 📁 Project Structure

```
movie-reviewer/
├── app.py              # Python Flask backend (API aggregation)
├── config.py           # API keys configuration
├── requirements.txt    # Python dependencies
├── static/
│   ├── index.html      # Frontend HTML
│   ├── style.css       # Premium dark theme CSS
│   └── app.js          # Frontend JavaScript logic
├── README.md
└── .gitignore
```

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────────────────┐
│                  │     │       Python Flask Server     │
│    Browser       │────▶│                              │
│  (HTML/CSS/JS)   │◀────│   /api/search                │
│                  │     │   /api/movie/:id              │
└─────────────────┘     │   /api/trending               │
                        │   /api/top-rated              │
                        │   /api/upcoming               │
                        │   /api/now-playing             │
                        └──────┬───┬───┬───┬────────────┘
                               │   │   │   │
                    ┌──────────┘   │   │   └──────────┐
                    ▼              ▼   ▼              ▼
                ┌──────┐    ┌──────┐ ┌─────────┐ ┌─────────┐
                │ TMDB │    │ OMDB │ │Watchmode│ │ YouTube │
                └──────┘    └──────┘ └─────────┘ └─────────┘
```

## 🎨 Design Highlights

- Ultra-dark premium theme with purple/pink accent gradients
- Floating particle animations on hero section
- Glassmorphism effects with backdrop blur
- Smooth micro-animations and hover effects
- Aggregated ratings showcase (IMDb, RT, Metacritic, TMDB)
- Streaming availability chips with direct links
- Awards bar with golden styling
- Responsive grid layouts for all screen sizes

## 📝 License

MIT License — free to use and modify.

## 🙏 Credits

- [TMDB](https://www.themoviedb.org/) — Movie data & images
- [OMDB](http://www.omdbapi.com/) — Ratings & awards
- [Watchmode](https://api.watchmode.com/) — Streaming availability
- [YouTube Data API](https://developers.google.com/youtube) — Trailers
