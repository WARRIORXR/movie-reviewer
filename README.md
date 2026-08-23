# CineScope 🎬 — Modern Movie Reviewer & Intelligence Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-movie--reviewer--three.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://movie-reviewer-three.vercel.app/)
![CineScope](https://img.shields.io/badge/CineScope-Pro%20v2.0-7c5cfc?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-Flask-3776ab?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-Glassmorphism%20%2B%20Themes-1572b6?style=for-the-badge&logo=css3&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)

**CineScope** is a high-performance, ultra-modern movie discovery, review, and intelligence platform. Built with a lightweight Python Flask backend and a modern glassmorphic vanilla JavaScript frontend, it delivers official 4K YouTube trailers, multi-source ratings (IMDb, Rotten Tomatoes, Metacritic, Gemini AI), box office financial analytics, streaming availability, cast filmographies, interactive community reviews, persistent watchlists, and AI-powered critical breakdowns.

---

## ✨ Key Features

### 🔍 1. Intelligent Search & Multi-Criteria Filtering
- **Quick Keyboard Search**: Press `/` anywhere to instantly focus the search bar.
- **Real-Time Auto-Suggestions**: Debounced instant suggestions with poster thumbnails, release dates, and star ratings.
- **Dynamic Multi-Filters**:
  - **Genre Pills**: All, Action, Sci-Fi, Drama, Thriller, Crime, Adventure, Animation, Comedy, Fantasy, History.
  - **Release Era**: 2025 (Latest), 2024, 2023, 2020–2022, 2010s, 2000s, 1990s, Pre-1990 Classics.
  - **Rating Range**: Any Rating, 8.5+ ⭐ Masterpiece, 8.0+ ⭐, 7.5+ ⭐, 7.0+ ⭐.
  - **Language**: English, Japanese, Korean, Spanish, French, Hindi, German, Italian.
  - **Sort Modes**: Most Popular, Highest Rated, Newest, Oldest, Title (A–Z).
- **Active Filter Chips**: Removable filter tags with 1-click reset.

### 🎥 2. Cinematic Detail Modal & Embedded 4K Player
- **Official YouTube Player**: Responsive 16:9 embedded player with clip switching tabs (Trailers, Teasers, Featurettes, Behind-the-Scenes).
- **Multi-Source Ratings**: Side-by-side comparison of **IMDb**, **Rotten Tomatoes**, **Metacritic**, and **Gemini AI** scores.
- **Box Office & Financials**: Production budget, worldwide revenue, domestic gross, net profit/loss, and Return on Investment (ROI %).
- **Streaming Tracker**: Instant "Where to Watch" direct links for Netflix, Max, Apple TV, Amazon Prime Video, and YouTube Movies.
- **Clickable Cast & Crew**: Click any actor or director to explore their full filmography.
- **AI Critical Breakdown**: In-depth Gemini AI verdict, key themes, pros/cons, and behind-the-scenes trivia.

### 🔔 3. UI Stability & Modern Feedback System
- **Typed Toast Notifications**: Color-coded toasts with progress bar countdowns and dismiss buttons for `success`, `error`, `warning`, and `info`.
- **Skeleton Shimmer Placeholders**: Smooth loading placeholders during initial boot and category transitions to eliminate layout shifts.
- **Graceful Image Error Handling**: Dynamic fallback SVG posters for missing or broken image URLs.
- **Network Resilience**: Automatic online/offline status detection, error counting, and a top-level network recovery banner.
- **Prevent Double-Submission**: Button loading spinners (`.btn-loading`) with debounced actions.

### 💖 4. Watchlist & Community Reviews
- **Persistent Watchlist**: Save favorites with a single click, stored in browser `localStorage`.
- **Interactive Review System**: 1–10 star interactive selector with real-time feedback, validation, and persistent storage.
- **Social Sharing**: Share to Twitter/X, WhatsApp, Facebook, Reddit, LinkedIn, Telegram, or copy the direct movie URL with 1-click.
- **Theme Toggle**: Seamless switch between Dark Mode and Light Mode with persisted user preference.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.8+, Flask, Flask-CORS, Requests, python-dotenv |
| **Frontend** | HTML5 Semantic Elements, Modern CSS3 (CSS Variables, Flexbox/Grid, Glassmorphism, Keyframe Animations), Vanilla JS (ES6+) |
| **AI Engine** | Google Gemini API (`gemini-3.5-flash`, `gemini-3.1-flash-lite`) with curated in-memory fallback database |
| **Media Player** | Official YouTube Iframe Embed API |
| **Fonts** | Google Fonts (*Outfit*, *Inter*, *JetBrains Mono*) |

---

## 🚀 Getting Started Locally

### Prerequisites
- Python 3.8+ installed
- Git

### 1. Clone Repository
```bash
git clone https://github.com/WARRIORXR/movie-reviewer.git
cd movie-reviewer
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. (Optional) Configure Gemini API Key
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```
> *Note: CineScope includes a rich built-in movie database and will work immediately even without an API key.*

### 4. Start the Application
```bash
python app.py
```

### 5. Access the Web App
Open your browser and navigate to:
```
http://localhost:5000
```

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /` | `GET` | Serves the main web application |
| `GET /api/trending` | `GET` | Returns trending blockbuster movies |
| `GET /api/top-rated` | `GET` | Returns all-time highest rated movies |
| `GET /api/upcoming` | `GET` | Returns upcoming anticipated movies |
| `GET /api/now-playing` | `GET` | Returns movies currently in theaters & streaming |
| `GET /api/genres` | `GET` | Lists all supported movie genres |
| `GET /api/search` | `GET` | Multi-criteria search with `q`, `genre`, `year`, `rating`, `lang`, `sort`, `page` |
| `GET /api/movie/<id_or_title>` | `GET` | Comprehensive details, trailers, financials, cast, and AI analysis |
| `GET /api/person/<name>` | `GET` | Filmography and movies associated with an actor or director |

---

## 📁 Repository Structure

```
movie-reviewer/
├── app.py              # Flask server, REST API endpoints, caching & database
├── config.py           # Gemini AI model definitions and configuration
├── requirements.txt    # Python package dependencies
├── .env.example        # Environment variable template
├── .gitignore          # Git ignore rules
├── static/
│   ├── index.html      # Glassmorphism frontend layout and accessible modals
│   ├── style.css       # Design tokens, dark/light themes, animations & responsive styles
│   └── app.js          # Interactive application logic, search, toast system, player
└── README.md           # Documentation
```

---

## 🤝 Contributing

Contributions, feature suggestions, and pull requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
