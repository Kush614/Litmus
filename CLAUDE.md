# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
# Main Next.js app
npm run dev          # Dev server on localhost:3000
npm run build        # Production build (TypeScript check + static generation)
npm run lint         # ESLint

# WebSocket server (separate process)
cd ws-server
npm run dev          # Fastify dev server with tsx watch
npm run build        # Compile TypeScript to dist/
```

Both services deploy to Render via `render.yaml` (Next.js as Node web service, ws-server as Docker).

## Architecture

Litmus is an AI agent evaluation marketplace with three runtime components:

1. **Next.js 16 App** (`src/`) — Frontend pages + 14 API routes. Handles agent profiles, benchmarking, reviews, comparisons, and auth.
2. **WebSocket Server** (`ws-server/`) — Fastify + `@fastify/websocket`. Bridges Plivo voice calls with Gemini Live API for real-time voice evaluation. Converts audio formats bidirectionally (mu-law 8kHz <-> PCM 16/24kHz).
3. **Supabase** — Postgres database (6 tables), Auth (OAuth via Google/GitHub), RLS policies, Realtime subscriptions, full-text search via `search_agents` RPC, and score aggregation via `update_agent_score` RPC.

### External Services

- **Gemini** (`src/lib/gemini/`) — LLM-as-judge for benchmarks (`judge.ts`), agent profile generation (`profiler.ts`), voice conversations (`live.ts`)
- **Plivo** (`src/lib/plivo/`) — Outbound voice calls, XML response builder, audio streaming
- **You.com** (`src/lib/youcom/`) — Web search and content fetching for agent intelligence gathering
- **Composio** (`src/lib/composio/`) — Tool integration verification (validates agent capability claims)
- **Intercom** (`src/lib/intercom/`) — Conversation metrics and sample conversation fetching

### Key Data Flows

- **Benchmark**: POST to `/api/agents/[slug]/benchmark` → returns 202 immediately → async Gemini evaluation → stores scores → triggers `update_agent_score` RPC
- **Voice Eval**: POST to `/api/voice/initiate` → Plivo outbound call → Plivo streams audio to ws-server `/ws` → bidirectional Gemini Live conversation → transcript POSTed to `/api/evaluate` on call end
- **Intelligence**: Async fire-and-forget via You.com search → Gemini summarization → stored in `web_intelligence` table. Refreshed if older than 6 hours.

## Key Patterns

### Supabase Clients

- `createServerClient()` — Cookie-based SSR client via `@supabase/ssr`. For server components and API routes. **Async** — always `await` it.
- `createServiceRoleClient()` — Bypasses RLS. For backend operations (score updates, intelligence writes).
- `createBrowserClient()` — For client components.

### Supabase Json Type

The generated `Json` type is a strict union. `Record<string, unknown>` is NOT assignable to it. Always cast through `unknown`:

```ts
pricing_model: data as unknown as import("@/lib/supabase/types").Json;
```

### Error Handling

Custom hierarchy in `src/lib/utils/errors.ts`: `AppError` → `NotFoundError`, `ValidationError`, `UnauthorizedError`. All API routes wrap in try/catch with `handleApiError()`. Input validation uses `validateWithZod()` with Zod v4 schemas.

### Async Fire-and-Forget

Long-running operations (intelligence gathering, profile generation, benchmark evaluation) use immediately-invoked async IIFEs with isolated error handling, so API responses return fast (202 Accepted).

### Scoring

Weighted composites in `src/lib/utils/scoring.ts`:

- Benchmark: accuracy(0.3) + helpfulness(0.25) + hallucination(0.2) + coherence(0.15) + completeness(0.1)
- Voice: helpfulness(0.25) + naturalness(0.2) + latency(0.2) + accuracy(0.2) + tone(0.15)

## Next.js 16 Conventions

- `params` in route handlers/pages is a `Promise` — must `await params`
- Server pages using Supabase need `export const dynamic = "force-dynamic"` to avoid static prerender failures
- `next/dynamic` with `ssr: false` cannot be used in Server Components — use a `"use client"` wrapper (see `score-radar-lazy.tsx`)
- `useSearchParams()` must be inside a `<Suspense>` boundary
- Proxy lives in `proxy.ts` at project root (Next.js 16 convention, replaces `middleware.ts`)

## Environment Variables

Required for the Next.js app: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`, `PLIVO_PHONE_NUMBER`, `YOUCOM_API_KEY`, `COMPOSIO_API_KEY`, `INTERCOM_ACCESS_TOKEN`, `INTERCOM_APP_ID`, `NEXT_PUBLIC_APP_URL`, `WS_SERVER_URL`, `CRON_SECRET`.

Required for ws-server: `GEMINI_API_KEY`, `LITMUS_API_URL`, `PORT`.

## Database

Supabase project `oruhaepsclqzwfsjnqdj`. Six tables: `agents`, `benchmarks`, `voice_evaluations`, `web_intelligence`, `tool_verifications`, `user_reviews`. Types are generated in `src/lib/supabase/types.ts`. The `tsconfig.json` excludes `ws-server/` from the Next.js build.
