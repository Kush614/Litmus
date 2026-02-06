# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the main Next.js 16 application. Use `src/app/` for App Router pages and API handlers (`src/app/api/**/route.ts`), `src/components/` for UI and feature components, `src/lib/` for integrations (Supabase, Gemini, Plivo, You.com, Intercom), and `src/types/` for shared TypeScript types. Static files live in `public/`.

`ws-server/` is a separate Fastify + WebSocket service for live voice evaluation. It has its own `package.json`, TypeScript config, and build output in `ws-server/dist/`.

Deployment/config files are at the root (`render.yaml`, `.env.example`, `ws-server/.env.example`).

## Build, Test, and Development Commands

- `npm run dev`: start the Next.js app on `localhost:3000`.
- `npm run build`: production build for the web app.
- `npm run start`: run the built Next.js app.
- `npm run lint`: run ESLint and Prettier checks.
- `npm run format`: apply Prettier formatting.
- `cd ws-server && npm run dev`: run the WebSocket server with hot reload.
- `cd ws-server && npm run build && npm run start`: build and run WS server production output.

Run the web app and `ws-server` in separate terminals for full voice-flow development.

## Coding Style & Naming Conventions

Both projects use strict TypeScript. Prettier rules: 2-space indentation, semicolons, double quotes, 100-char line width. ESLint uses Next.js Core Web Vitals + TypeScript + Prettier compatibility.

Use `@/*` imports for files under `src/`. Follow existing naming patterns: kebab-case filenames (`benchmark-runner.tsx`, `voice-eval-panel.tsx`), PascalCase React component/type names, and route folders that mirror URL structure (`api/agents/[slug]`).

## Testing Guidelines

There is no committed automated test suite yet. Before opening a PR, run:

- `npm run lint`
- `npm run build`
- `cd ws-server && npm run build`

For new tests, prefer colocated `*.test.ts` or `*.test.tsx` files and prioritize API route and core utility coverage.

## Commit & Pull Request Guidelines

Current history uses short imperative subjects (for example: `Initial Build`, `Added spec`). Keep that style with clear, scoped messages such as `Add benchmark retry handling`.

PRs should include a concise summary, changed paths, any environment/config updates, manual verification steps, and screenshots for UI changes. Link related issues/specs and highlight breaking changes explicitly.

## Security & Configuration Tips

Never commit real secrets. Copy from `.env.example` and `ws-server/.env.example` when setting up local env files. Keep service-role tokens and `CRON_SECRET` server-only.
