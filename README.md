# Litmus

Litmus is an AI agent evaluation marketplace. It lets teams discover agents, run benchmark tasks, execute voice evaluations, and compare results with tool-verification and web-intelligence signals.

## Architecture

The repository has two runtime services:

- `src/` (Next.js 16 + React 19): web app + API routes (`src/app/api/**/route.ts`)
- `ws-server/` (Fastify + WebSocket): Plivo audio stream bridge to Gemini Live API (`/ws`)

Core integrations: Supabase (data/auth), Gemini (`@google/genai`), Plivo (voice), You.com (intelligence), Composio (tool verification), and Intercom (support metrics).

## Local Development

### 1) Install dependencies

```bash
npm install
cd ws-server && npm install
cd ..
```

### 2) Configure environment variables

```bash
cp .env.example .env
cp ws-server/.env.example ws-server/.env
```

Populate all required keys in both files.

### 3) Run both services

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
cd ws-server
npm run dev
```

Web app runs on `http://localhost:3000`. WS server listens on `http://localhost:8080` and exposes `ws://localhost:8080/ws`.

## Commands

Main app (`package.json`):

- `npm run dev`: start Next.js dev server
- `npm run build`: production build
- `npm run start`: run built app
- `npm run lint`: ESLint + Prettier check
- `npm run format`: Prettier write

WS server (`ws-server/package.json`):

- `npm run dev`: `tsx` watch mode
- `npm run build`: TypeScript compile to `dist/`
- `npm run start`: run compiled server

## Deployment (Render)

Deployment is standardized on Render using `render.yaml`:

- `litmus` (Node web service): builds/runs the Next.js app
- `litmus-ws` (Docker web service): builds/runs `ws-server`

Set all environment variables from `.env.example` and `ws-server/.env.example` in Render. `WS_SERVER_URL` must point to the deployed WS service URL (for example `wss://litmus-ws.onrender.com/ws`).

For scheduled intelligence refresh, configure a Render Cron Job to call:

- `GET /api/cron/intelligence`
- Header: `Authorization: Bearer <CRON_SECRET>`
