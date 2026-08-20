# CineScope 🎬 — Modern Movie Reviewer & Intelligence Platform

A state-of-the-art movie search, discovery, and intelligence website featuring real-time search suggestions, multi-criteria filtering, embedded YouTube 4K trailers, multi-source ratings (IMDb, Rotten Tomatoes, Metacritic, Gemini AI), box office financial metrics, streaming availability, clickable cast filmographies, interactive user reviews, watchlist favorites, social sharing, and dark/light mode toggle.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-movie--reviewer--three.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://movie-reviewer-three.vercel.app/)
![CineScope](https://img.shields.io/badge/CineScope-Pro%20Edition-7c5cfc?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-Flask-3776ab?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-Glassmorphism%20%2B%20Themes-1572b6?style=for-the-badge&logo=css3&logoColor=white)

---

## ✨ Core Features & Capabilities

### 🔍 1. Advanced Search Functionality
- **Hero & Navbar Search Bars**: Prominently displayed search inputs with clear button and instant keyboard shortcut (`/` to focus).
- **Real-Time Suggestions**: Instant dropdown suggestions as you type with poster thumbnails, title, release year, and star rating.
- **Comprehensive Multi-Criteria Filtering**:
  - **Genre Pills**: All, Action, Sci-Fi, Drama, Thriller, Crime, Adventure, Animation, Comedy, Fantasy, History.
  - **Release Year**: All Years, 2025, 2024, 2023, 2020–2022, 2010s, 2000s, 1990s, Pre-1990 Classics.
  - **Minimum Rating**: Any Rating, 8.5+ ⭐ Masterpieces, 8.0+ ⭐, 7.5+ ⭐, 7.0+ ⭐.
  - **Language**: All, English (EN), Japanese (JA), Korean (KO), Spanish (ES), French (FR), Hindi (HI), German (DE), Italian (IT).
  - **Sort By**: Most Popular, Highest Rated, Newest First, Oldest First, Title (A-Z).
  - Active filter indicators with 1-click removal & "Reset Filters" button.

### 🎥 2. Full Movie Information Display
- **Visuals & Identity**: High-res poster, wide cinematic backdrop banner with atmospheric gradient mask, original/alternate title, and tagline.
- **Key Metadata**: Release date, runtime (`Xh Ym`), age certification (`PG-13`, `R`), original language, country of origin, status, IMDb link.
- **Ratings Showcase**:
  - **IMDb Rating** with interactive visual star bar and vote counts.
  - **Rotten Tomatoes Score** with fresh tomato icon.
  - **Metacritic Score** badge.
  - **Gemini AI Score** badge.
- **Box Office & Financial Metrics**: Production budget, worldwide gross, US domestic revenue, net profit/loss, and Return on Investment (ROI %).
- **Official Embedded YouTube Player**:
  - Responsive 16:9 embedded player directly inside the modal.
  - Interactive video switcher tabs (Official Trailer, Teaser, Behind The Scenes, Featurettes).
- **Streaming Availability ("Where to Watch")**: Direct platform chips with subscription, rent, and buy options (Netflix, Max, Disney+, Prime Video, Apple TV, YouTube Movies).
- **Clickable Cast & Crew**: Click any actor or director to open their dedicated **Person Filmography Modal** and view all their movies.
- **Interactive User Reviews**:
  - Read curated critic and audience reviews.
  - **"Write a Review" Form**: Select 1–10 stars with interactive star hover, enter your name and review, and submit in real-time (persisted in `localStorage`).
- **AI Critical Intelligence**: Gemini AI verdict, one-liner quote, mood & audience recommendations, cinematic strengths & weaknesses, and behind-the-scenes trivia.
- **Similar Movie Recommendations**: Clickable carousel of related movies with ratings and release dates.

### 🎨 3. Design & User Experience
- **Dark / Light Mode Toggle**: Smooth transition between deep space dark theme and clean light theme, saved in `localStorage`.
- **Modern Glassmorphism**: Translucent panels (`backdrop-filter: blur(20px)`), vibrant neon gradient accents, and subtle borders.
- **Micro-Interactions**: Floating particle animations, hover zoom effects, shimmer loading states, and animated toast notifications.
- **Mobile Responsive**: Fully adaptive layout for desktop, tablet, and mobile screens.

### 💖 4. Additional Features
- **Watchlist / Favorites**:
  - 1-Click heart toggle button on every movie card and detail view.
  - Dedicated **Watchlist Drawer** showing all saved titles with count badge and remove options.
  - Stored permanently in browser `localStorage`.
- **Social Media Sharing**:
  - Share modal supporting Twitter / X, WhatsApp, Facebook, Reddit, LinkedIn, Telegram.
  - Native `navigator.share` on mobile devices.
  - 1-Click "Copy Movie URL" button with animated checkmark feedback.
- **Curated Sections**: 🔥 Trending Blockbusters, ⭐ Top Rated, 🎬 Upcoming Releases, and 🍿 Now Playing in Theaters.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.8+, Flask, Requests, Flask-CORS, python-dotenv
- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Semantic Markup, CSS3 Glassmorphism & Custom Properties
- **APIs**: YouTube Embedded Video Player, Google Gemini AI (with built-in high-fidelity database fallback)
- **Fonts**: Google Fonts (*Outfit*, *Inter*, *JetBrains Mono*)

---

## 🚀 Getting Started Locally

### 1. Clone the repository
```bash
git clone https://github.com/WARRIORXR/movie-reviewer.git
cd movie-reviewer
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Flask Server
```bash
python app.py
```

### 4. Open in Browser
Navigate to **http://localhost:5000** in your browser.

---

## 📁 Project Structure

```
movie-reviewer/
├── app.py              # Flask server with REST API, search filters, and movie database
├── config.py           # Gemini API configuration & fallback models
├── requirements.txt    # Python dependencies
├── .env.example        # Environment template
├── static/
│   ├── index.html      # Responsive semantic HTML with modals & filter controls
│   ├── style.css       # CSS styling with dark/light themes, glassmorphism, responsive grid
│   └── app.js          # JavaScript engine (search, filters, player, watchlist, reviews)
├── README.md           # Documentation
└── .gitignore
```

---

## 📝 License

MIT License — Free to use, modify, and distribute.
