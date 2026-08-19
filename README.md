# CineScope 🎬 — Movie Reviewer & Explorer

A next-generation, full-stack movie discovery platform **powered 100% by Google Gemini AI** and built with **Python + JavaScript**. Search any movie and instantly get comprehensive intelligence, ratings, reviews, box office financials, where to watch, cast & crew, and AI-powered critical analysis!

[![Live Demo](https://img.shields.io/badge/Live%20Demo-movie--reviewer--three.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://movie-reviewer-three.vercel.app/)
![CineScope](https://img.shields.io/badge/CineScope-Movie%20Reviewer-7c5cfc?style=for-the-badge)
![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285f4?style=for-the-badge&logo=google&logoColor=white)
![Python](https://img.shields.io/badge/Python-Flask-3776ab?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)

🌐 **Live Website:** [https://movie-reviewer-three.vercel.app/](https://movie-reviewer-three.vercel.app/)

---

## ✨ Features

| Feature | Powered By |
|---------|------------|
| 🔍 Natural Language & Title Search | Google Gemini AI |
| 🤖 Deep AI Critical Analysis (Verdict, Score, Mood, Best For) | Google Gemini AI |
| ⚖️ AI Strengths & Weaknesses Comparison | Google Gemini AI |
| 💡 Trivia & Fun Facts Generation | Google Gemini AI |
| ⭐ Multi-Source Ratings (IMDb, Rotten Tomatoes, Metacritic, Gemini AI) | Google Gemini AI |
| 💰 Budget, Box Office Revenue, Profit/Loss, ROI % | Google Gemini AI |
| 📺 Where to Stream/Rent/Buy across 200+ services | Google Gemini AI |
| 🎥 Official Trailers & YouTube search clips | Google Gemini AI |
| 🏆 Awards & Accolades (Oscars, Golden Globes, etc.) | Google Gemini AI |
| 🎭 Full Cast & Crew details | Google Gemini AI |
| 📝 Curated Critic & Audience Reviews | Google Gemini AI |
| 🎞️ Similar Movie Recommendations | Google Gemini AI |
| 🔥 Trending / Top Rated / Upcoming / Now Playing | Google Gemini AI |
| 📱 Fully Responsive Dark UI | Vanilla CSS3 |

## 🛠️ Tech Stack

### Backend (Python)
- **Flask** — Lightweight web server
- **Requests** — Communicates with Google Gemini REST API
- **Flask-CORS** — Cross-Origin Resource Sharing
- **python-dotenv** — Environment configuration

### Frontend (JavaScript + HTML + CSS)
- **Vanilla JavaScript** — Pure ES6+ performance
- **CSS3** — Dark glassmorphism, animated gradients, custom SVG artwork
- **Google Fonts** — Inter, Outfit, JetBrains Mono

### API
- **Google Gemini API** (`gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.6-flash`) — Generative movie intelligence & structured encyclopedia

## 🌐 Live Deployment

Try out the live application on Vercel:
👉 **[https://movie-reviewer-three.vercel.app/](https://movie-reviewer-three.vercel.app/)**

## 🚀 Local Getting Started

### Prerequisites
- Python 3.8+
- pip

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/WARRIORXR/movie-reviewer.git
cd movie-reviewer

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Configure environment variables
# Copy .env.example to .env and set your Gemini API key:
cp .env.example .env
```

### 4. Run the Server

```bash
python app.py
```

### 5. Open in Browser
Navigate to **http://localhost:5000** and start exploring!

## 📁 Project Structure

```
movie-reviewer/
├── app.py              # Python Flask server (100% Gemini AI integration)
├── config.py           # Gemini API configuration & fallback models
├── requirements.txt    # Python dependencies
├── .env.example        # Environment template (contains GEMINI_API_KEY)
├── static/
│   ├── index.html      # Frontend interface
│   ├── style.css       # Dark glassmorphic styling
│   └── app.js          # Client-side logic & SVG poster generator
├── README.md
└── .gitignore
```

## 🏗️ Architecture

```
┌─────────────────────────┐          ┌────────────────────────────────┐
│                         │          │      Python Flask Server       │
│     Browser Client      │─────────▶│                                │
│    (HTML / CSS / JS)    │◀─────────│   /api/search                  │
│                         │          │   /api/movie/:title            │
└─────────────────────────┘          │   /api/trending / /api/top-rated   │
                                     └───────────────┬────────────────┘
                                                     │
                                                     ▼
                                     ┌────────────────────────────────┐
                                     │       Google Gemini API        │
                                     │  (Structured JSON Generation)  │
                                     └────────────────────────────────┘
```

## 🎨 Design Highlights

- Ultra-dark aesthetic with purple & pink gradient accents
- Floating particle animations on hero section
- Circular AI score ring with dynamic percentage fills
- Pros & Cons grid with colored indicator borders
- Streaming platform chips with direct watch links
- Responsive grid and drawer system for mobile and desktop

## 📝 License

MIT License — free to use and modify.
