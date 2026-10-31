//! CineScope — Rust port of the Python Flask backend (`app.py`).
//! Same API endpoints, same static frontend, same Gemini AI fallback behavior.
//!
//! Run with `cargo run` from this folder, then open http://localhost:5000

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde_json::{json, Value};
use tower_http::{cors::CorsLayer, services::ServeDir};

const MOVIES_DB_JSON: &str = include_str!("movies.json");

const GEMINI_BASE_URL: &str = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODELS: [&str; 4] = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
];

const CACHE_TTL_SECS: u64 = 3600; // 1 hour
const PAGE_SIZE: usize = 12;

struct AppState {
    db: Vec<Value>,
    cache: Mutex<HashMap<String, (Instant, Value)>>,
    gemini_key: String,
    http: reqwest::Client,
}

// ── Gemini prompts (verbatim from the Python version, placeholder replaced at call time) ──

const SEARCH_PROMPT_TEMPLATE: &str = r#"Search for movies matching '__QUERY__'.
Return JSON:
{
    "results": [
        {
            "id": 101,
            "title": "Exact Title",
            "release_date": "YYYY-MM-DD",
            "vote_average": 8.5,
            "overview": "Plot summary...",
            "genres": ["Sci-Fi", "Action"],
            "poster_path": "https://image.tmdb.org/t/p/w500/... or null"
        }
    ]
}
Return 6 to 10 accurate movies."#;

const MOVIE_PROMPT_TEMPLATE: &str = r#"Provide complete, accurate, and comprehensive data for the movie '__TITLE__'.
Respond ONLY with this exact JSON structure:
{
    "id": 999,
    "title": "__TITLE__",
    "original_title": "__TITLE__",
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
        {"source": "IMDb", "value": "8.2/10", "score": 8.2, "icon": "imdb", "votes": "500K"},
        {"source": "Rotten Tomatoes", "value": "85%", "score": 8.5, "icon": "rt", "votes": "200+ Reviews"},
        {"source": "Metacritic", "value": "78/100", "score": 7.8, "icon": "metacritic", "votes": "40 Critics"},
        {"source": "Gemini AI", "value": "8.8/10", "score": 8.8, "icon": "gemini", "votes": "AI Score"}
    ],
    "cast": [
        {"name": "Lead Actor", "character": "Character Name"},
        {"name": "Supporting Actor", "character": "Character Name"}
    ],
    "crew": {
        "directors": [{"name": "Director Name", "job": "Director"}],
        "writers": [{"name": "Writer Name", "job": "Writer"}],
        "producers": [{"name": "Producer Name", "job": "Producer"}],
        "composers": [{"name": "Composer Name", "job": "Composer"}]
    },
    "youtube_trailers": [
        {"title": "Official Trailer", "video_id": "YoHD9XEInc0", "channel": "Official Channel", "type": "Trailer"}
    ],
    "watch_providers": {
        "sources": [
            {"name": "Netflix", "type": "Subscription", "web_url": "https://www.netflix.com", "price": null},
            {"name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "3.99"}
        ]
    },
    "reviews": [
        {"id": "r1", "author": "Film Critic", "content": "Compelling and engaging cinematic work.", "created_at": "2023-05-01", "author_details": {"rating": 8}}
    ],
    "similar": [],
    "ai_analysis": {
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
    }
}"#;

// ── Entry point ─────────────────────────────────────────────

#[tokio::main]
async fn main() {
    let _ = dotenvy::dotenv(); // load .env if present, ignore otherwise

    let db: Vec<Value> = serde_json::from_str(MOVIES_DB_JSON).expect("valid embedded movies.json");
    let state = Arc::new(AppState {
        db,
        cache: Mutex::new(HashMap::new()),
        gemini_key: std::env::var("GEMINI_API_KEY").unwrap_or_default(),
        http: reqwest::Client::builder()
            .timeout(Duration::from_secs(20))
            .build()
            .expect("failed to build HTTP client"),
    });

    let static_dir = concat!(env!("CARGO_MANIFEST_DIR"), "/static");

    let app = Router::new()
        .route("/api/search", get(search))
        .route("/api/trending", get(trending))
        .route("/api/top-rated", get(top_rated))
        .route("/api/upcoming", get(upcoming))
        .route("/api/now-playing", get(now_playing))
        .route("/api/genres", get(genres))
        .route("/api/movie/{movie_ident}", get(movie_detail))
        .route("/api/person/{person_name}", get(person_detail))
        .fallback_service(ServeDir::new(static_dir))
        .layer(CorsLayer::permissive())
        .with_state(state);

    eprintln!("🎬 CineScope Rust server online on http://localhost:5000");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:5000")
        .await
        .expect("failed to bind port 5000");
    axum::serve(listener, app).await.expect("server error");
}

