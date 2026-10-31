# CineScope — Rust Edition

Rust (Axum) port of the Python Flask backend in the parent folder. **Same API, same frontend, same behavior.**

## Run

```bash
cargo run
```

Then open http://localhost:5000

For Gemini AI features, put your key in a `.env` file next to this folder's `Cargo.toml`:

```
GEMINI_API_KEY=your_key_here
```

(The original `.env` in the parent folder is NOT read automatically — copy it here.)

## What changed vs the Python version

| Python | Rust |
|---|---|
| Flask + flask-cors | Axum + tower-http CORS |
| `MOVIES_DB` list in `app.py` | Embedded `src/movies.json` (same data) |
| `requests` | `reqwest` |
| `python-dotenv` | `dotenvy` |
| In-memory TTL cache (dict) | `Mutex<HashMap>` with the same 1-hour TTL |

All endpoints are identical: `/api/search`, `/api/trending`, `/api/top-rated`, `/api/upcoming`, `/api/now-playing`, `/api/genres`, `/api/movie/<id-or-title>`, `/api/person/<name>` + the static frontend in `static/`.

The Python version in the parent folder is untouched — both servers can't run at the same time (same port 5000).
