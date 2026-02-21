# Workout Tracker - CLAUDE.md

## Project Overview

Personal workout tracker web app. Logs exercises from iPhone/iPad with a week-grid layout inspired by Karpathy's tracker.

**Live:** [kilo9alfa.com/workout](https://kilo9alfa.com/workout)

## Identity

- **Git user:** kilo9alfa / david@kilo9alfa.com
- **GitHub repo:** kilo9alfa/workouttracker
- **Cloudflare account:** cgfb4q4ymq.workers.dev

## Tech Stack

- **Runtime:** Cloudflare Workers (TypeScript)
- **Framework:** Hono
- **Database:** Cloudflare D1 (SQLite at edge)
- **Frontend:** Vanilla JS + CSS (no framework, no build step)
- **Auth:** Cloudflare Access Zero Trust (email OTP via `Cf-Access-Authenticated-User-Email` header)

## Commands

```bash
npm run dev              # Local dev server on :8787
npm run deploy           # Deploy to Cloudflare Workers
npm run db:init          # Apply schema to remote D1
npm run db:init:local    # Apply schema to local D1
```

## Project Structure

```
src/
  index.ts                # Hono app entry point, auth middleware, static asset serving
  api/
    exercise-types.ts     # CRUD routes for exercise types
    workouts.ts           # CRUD routes for workout entries
  db/
    schema.sql            # D1 schema (exercise_types, workouts tables)
    queries.ts            # All SQL queries (parameterized, no raw SQL elsewhere)
public/
  index.html              # Single-page app shell
  app.js                  # All frontend logic (vanilla JS)
  styles.css              # Dark theme styles
  manifest.json           # PWA manifest
```

## Architecture Notes

- **Single Worker** serves both the API (`/workout/api/*`) and static assets (`/workout/*`)
- **Auth middleware** on `/workout/api/*` reads the Cloudflare Access email header; falls back to `X-Dev-Email` for local dev
- **All data is user-scoped** — queries filter by `user_email` / `created_by`
- **Frontend is a single-page vanilla JS app** — no bundler, no framework. All UI logic lives in `public/app.js`
- **D1 database ID:** `eef137ce-dc0a-44d2-bd6d-433d15931ec2` (in `wrangler.toml`)
- **Route pattern:** `kilo9alfa.com/workout*` — the `/workout` prefix is stripped for asset serving

## API Endpoints

All under `/workout/api/`, all require auth:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Current user email |
| GET | `/exercise-types` | List user's exercise types |
| POST | `/exercise-types` | Create exercise type |
| PUT | `/exercise-types/:id` | Update exercise type |
| DELETE | `/exercise-types/:id` | Delete exercise type |
| GET | `/workouts?from=&to=` | List workouts in date range |
| POST | `/workouts` | Log a workout |
| PUT | `/workouts/:id` | Update a workout |
| DELETE | `/workouts/:id` | Delete a workout |

## Database Schema

Two tables: `exercise_types` (name, color, default_duration, sort_order, created_by) and `workouts` (user_email, exercise_type_id, date, duration_minutes, notes). See `src/db/schema.sql` for full DDL.

## Development Notes

- When adding new API routes, create them in `src/api/` and register in `src/index.ts`
- All SQL goes through `src/db/queries.ts` — keep queries parameterized
- Frontend changes are instant (no build step) — edit `public/` files directly
- For local dev without Cloudflare Access, send `X-Dev-Email` header with requests