// ── In-memory cache ─────────────────────────────────────────

fn get_cached(state: &AppState, key: &str) -> Option<Value> {
    let cache = state.cache.lock().unwrap();
    cache.get(key).and_then(|(time, data)| {
        (time.elapsed().as_secs() < CACHE_TTL_SECS).then(|| data.clone())
    })
}

fn set_cache(state: &AppState, key: &str, data: Value) {
    state
        .cache
        .lock()
        .unwrap()
        .insert(key.to_string(), (Instant::now(), data));
}

// ── Gemini AI client (safe with fallback, like the Python version) ──

async fn call_gemini_json(
    state: &AppState,
    prompt: &str,
    system_instruction: Option<&str>,
) -> Option<Value> {
    let key = &state.gemini_key;
    if key.is_empty() || key.starts_with("AQ.") {
        // Avoid unnecessary failed requests if dummy/invalid key
        return None;
    }

    for model in GEMINI_MODELS {
        let url = format!("{GEMINI_BASE_URL}/models/{model}:generateContent");
        let mut payload = json!({
            "contents": [{ "parts": [{ "text": prompt }] }],
            "generationConfig": {
                "temperature": 0.3,
                "responseMimeType": "application/json",
            }
        });
        if let Some(system) = system_instruction {
            payload["systemInstruction"] = json!({ "parts": [{ "text": system }] });
        }

        let result = state
            .http
            .post(&url)
            .query(&[("key", key.as_str())])
            .json(&payload)
            .send()
            .await;

        match result {
            Ok(resp) if resp.status() == 200 => {
                if let Ok(data) = resp.json::<Value>().await {
                    let raw_text = data
                        .pointer("/candidates/0/content/parts/0/text")
                        .and_then(Value::as_str)
                        .unwrap_or("");
                    if let Some(parsed) = extract_first_json(raw_text) {
                        return Some(parsed);
                    }
                }
            }
            Ok(_) => {}
            Err(e) => eprintln!("Error calling model {model}: {e}"),
        }
    }

    None
}

fn extract_first_json(text: &str) -> Option<Value> {
    if text.is_empty() {
        return None;
    }
    let mut text = text.trim();
    if text.starts_with("```") {
        if let Some(idx) = text.find('\n') {
            text = &text[idx + 1..];
        }
    }
    if text.ends_with("```") {
        text = text[..text.len() - 3].trim_end();
    }
    text = text.trim();

    if let Ok(v) = serde_json::from_str(text) {
        return Some(v);
    }

    let start_obj = text.find('{');
    let start_arr = text.find('[');

    match (start_obj, start_arr) {
        (Some(so), sa) if sa.is_none_or(|s| so < s) => {
            let eo = text.rfind('}')?;
            serde_json::from_str(&text[so..=eo]).ok()
        }
        (_, Some(sa)) => {
            let ea = text.rfind(']')?;
            serde_json::from_str(&text[sa..=ea]).ok()
        }
        _ => None,
    }
}

// ── Database lookup helpers ─────────────────────────────────

fn genre_name(genre: &Value) -> &str {
    match genre {
        Value::String(s) => s.as_str(),
        Value::Object(o) => o.get("name").and_then(Value::as_str).unwrap_or(""),
        _ => "",
    }
}

/// Fuzzy finds movies matching title, genre, director or cast.
fn find_in_database<'a>(db: &'a [Value], query_str: &str) -> Vec<&'a Value> {
    let q = query_str.to_lowercase();
    db.iter()
        .filter(|m| {
            let title_match = m["title"].as_str().unwrap_or("").to_lowercase().contains(&q)
                || m["original_title"]
                    .as_str()
                    .unwrap_or("")
                    .to_lowercase()
                    .contains(&q);
            let director_match =
                m["director"].as_str().unwrap_or("").to_lowercase().contains(&q);
            let cast_match = m["cast"]
                .as_array()
                .map(|cast| {
                    cast.iter().any(|c| {
                        c["name"]
                            .as_str()
                            .unwrap_or("")
                            .to_lowercase()
                            .contains(&q)
                    })
                })
                .unwrap_or(false);
            let genre_match = m["genres"]
                .as_array()
                .map(|genres| {
                    genres
                        .iter()
                        .any(|g| genre_name(g).to_lowercase().contains(&q))
                })
                .unwrap_or(false);
            title_match || director_match || cast_match || genre_match
        })
        .collect()
}

