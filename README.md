# Sales Call Analytics Dashboard

Next.js 14 (App Router) app for uploading sales call audio, transcribing with AssemblyAI (speaker diarization), analyzing with **Google Gemini** (free-tier friendly) or optional Anthropic Claude, and viewing insights in a dashboard.

**Full architecture & product guide** (stack, database, flows, use cases, glossary — for both technical and non-technical readers): **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** · [PDF export](docs/ARCHITECTURE.pdf) (regenerate: `./scripts/export-architecture-pdf.sh`).

**Storage:** SQLite database and audio files live on disk under `./data/` (no cloud database or object storage required).

## Setup

1. **Install dependencies**

   ```bash
   cd sales-call-analytics
   npm install
   ```

   `better-sqlite3` includes a native addon; you need a working C++ toolchain (e.g. `build-essential` on Linux, Xcode CLT on macOS). If `npm install` fails, install those first.

2. **API keys**

   - [AssemblyAI](https://www.assemblyai.com/) — transcription (has a free credit tier for new accounts).
   - **Analysis (pick one):**
     - **[Google AI Studio](https://aistudio.google.com/apikey)** — `GEMINI_API_KEY`. Free tier quotas are **per model**; if you see `429` / `limit: 0` on `gemini-2.0-flash`, the app tries **`gemini-2.0-flash-lite`** then **`gemini-1.5-flash`** automatically. Override with **`GEMINI_MODELS`** (comma-separated) or a single **`GEMINI_MODEL`**. See [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
     - **[Anthropic](https://www.anthropic.com/)** — `ANTHROPIC_API_KEY` if you prefer Claude (paid).

   Other free/low-cost LLM options you could wire similarly: **Groq** (free tier, very fast Llama), **OpenRouter** (many models; some with free credits), or **Ollama** (fully local, no API bill — needs a running local server).

3. **Environment**

   ```bash
   cp .env.example .env.local
   # set ASSEMBLYAI_API_KEY and GEMINI_API_KEY (or ANTHROPIC_API_KEY)
   ```

   On first run, the app creates `./data/app.db` (schema) and `./data/uploads/` (recordings). Override paths with `DATABASE_PATH` and `UPLOAD_DIR` if needed.

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) (or the port Next prints if 3000 is busy).

### `npm run dev` looks broken but isn’t

- **`npm warn Unknown env config "devdir"`** — Your shell (often **Cursor**) sets `npm_config_devdir` for native builds; newer `npm` warns even though it’s unrelated to Next. **You can ignore it**, or start the app without going through `npm run`:

  ```bash
  node scripts/dev.cjs
  ```

- **`Port 3000 is in use`** — Another app (or an old `next dev`) is bound to 3000. Stop that process, or pick a port:

  ```bash
  node scripts/dev.cjs -p 3005
  ```

## Alternatives to the old Supabase setup

| Need | Option |
|------|--------|
| Same app, zero signup beyond AI keys | **Current default:** SQLite + local disk (this repo). |
| Hosted DB + files | **PostgreSQL** (Neon, Railway, RDS, etc.) + **S3** or **MinIO** — would need a small custom layer replacing `lib/db.ts` / `lib/uploads.ts`. |
| Firebase-style BaaS | **Firebase** (Firestore + Storage) or **Appwrite** — different SDKs, similar responsibilities. |

## Architecture

| Layer | Role |
|--------|------|
| `POST /api/calls/upload` | Multipart upload → disk + `calls` row (`processing`). |
| `POST /api/process-call` | Read file from disk → AssemblyAI → talk-time % → Gemini/Claude JSON → SQLite updates (`completed` / `failed`). |
| `GET /api/calls/[id]` | Call + `performance_scores` + `questionnaire_coverage`. |
| `GET /api/calls/[id]/audio` | Serves the recording for the waveform player. |
| `POST /api/calls/[id]/retry` | Reset failed call and re-run the pipeline. |

AssemblyAI and Anthropic run only in API routes. **Serverless note:** SQLite and local files need a persistent disk; on Vercel use a long-running Node host, Docker, or migrate to Postgres + object storage.

## Long-running jobs

`POST /api/process-call` can exceed default serverless timeouts. On Vercel, increase `maxDuration` (already set to 300s in route handlers) or move the pipeline to a background worker/queue for production.

## Folder location

This app lives under `bbmagento246/sales-call-analytics` as a standalone Node project (separate from Magento).
