# CineScope 🎬 — Movie Reviewer & Explorer

A premium, full-stack movie discovery platform powered by **5 APIs** and built with **Python + JavaScript**. Search any movie and instantly get comprehensive details, ratings, reviews, box office, streaming options, trailers, and AI-powered insights!

![CineScope](https://img.shields.io/badge/CineScope-Movie%20Reviewer-7c5cfc?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-Flask-3776ab?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)
![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285f4?style=for-the-badge&logo=google&logoColor=white)

## ✨ Features

| Feature | Data Source |
|---------|------------|
| 🔍 Smart Search with autocomplete | TMDB |
| 🤖 AI Verdict, Themes, Pros & Cons, Recommendations | Google Gemini AI |
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
- **python-dotenv** — Environment configuration

### Frontend (JavaScript + HTML + CSS)
- **Vanilla JavaScript** — No frameworks, pure performance
- **CSS3** — Custom properties, glassmorphism, animations
- **Google Fonts** — Inter, Outfit, JetBrains Mono

### APIs
- **TMDB** — Posters, cast, crew, budget, revenue, reviews, similar, genres
- **OMDB** — Ratings (IMDb, Rotten Tomatoes, Metacritic), awards, plot
- **Watchmode** — Streaming availability across 200+ services
- **YouTube Data API v3** — Official trailers and video clips
- **Google Gemini API** — AI-powered critical review, themes, strengths/weaknesses & picks

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

# Configure environment variables
# Copy .env.example to .env and insert your API keys
cp .env.example .env

# Run the server
python app.py
```

### Open in Browser
Navigate to **http://localhost:5000** and start exploring movies!

## 📁 Project Structure

```
movie-reviewer/
├── app.py              # Python Flask backend (API aggregation)
├── config.py           # API keys configuration via env vars
├── requirements.txt    # Python dependencies
├── .env.example        # Environment variables template
├── static/
│   ├── index.html      # Frontend HTML
│   ├── style.css       # Premium dark theme CSS
│   └── app.js          # Frontend JavaScript logic
├── README.md
└── .gitignore
```

## 🏗️ Architecture

```
┌─────────────────┐     ┌────────────────────────────────────┐
│                  │     │         Python Flask Server        │
│    Browser       │────▶│                                    │
│  (HTML/CSS/JS)   │◀────│   /api/search                      │
│                  │     │   /api/movie/:id                   │
└─────────────────┘     │   /api/ai-analysis/:id             │
                        │   /api/trending / /api/top-rated   │
                        └──────┬───┬───┬───┬──────────┬───────┘
                               │   │   │   │          │
                    ┌──────────┘   │   │   └──────┐   └──────────┐
                    ▼              ▼   ▼          ▼              ▼
                ┌──────┐    ┌──────┐ ┌─────────┐ ┌─────────┐ ┌────────┐
                │ TMDB │    │ OMDB │ │Watchmode│ │ YouTube │ │ Gemini │
                └──────┘    └──────┘ └─────────┘ └─────────┘ └────────┘
```

## 🎨 Design Highlights

- Ultra-dark premium theme with purple/pink accent gradients
- Floating particle animations on hero section
- Glassmorphism effects with backdrop blur
- AI Movie Analysis section with verdict, score ring, pros & cons, and recommendations
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
- [Google Gemini](https://ai.google.dev/) — Generative movie intelligence