/// Finds movie by integer ID or string title.
fn find_movie_by_id_or_title<'a>(db: &'a [Value], ident: &str) -> Option<&'a Value> {
    let s = ident.trim().to_lowercase();
    db.iter().find(|m| {
        let id = m["id"].as_i64().map(|i| i.to_string()).unwrap_or_default();
        let title = m["title"].as_str().unwrap_or("").to_lowercase();
        id == s || title == s || title.contains(&s)
    })
}

fn val_f(m: &Value, key: &str) -> f64 {
    m[key].as_f64().unwrap_or(0.0)
}

fn val_s(m: &Value, key: &str, default: &str) -> String {
    m[key].as_str().unwrap_or(default).to_string()
}

fn popularity(m: &Value) -> f64 {
    let votes = m["vote_count"].as_f64().filter(|c| *c != 0.0).unwrap_or(100.0);
    val_f(m, "vote_average") * votes
}

/// Stable stand-in for Python's `abs(hash(title)) % 1000000` AI-result ids.
fn stable_id(s: &str) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    s.hash(&mut hasher);
    hasher.finish() % 1_000_000
}

/// Approximation of Python's str.title().
fn title_case(s: &str) -> String {
    s.split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => {
                    first.to_uppercase().collect::<String>() + chars.as_str()
                }
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

// ── Search & filter API ─────────────────────────────────────

async fn search(
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<Value> {
    let query = params.get("q").map(|s| s.trim()).unwrap_or("").to_string();
    let genre_filter = params.get("genre").map(|s| s.trim()).unwrap_or("").to_string();
    let year_filter = params.get("year").map(|s| s.trim()).unwrap_or("").to_string();
    let min_rating = params
        .get("rating")
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    let lang_filter = params
        .get("lang")
        .map(|s| s.trim().to_lowercase())
        .unwrap_or_default();
    let sort_by = params
        .get("sort")
        .map(|s| s.trim().to_lowercase())
        .unwrap_or_else(|| "popularity".to_string());
    let page: usize = params
        .get("page")
        .and_then(|s| s.parse().ok())
        .unwrap_or(1)
        .max(1);

    let cache_key = format!(
        "search:{}:{}:{}:{}:{}:{}:{}",
        query.to_lowercase(),
        genre_filter,
        year_filter,
        min_rating,
        lang_filter,
        sort_by,
        page
    );
    if let Some(cached) = get_cached(&state, &cache_key) {
        return Json(cached);
    }

    let mut matched: Vec<Value>;

    if !query.is_empty() {
        // First check local curated database
        matched = find_in_database(&state.db, &query)
            .into_iter()
            .cloned()
            .collect();

        // If not found or user searched something unique, try Gemini AI
        if matched.len() < 3 {
            let prompt = SEARCH_PROMPT_TEMPLATE.replace("__QUERY__", &query);
            if let Some(ai_data) = call_gemini_json(
                &state,
                &prompt,
                Some("You are a movie database API. Always return valid JSON."),
            )
            .await
            {
                if let Some(results) = ai_data["results"].as_array() {
                    for m in results {
                        let title = m["title"].as_str().unwrap_or("").to_lowercase();
                        if !matched
                            .iter()
                            .any(|x| x["title"].as_str().unwrap_or("").to_lowercase() == title)
                        {
                            let mut m = m.clone();
                            m["id"] = json!(stable_id(m["title"].as_str().unwrap_or("movie")));
                            matched.push(m);
                        }
                    }
                }
            }
        }
    } else {
        // No query string, search across all database movies
        matched = state.db.clone();
    }

    // ── Apply filters ──
    let mut filtered: Vec<Value> = matched
        .into_iter()
        .filter(|m| {
            // Genre filter
            if !genre_filter.is_empty() && !genre_filter.eq_ignore_ascii_case("all") {
                let m_genres: Vec<String> = m["genres"]
                    .as_array()
                    .map(|a| a.iter().map(|g| genre_name(g).to_lowercase()).collect())
                    .unwrap_or_default();
                if !m_genres.contains(&genre_filter.to_lowercase()) {
                    return false;
                }
            }

            // Year filter (only applied when the movie has a known year, like Python)
            let mut m_year: Option<i64> = None;
            if let Some(rd) = m["release_date"].as_str() {
                m_year = rd.get(..4).and_then(|y| y.parse().ok());
            }
            if m_year.is_none() {
                m_year = m["year"].as_i64();
            }
            if !year_filter.is_empty() && !year_filter.eq_ignore_ascii_case("all") {
                if let Some(y) = m_year {
                    let keep = match year_filter.parse::<i64>() {
                        Ok(exact) => y == exact,
                        Err(_) => match year_filter.as_str() {
                            "2020-2022" => (2020..=2022).contains(&y),
                            "2010s" => (2010..=2019).contains(&y),
                            "2000s" => (2000..=2009).contains(&y),
                            "1990s" => (1990..=1999).contains(&y),
                            "pre-1990" => y < 1990,
                            _ => true,
                        },
                    };
                    if !keep {
                        return false;
                    }
                }
            }

            // Rating filter
            let m_rating = val_f(m, "vote_average");
            if min_rating > 0.0 && m_rating < min_rating {
                return false;
            }

            // Language filter
            if !lang_filter.is_empty() && lang_filter != "all" {
                let m_lang = m["original_language"]
                    .as_str()
                    .unwrap_or("")
                    .to_lowercase();
                if m_lang != lang_filter {
                    return false;
                }
            }

            true
        })
        .collect();

    // ── Apply sorting ──
    match sort_by.as_str() {
        "rating" => filtered.sort_by(|a, b| {
            val_f(b, "vote_average")
                .partial_cmp(&val_f(a, "vote_average"))
                .unwrap_or(std::cmp::Ordering::Equal)
        }),
        "newest" => filtered.sort_by(|a, b| {
            val_s(b, "release_date", "0").cmp(&val_s(a, "release_date", "0"))
        }),
        "oldest" => filtered.sort_by(|a, b| {
            val_s(a, "release_date", "9999").cmp(&val_s(b, "release_date", "9999"))
        }),
        "title" => filtered.sort_by(|a, b| {
            val_s(a, "title", "")
                .to_lowercase()
                .cmp(&val_s(b, "title", "").to_lowercase())
        }),
        // popularity / default
        _ => filtered.sort_by(|a, b| {
            popularity(b)
                .partial_cmp(&popularity(a))
                .unwrap_or(std::cmp::Ordering::Equal)
        }),
    }

    let total_results = filtered.len();
    let total_pages = ((total_results + PAGE_SIZE - 1) / PAGE_SIZE).max(1);
    let results: Vec<Value> = filtered
        .into_iter()
        .skip((page - 1) * PAGE_SIZE)
        .take(PAGE_SIZE)
        .collect();

    let response = json!({
        "results": results,
        "total_results": total_results,
        "total_pages": total_pages,
        "page": page
    });
    set_cache(&state, &cache_key, response.clone());
    Json(response)
}

// ── Categories API ──────────────────────────────────────────

async fn trending(State(state): State<Arc<AppState>>) -> Json<Value> {
    category_by_rating(state, "cat:trending").await
}

async fn top_rated(State(state): State<Arc<AppState>>) -> Json<Value> {
    category_by_rating(state, "cat:top_rated").await
}

async fn category_by_rating(state: Arc<AppState>, cache_key: &str) -> Json<Value> {
    if let Some(cached) = get_cached(&state, cache_key) {
        return Json(cached);
    }
    let mut list = state.db.clone();
    list.sort_by(|a, b| {
        val_f(b, "vote_average")
            .partial_cmp(&val_f(a, "vote_average"))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let data = json!({ "results": list });
    set_cache(&state, cache_key, data.clone());
    Json(data)
}

async fn upcoming(State(state): State<Arc<AppState>>) -> Json<Value> {
    if let Some(cached) = get_cached(&state, "cat:upcoming") {
        return Json(cached);
    }
    let data = json!({
        "results": [
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
    });
    set_cache(&state, "cat:upcoming", data.clone());
    Json(data)
}

async fn now_playing(State(state): State<Arc<AppState>>) -> Json<Value> {
    if let Some(cached) = get_cached(&state, "cat:now_playing") {
        return Json(cached);
    }
    let picks = [6usize, 7, 2, 9, 0, 1]; // Dune 2, Gladiator 2, Oppenheimer, Spider-Verse, Inception, Interstellar
    let list: Vec<Value> = picks.iter().filter_map(|i| state.db.get(*i).cloned()).collect();
    let data = json!({ "results": list });
    set_cache(&state, "cat:now_playing", data.clone());
    Json(data)
}

async fn genres() -> Json<Value> {
    Json(json!({
        "genres": [
            { "id": "Action", "name": "Action", "icon": "💥" },
            { "id": "Sci-Fi", "name": "Sci-Fi", "icon": "🚀" },
            { "id": "Drama", "name": "Drama", "icon": "🎭" },
            { "id": "Adventure", "name": "Adventure", "icon": "🗺️" },
            { "id": "Crime", "name": "Crime", "icon": "🕵️" },
            { "id": "Thriller", "name": "Thriller", "icon": "⚡" },
            { "id": "Animation", "name": "Animation", "icon": "🎨" },
            { "id": "Comedy", "name": "Comedy", "icon": "😂" },
            { "id": "Fantasy", "name": "Fantasy", "icon": "🔮" },
            { "id": "History", "name": "History", "icon": "🏛️" },
            { "id": "Family", "name": "Family", "icon": "👨‍👩‍👧" },
            { "id": "Biography", "name": "Biography", "icon": "📜" }
        ]
    }))
}

// ── Movie detail API ────────────────────────────────────────

async fn movie_detail(
    State(state): State<Arc<AppState>>,
    Path(movie_ident): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<Value> {
    let title_hint = params
        .get("title")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or(&movie_ident)
        .to_string();
    let cache_key = format!("movie_detail:{}", title_hint.to_lowercase());
    if let Some(cached) = get_cached(&state, &cache_key) {
        return Json(cached);
    }

    // Check local curated database first
    if let Some(db_movie) = find_movie_by_id_or_title(&state.db, &title_hint) {
        let v = db_movie.clone();
        set_cache(&state, &cache_key, v.clone());
        return Json(v);
    }

    // If not in local database, query Gemini AI
    let prompt = MOVIE_PROMPT_TEMPLATE.replace("__TITLE__", &title_hint);
    if let Some(mut ai_data) = call_gemini_json(
        &state,
        &prompt,
        Some("You are a movie encyclopedia API. Return strictly factual valid JSON."),
    )
    .await
    {
        ai_data["id"] = json!(stable_id(ai_data["title"].as_str().unwrap_or(&title_hint)));
        set_cache(&state, &cache_key, ai_data.clone());
        return Json(ai_data);
    }

    // Fallback to closest match or template
    let similar: Vec<Value> = state.db.iter().take(3).cloned().collect();
    let fallback = json!({
        "id": stable_id(&title_hint),
        "title": title_case(&title_hint),
        "original_title": title_case(&title_hint),
        "tagline": "An extraordinary cinematic experience.",
        "overview": format!("A critically acclaimed feature film following the unforgettable journey of its protagonists in '{}'.", title_hint),
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
            { "source": "IMDb", "value": "8.2/10", "score": 8.2, "icon": "imdb", "votes": "350K" },
            { "source": "Rotten Tomatoes", "value": "88%", "score": 8.8, "icon": "rt", "votes": "180+ Reviews" },
            { "source": "Gemini AI", "value": "8.9/10", "score": 8.9, "icon": "gemini", "votes": "AI Score" }
        ],
        "cast": [
            { "name": "Lead Performer", "character": "Protagonist" },
            { "name": "Co-Star", "character": "Supporting Lead" }
        ],
        "crew": {
            "directors": [{ "name": "Acclaimed Director", "job": "Director" }]
        },
        "youtube_trailers": [
            { "title": "Official Trailer", "video_id": "YoHD9XEInc0", "channel": "Official Channel", "type": "Trailer" }
        ],
        "watch_providers": {
            "sources": [
                { "name": "Netflix", "type": "Subscription", "web_url": "https://www.netflix.com", "price": null },
                { "name": "Amazon Prime Video", "type": "Rent / Buy", "web_url": "https://www.amazon.com", "price": "3.99" }
            ]
        },
        "reviews": [
            { "id": "r-auto", "author": "Film Critic", "content": "A beautifully realized cinematic journey with standout performances.", "created_at": "2023-06-10", "author_details": { "rating": 8 } }
        ],
        "similar": similar,
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
    });
    set_cache(&state, &cache_key, fallback.clone());
    Json(fallback)
}

// ── Person / actor filmography API ──────────────────────────

async fn person_detail(
    State(state): State<Arc<AppState>>,
    Path(person_name): Path<String>,
) -> Json<Value> {
    let clean_name = person_name.trim();
    let needle = clean_name.to_lowercase();
    let filmography: Vec<Value> = state
        .db
        .iter()
        .filter(|m| {
            let is_cast = m["cast"]
                .as_array()
                .map(|cast| {
                    cast.iter().any(|c| {
                        c["name"]
                            .as_str()
                            .unwrap_or("")
                            .to_lowercase()
                            .contains(&needle)
                    })
                })
                .unwrap_or(false);
            let is_director = m["director"]
                .as_str()
                .unwrap_or("")
                .to_lowercase()
                .contains(&needle);
            is_cast || is_director
        })
        .cloned()
        .collect();

    Json(json!({
        "name": clean_name,
        "filmography": filmography,
        "total_movies": filmography.len()
    }))
}
