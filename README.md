# Workout Tracker

A continuous workout tracker web app for logging exercises from iPhone/iPad. Hosted on Cloudflare Workers with D1 for persistence, protected by Cloudflare Access (email OTP).

**Live at:** [kilo9alfa.com/workout](https://kilo9alfa.com/workout)

## Tech Stack

- **Runtime:** Cloudflare Workers
- **API:** Hono
- **Database:** Cloudflare D1 (SQLite at edge)
- **Frontend:** Vanilla JS + CSS (no framework)
- **Auth:** Cloudflare Access Zero Trust (email OTP)

## Features

- Week-by-week grid layout (inspired by [Karpathy's workout tracker](https://x.com/karpathy))
- ISO week numbers (2026.W08 format)
- Color-coded exercise types with optional default durations
- Drag-and-drop reorder in settings
- Mobile-first dark theme
- PWA support (Add to Home Screen)

## Development

```bash
npm install
npm run dev          # Local dev server on :8787
npm run deploy       # Deploy to Cloudflare
npm run db:init      # Apply schema to remote D1
npm run db:init:local # Apply schema to local D1
```

## License

MIT
