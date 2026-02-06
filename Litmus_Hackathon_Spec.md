# Litmus — "Glassdoor for AI Agents"

## Hackathon Spec Sheet | Continual Learning Hackathon (Creators Corner × Intercom)

> **One-liner:** The litmus test for AI agents. A transparent, data-driven marketplace where teams discover, benchmark, and compare AI agents — with live voice evaluation, real-time web intelligence, and verified performance metrics — so companies stop guessing and start knowing which agent actually works.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Architecture](#3-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Project Structure](#5-project-structure)
6. [Database Schema (Supabase)](#6-database-schema-supabase)
7. [Feature Specifications](#7-feature-specifications)
   - 7.1 [Agent Registry & Profiles](#71-agent-registry--profiles)
   - 7.2 [Live Benchmarking Engine (Gemini)](#72-live-benchmarking-engine-gemini)
   - 7.3 [Voice Evaluation via Phone (Plivo)](#73-voice-evaluation-via-phone-plivo)
   - 7.4 [Real-Time Web Intelligence (You.com)](#74-real-time-web-intelligence-youcom)
   - 7.5 [Third-Party Tool Integration (Composio)](#75-third-party-tool-integration-composio)
   - 7.6 [Intercom-Specific Analytics](#76-intercom-specific-analytics)
   - 7.7 [Comparison Dashboard (Lovable-inspired)](#77-comparison-dashboard)
8. [API Route Specifications](#8-api-route-specifications)
9. [Integration Details](#9-integration-details)
   - 9.1 [Plivo Audio Streaming (Voice Agents)](#91-plivo-audio-streaming-voice-agents)
   - 9.2 [You.com Search/Content APIs](#92-youcom-searchcontent-apis)
   - 9.3 [Google Gemini API (@google/genai)](#93-google-gemini-api-googlegenai)
   - 9.4 [Composio Toolkits (@composio/core)](#94-composio-toolkits-composiocore)
   - 9.5 [Intercom REST API](#95-intercom-rest-api)
10. [Environment Variables](#10-environment-variables)
11. [Deployment (Vercel)](#11-deployment-vercel)
12. [Hackathon Demo Script](#12-hackathon-demo-script)
13. [Division of Labor (3-Person Team)](#13-division-of-labor-3-person-team)
14. [Risk Mitigation](#14-risk-mitigation)
15. [Example Agents to Test](#15-example-agents-to-test)

---

## 1. Problem Statement

The AI agent market is exploding — customer support bots, coding copilots, research assistants, voice agents — but **there is no transparent, standardized way to evaluate them**. Companies face:

- **Opacity:** Vendor claims are unauditable. "99% accuracy" against what benchmark? What dataset? Under what conditions?
- **No Verified Reviews:** G2/Capterra reviews are subjective text blobs. There is no equivalent of Glassdoor's verified employment reviews — no proof the reviewer actually used the agent in production.
- **Stale Information:** Agent capabilities change weekly. By the time a blog review is published, the agent has had three updates. No platform tracks agent performance longitudinally.
- **No Head-to-Head Comparison:** If you want to compare Intercom Fin vs. Zendesk AI vs. a custom LangChain agent, you have to run your own evaluation. There is no shared, neutral testing ground.
- **Voice Agent Black Box:** Voice-based AI agents (a rapidly growing category) are virtually impossible to evaluate without calling them, but there is no way to do this at scale or record structured quality data from those calls.

**This is the exact same information asymmetry problem that Glassdoor solved for job seekers and employers, and that PhysicalAI solved for outdoor advertising. Every agent needs a litmus test.**

---

## 2. Solution Overview

**Litmus** is a marketplace and benchmarking platform for AI agents. It provides:

| Capability                      | Description                                                                                                                                    | Sponsor Tool               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Agent Profiles**              | Structured, auto-populated agent profiles with capabilities, pricing, integrations, and changelog tracking                                     | You.com Content API        |
| **Live Benchmarking**           | Standardized evaluation tasks executed by Gemini-as-judge against submitted agents, producing comparable scores                                | Google Gemini API          |
| **Voice Evaluation**            | Users can call a Plivo phone number, talk to an agent under test, and the system records structured quality metrics from the voice interaction | Plivo Audio Streaming      |
| **Real-Time Intelligence**      | Continuous monitoring of agent changelogs, community sentiment, outage reports, and pricing changes via web search                             | You.com Search + News APIs |
| **Tool Execution Verification** | Verify whether agents can actually perform claimed integrations (e.g., "creates Jira tickets") by testing through Composio                     | Composio                   |
| **Support-Specific Metrics**    | For Intercom Fin and other support agents, surface resolution rate, CSAT, and escalation data through the Intercom API                         | Intercom REST API          |
| **Comparison Dashboard**        | Side-by-side agent comparison with radar charts, pricing calculators, and decision matrices                                                    | Shadcn UI + Recharts       |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Next.js 16)                         │
│                                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐               │
│  │  App Router │  │ Route        │  │  WebSocket    │               │
│  │  (React 19) │  │ Handlers     │  │  Server       │               │
│  │  + Shadcn   │  │ /api/*       │  │  (Plivo WS)   │               │
│  └──────┬─────┘  └──────┬───────┘  └───────┬───────┘               │
│         │               │                   │                        │
└─────────┼───────────────┼───────────────────┼────────────────────────┘
          │               │                   │
          ▼               ▼                   ▼
   ┌─────────────┐ ┌───────────┐  ┌────────────────────┐
   │  Supabase   │ │  Gemini   │  │  Plivo Voice API   │
   │  (Postgres  │ │  API      │  │  Audio Streaming    │
   │  + Auth     │ │  (Judge)  │  │  (Bidirectional)    │
   │  + Storage) │ │           │  └─────────┬──────────┘
   └─────────────┘ └───────────┘            │
                                            ▼
   ┌─────────────┐ ┌───────────┐  ┌────────────────────┐
   │  You.com    │ │ Composio  │  │  Gemini Live API   │
   │  Search +   │ │ Toolkits  │  │  (Native Audio:    │
   │  Content +  │ │ (850+     │  │   STT + TTS in     │
   │  News APIs  │ │  tools)   │  │   one session)     │
   └─────────────┘ └───────────┘  └────────────────────┘
                   ┌───────────┐
                   │ Intercom  │
                   │ REST API  │
                   │ (Fin data)│
                   └───────────┘
```

**Data flow for a voice evaluation:**

1. User clicks "Evaluate by Voice" on an agent's profile page.
2. Next.js route handler calls Plivo's Call API to initiate an outbound call to the user's phone.
3. Plivo returns XML that establishes a bidirectional WebSocket audio stream to the Next.js WebSocket server.
4. Audio from the user is forwarded (after mulaw→PCM conversion) to **Gemini Live API** via its own bidirectional WebSocket session, which handles both speech recognition and response generation natively.
5. Gemini Live API processes the audio, understands the speech, generates a response, and returns audio output — all within a single session. No separate STT or TTS services needed.
6. The response audio is converted back to mulaw 8kHz and streamed to the caller through the Plivo WebSocket.
7. After the call, Gemini evaluates the full transcript for quality metrics (coherence, helpfulness, hallucination detection, response time).
8. Scores are stored in Supabase and displayed on the agent's profile.

---

## 4. Tech Stack

### Core Framework

| Layer               | Technology | Version              | Notes                                                                          |
| ------------------- | ---------- | -------------------- | ------------------------------------------------------------------------------ |
| **Framework**       | Next.js    | 16.x (latest stable) | App Router, Turbopack default, React 19.2, `proxy.ts` replaces `middleware.ts` |
| **React**           | React      | 19.2                 | View Transitions, `useEffectEvent`, Activity API                               |
| **Language**        | TypeScript | 5.6+                 | Strict mode, `types` over `interfaces`, `undefined` over `null`                |
| **UI Library**      | Shadcn UI  | Latest               | Radix primitives + Tailwind CSS                                                |
| **Charts**          | Recharts   | 2.x                  | Radar charts for agent comparison, line charts for longitudinal performance    |
| **Package Manager** | npm        | 10.x                 | Per requirement                                                                |
| **Deployment**      | Vercel     | —                    | Serverless functions + Edge (for proxy.ts)                                     |

### External Services

| Service           | Package / API                 | Purpose                                                                                                                                             |
| ----------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase**      | `@supabase/supabase-js`       | Postgres DB, Auth (OAuth), Row Level Security, Realtime subscriptions                                                                               |
| **Google Gemini** | `@google/genai` (v1.40.0+)    | LLM-as-judge for benchmarking, transcript evaluation, agent profile generation, **AND** real-time STT+TTS via Gemini Live API for voice evaluations |
| **Plivo**         | `plivo` (npm) + WebSocket     | Voice agent evaluation via bidirectional audio streaming                                                                                            |
| **You.com**       | REST API (`api.ydc-index.io`) | Web search, content crawling, news monitoring for agent intelligence                                                                                |
| **Composio**      | `@composio/core` (V3 SDK)     | Tool execution verification across 850+ integrations                                                                                                |
| **Intercom**      | REST API (`api.intercom.io`)  | Fin AI agent performance data, conversation analytics                                                                                               |

---

## 5. Project Structure

```
litmus/
├── .env.local                          # Local environment variables (NEVER commit)
├── .env.example                        # Template for required env vars
├── next.config.ts                      # Next.js 16 config (Turbopack default)
├── tailwind.config.ts                  # Tailwind + Shadcn theme
├── tsconfig.json                       # TypeScript strict config
├── package.json
├── proxy.ts                            # Next.js 16 proxy (replaces middleware.ts)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (fonts, providers, nav)
│   │   ├── page.tsx                    # Landing page / agent search
│   │   │
│   │   ├── agents/
│   │   │   ├── page.tsx                # Agent directory (search, filter, sort)
│   │   │   └── [slug]/
│   │   │       ├── page.tsx            # Agent profile page (scores, reviews, intel)
│   │   │       ├── benchmark/
│   │   │       │   └── page.tsx        # Live benchmark execution page
│   │   │       └── voice-eval/
│   │   │           └── page.tsx        # Voice evaluation page (Plivo call UI)
│   │   │
│   │   ├── compare/
│   │   │   └── page.tsx                # Side-by-side comparison dashboard
│   │   │
│   │   ├── submit/
│   │   │   └── page.tsx                # Agent submission form
│   │   │
│   │   └── dashboard/
│   │       └── page.tsx                # User dashboard (my evaluations, bookmarks)
│   │
│   ├── api/                            # Route Handlers (App Router)
│   │   ├── agents/
│   │   │   ├── route.ts                # GET (list/search), POST (submit new agent)
│   │   │   └── [slug]/
│   │   │       ├── route.ts            # GET (agent detail), PATCH (update)
│   │   │       ├── benchmark/
│   │   │       │   └── route.ts        # POST (trigger benchmark)
│   │   │       ├── intelligence/
│   │   │       │   └── route.ts        # GET (latest web intel for agent)
│   │   │       └── tool-verify/
│   │   │           └── route.ts        # POST (verify tool claims via Composio)
│   │   │
│   │   ├── voice/
│   │   │   ├── initiate/
│   │   │   │   └── route.ts            # POST (initiate Plivo outbound call)
│   │   │   ├── answer/
│   │   │   │   └── route.ts            # POST (Plivo answer URL — returns XML)
│   │   │   ├── ws/
│   │   │   │   └── route.ts            # WebSocket handler for audio stream
│   │   │   └── status/
│   │   │       └── route.ts            # POST (Plivo stream status callback)
│   │   │
│   │   ├── intercom/
│   │   │   ├── metrics/
│   │   │   │   └── route.ts            # GET (fetch Fin performance metrics)
│   │   │   └── conversations/
│   │   │       └── route.ts            # GET (sample conversations for eval)
│   │   │
│   │   ├── evaluate/
│   │   │   └── route.ts                # POST (Gemini evaluates transcript/benchmark)
│   │   │
│   │   └── webhooks/
│   │       ├── plivo/
│   │       │   └── route.ts            # POST (Plivo event webhooks)
│   │       └── intercom/
│   │           └── route.ts            # POST (Intercom webhook events)
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client
│   │   │   ├── server.ts               # Server-side Supabase client
│   │   │   └── types.ts                # Generated DB types
│   │   │
│   │   ├── gemini/
│   │   │   ├── client.ts               # GoogleGenAI client initialization
│   │   │   ├── judge.ts                # Benchmark evaluation prompts + scoring
│   │   │   ├── profiler.ts             # Agent profile generation from raw data
│   │   │   └── live.ts                 # Gemini Live API session manager (STT + TTS)
│   │   │
│   │   ├── plivo/
│   │   │   ├── client.ts               # Plivo Node SDK client
│   │   │   ├── xml.ts                  # Plivo XML response builders
│   │   │   └── stream-handler.ts       # WebSocket audio stream processor
│   │   │
│   │   ├── youcom/
│   │   │   ├── client.ts               # You.com API client (search, content, news)
│   │   │   ├── intelligence.ts         # Agent intelligence gathering pipeline
│   │   │   └── types.ts                # You.com API response types
│   │   │
│   │   ├── composio/
│   │   │   ├── client.ts               # Composio V3 SDK client
│   │   │   └── verifier.ts             # Tool claim verification logic
│   │   │
│   │   ├── intercom/
│   │   │   ├── client.ts               # Intercom REST API client
│   │   │   └── metrics.ts              # Fin performance metric extraction
│   │   │
│   │   └── utils/
│   │       ├── scoring.ts              # Score normalization and aggregation
│   │       ├── constants.ts            # App-wide constants
│   │       └── errors.ts               # Custom error types
│   │
│   ├── components/
│   │   ├── ui/                         # Shadcn UI components (auto-generated)
│   │   ├── agent-card.tsx              # Agent preview card for directory
│   │   ├── score-radar.tsx             # Radar chart for agent scores
│   │   ├── benchmark-runner.tsx        # Live benchmark execution UI
│   │   ├── voice-eval-panel.tsx        # Voice evaluation call interface
│   │   ├── comparison-table.tsx        # Side-by-side comparison table
│   │   ├── intelligence-feed.tsx       # Real-time web intel feed
│   │   ├── tool-verification-badge.tsx # Verified tool integration badge
│   │   └── nav.tsx                     # Global navigation
│   │
│   └── types/
│       ├── agent.ts                    # Agent-related types
│       ├── benchmark.ts                # Benchmark-related types
│       ├── evaluation.ts               # Evaluation result types
│       └── voice.ts                    # Voice evaluation types
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql      # Initial database migration
```

---

## 6. Database Schema (Supabase)

### `agents`

| Column              | Type           | Constraints                     | Description                                                            |
| ------------------- | -------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `id`                | `uuid`         | PK, default `gen_random_uuid()` | Unique agent identifier                                                |
| `slug`              | `text`         | UNIQUE, NOT NULL                | URL-safe identifier (e.g., `intercom-fin-3`)                           |
| `name`              | `text`         | NOT NULL                        | Display name                                                           |
| `vendor`            | `text`         | NOT NULL                        | Company that builds the agent                                          |
| `description`       | `text`         | —                               | AI-generated summary from web intelligence                             |
| `category`          | `text`         | NOT NULL                        | One of: `support`, `copilot`, `research`, `voice`, `design`, `general` |
| `website_url`       | `text`         | —                               | Official product page                                                  |
| `api_endpoint`      | `text`         | —                               | Public API endpoint (if available for testing)                         |
| `pricing_model`     | `jsonb`        | —                               | Structured pricing data `{ type, base_cost, per_unit, unit }`          |
| `capabilities`      | `text[]`       | —                               | Array of capability tags                                               |
| `integrations`      | `text[]`       | —                               | Claimed third-party integrations                                       |
| `overall_score`     | `numeric(4,2)` | —                               | Aggregate score (0–100), computed                                      |
| `total_evaluations` | `integer`      | DEFAULT 0                       | Count of completed evaluations                                         |
| `submitted_by`      | `uuid`         | FK → `auth.users`               | User who submitted this agent                                          |
| `created_at`        | `timestamptz`  | DEFAULT `now()`                 | Creation timestamp                                                     |
| `updated_at`        | `timestamptz`  | DEFAULT `now()`                 | Last update timestamp                                                  |

### `benchmarks`

| Column              | Type           | Constraints                | Description                                                    |
| ------------------- | -------------- | -------------------------- | -------------------------------------------------------------- |
| `id`                | `uuid`         | PK                         | Unique benchmark identifier                                    |
| `agent_id`          | `uuid`         | FK → `agents.id`, NOT NULL | Agent being benchmarked                                        |
| `benchmark_type`    | `text`         | NOT NULL                   | `text_qa`, `tool_use`, `voice`, `support_sim`, `code_gen`      |
| `task_description`  | `text`         | NOT NULL                   | Natural language description of the benchmark task             |
| `input_payload`     | `jsonb`        | NOT NULL                   | The test input sent to the agent                               |
| `agent_response`    | `jsonb`        | —                          | Raw agent response                                             |
| `gemini_evaluation` | `jsonb`        | —                          | Structured evaluation from Gemini judge                        |
| `scores`            | `jsonb`        | NOT NULL                   | `{ accuracy, coherence, helpfulness, hallucination, latency }` |
| `composite_score`   | `numeric(4,2)` | NOT NULL                   | Weighted composite (0–100)                                     |
| `evaluated_by`      | `uuid`         | FK → `auth.users`          | User who triggered the benchmark                               |
| `created_at`        | `timestamptz`  | DEFAULT `now()`            | —                                                              |

### `voice_evaluations`

| Column              | Type           | Constraints                 | Description                                                |
| ------------------- | -------------- | --------------------------- | ---------------------------------------------------------- |
| `id`                | `uuid`         | PK                          | Unique evaluation identifier                               |
| `agent_id`          | `uuid`         | FK → `agents.id`, NOT NULL  | Agent evaluated                                            |
| `call_uuid`         | `text`         | NOT NULL                    | Plivo call UUID                                            |
| `stream_id`         | `text`         | —                           | Plivo audio stream identifier                              |
| `transcript`        | `jsonb`        | —                           | Full conversation transcript `[{ role, text, timestamp }]` |
| `duration_seconds`  | `integer`      | —                           | Call duration                                              |
| `audio_url`         | `text`         | —                           | Supabase Storage URL for recorded audio                    |
| `gemini_evaluation` | `jsonb`        | —                           | Gemini's evaluation of the voice interaction               |
| `scores`            | `jsonb`        | —                           | `{ naturalness, helpfulness, latency, accuracy, tone }`    |
| `composite_score`   | `numeric(4,2)` | —                           | Weighted composite (0–100)                                 |
| `evaluated_by`      | `uuid`         | FK → `auth.users`, NOT NULL | Evaluator                                                  |
| `created_at`        | `timestamptz`  | DEFAULT `now()`             | —                                                          |

### `web_intelligence`

| Column            | Type           | Constraints                | Description                                               |
| ----------------- | -------------- | -------------------------- | --------------------------------------------------------- |
| `id`              | `uuid`         | PK                         | —                                                         |
| `agent_id`        | `uuid`         | FK → `agents.id`, NOT NULL | Target agent                                              |
| `source_type`     | `text`         | NOT NULL                   | `changelog`, `news`, `review`, `outage`, `pricing_change` |
| `source_url`      | `text`         | NOT NULL                   | Original source URL                                       |
| `title`           | `text`         | NOT NULL                   | Article/event title                                       |
| `summary`         | `text`         | NOT NULL                   | Gemini-generated summary                                  |
| `sentiment`       | `text`         | —                          | `positive`, `neutral`, `negative`                         |
| `relevance_score` | `numeric(3,2)` | —                          | 0.0–1.0 relevance score                                   |
| `raw_data`        | `jsonb`        | —                          | Raw You.com API response                                  |
| `fetched_at`      | `timestamptz`  | DEFAULT `now()`            | —                                                         |

### `tool_verifications`

| Column                 | Type          | Constraints                | Description                               |
| ---------------------- | ------------- | -------------------------- | ----------------------------------------- |
| `id`                   | `uuid`        | PK                         | —                                         |
| `agent_id`             | `uuid`        | FK → `agents.id`, NOT NULL | —                                         |
| `tool_name`            | `text`        | NOT NULL                   | e.g., `GITHUB`, `SLACK`, `JIRA`           |
| `claimed`              | `boolean`     | NOT NULL                   | Whether the agent claims this integration |
| `verified`             | `boolean`     | —                          | Whether Composio could confirm it works   |
| `verification_details` | `jsonb`       | —                          | Composio execution log                    |
| `verified_at`          | `timestamptz` | —                          | —                                         |

### `user_reviews`

| Column           | Type          | Constraints                 | Description                                 |
| ---------------- | ------------- | --------------------------- | ------------------------------------------- |
| `id`             | `uuid`        | PK                          | —                                           |
| `agent_id`       | `uuid`        | FK → `agents.id`, NOT NULL  | —                                           |
| `user_id`        | `uuid`        | FK → `auth.users`, NOT NULL | —                                           |
| `rating`         | `integer`     | CHECK 1–5, NOT NULL         | Star rating                                 |
| `review_text`    | `text`        | —                           | Written review                              |
| `use_case`       | `text`        | —                           | How they used the agent                     |
| `verified_usage` | `boolean`     | DEFAULT `false`             | Whether usage was programmatically verified |
| `created_at`     | `timestamptz` | DEFAULT `now()`             | —                                           |

---

## 7. Feature Specifications

### 7.1 Agent Registry & Profiles

**What:** A directory of AI agents with structured profiles. Users can search, filter by category (support, copilot, research, voice, design), sort by score, and drill into individual profiles.

**Auto-Population Pipeline:**

1. User submits an agent via `/submit` with: name, vendor, website URL, and category.
2. **You.com Content API** crawls the agent's website, docs, and changelog pages.
3. **Gemini** processes the crawled content and generates a structured profile:
   - Description (2–3 sentences)
   - Capability tags
   - Claimed integrations
   - Pricing structure (if found)
4. Profile is stored in Supabase and immediately visible in the directory.

**Agent Search:** Full-text search against `name`, `vendor`, `description`, and `capabilities` using Supabase's built-in `tsvector` search.

---

### 7.2 Live Benchmarking Engine (Gemini)

**What:** Standardized evaluation tasks that any agent can be tested against, with Gemini serving as a consistent, impartial judge.

**Benchmark Categories:**

| Category      | Task Description                                            | Scoring Dimensions                               |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `text_qa`     | Answer 10 factual questions from a standardized dataset     | Accuracy, Coherence, Hallucination Rate          |
| `support_sim` | Resolve 5 simulated customer support tickets                | Resolution Quality, Empathy, Policy Adherence    |
| `tool_use`    | Execute 3 tool calls (create issue, send message, query DB) | Success Rate, Correct Parameters, Error Handling |
| `code_gen`    | Generate code for 3 specified tasks                         | Correctness, Style, Documentation                |
| `voice`       | (See §7.3) Evaluated from voice call transcripts            | Naturalness, Helpfulness, Latency, Tone          |

**Gemini-as-Judge Implementation:**

```typescript
// Simplified pseudocode for the evaluation prompt structure
const evaluationPrompt = `
You are an expert AI agent evaluator. You will receive:
1. A TASK DESCRIPTION that was given to the agent
2. The AGENT'S RESPONSE
3. A REFERENCE ANSWER (gold standard)

Evaluate the agent's response on each dimension below.
Return a JSON object with scores from 0-100 for each dimension.

Dimensions:
- accuracy: Does the response contain factually correct information?
- coherence: Is the response logically structured and easy to follow?
- helpfulness: Does the response actually solve the user's problem?
- hallucination: Does the response contain fabricated information? (0 = heavy hallucination, 100 = zero hallucination)
- completeness: Does the response address all aspects of the task?

Also provide a 2-sentence justification for each score.

Return ONLY valid JSON, no markdown fences.
`;
```

**Composite Score Formula:**

```
composite = (accuracy × 0.30) + (coherence × 0.15) + (helpfulness × 0.25)
          + (hallucination × 0.20) + (completeness × 0.10)
```

---

### 7.3 Voice Evaluation via Phone (Plivo)

**What:** Users call a Plivo-provisioned phone number (or receive an outbound call) and have a live conversation with the AI agent under test. The system records the conversation, transcribes it in real time, and evaluates quality post-call.

**Technical Flow:**

```
Step 1: User clicks "Evaluate by Voice" on agent profile
            │
            ▼
Step 2: POST /api/voice/initiate
        → Plivo client.calls.create() to user's phone
        → answerUrl points to /api/voice/answer
            │
            ▼
Step 3: /api/voice/answer returns Plivo XML:
        <Response>
          <Speak>Connected to Litmus evaluation. You will now
                 speak with the agent. Say "end evaluation"
                 to finish.</Speak>
          <Stream
            keepCallAlive="true"
            bidirectional="true"
            contentType="audio/x-mulaw;rate=8000"
            statusCallbackUrl="https://litmus.vercel.app/api/voice/status">
            wss://litmus.vercel.app/api/voice/ws
          </Stream>
        </Response>
            │
            ▼
Step 4: WebSocket connection established
        → Plivo sends 'start' event with streamId, callId
        → Plivo sends 'media' events with base64 audio chunks
            │
            ▼
Step 5: Audio Processing Pipeline (Gemini Live API)
        ┌──────────────────────────────────────────┐
        │  User audio (mulaw 8kHz from Plivo)      │
        │      │                                    │
        │      ▼                                    │
        │  Convert mulaw 8kHz → PCM 16kHz           │
        │      │                                    │
        │      ▼                                    │
        │  Gemini Live API WebSocket Session        │
        │  (model: gemini-2.5-flash-native-audio)   │
        │  ┌──────────────────────────────────┐     │
        │  │  Audio In → Speech Understanding │     │
        │  │  → Response Generation           │     │
        │  │  → Audio Out (PCM 24kHz)         │     │
        │  │  + input/output transcription    │     │
        │  └──────────────────────────────────┘     │
        │      │                                    │
        │      ▼                                    │
        │  Convert PCM 24kHz → mulaw 8kHz           │
        │      │                                    │
        │      ▼                                    │
        │  Send 'playAudio' event via WS            │
        │  to Plivo → plays to user's phone         │
        └──────────────────────────────────────────┘
            │
            ▼
Step 6: Call ends → POST /api/evaluate
        → Full transcript sent to Gemini for scoring
        → Scores stored in voice_evaluations table
        → Agent's overall_score recalculated
```

**Plivo WebSocket Message Formats:**

```typescript
// Inbound: 'start' event
type PlivoStartEvent = {
  event: "start";
  start: {
    streamId: string;
    callId: string; // Plivo CallUUID
    accountId: string;
    from: string;
    to: string;
    codec: string; // "audio/x-mulaw"
  };
};

// Inbound: 'media' event
type PlivoMediaEvent = {
  event: "media";
  media: {
    contentType: string; // "audio/x-mulaw"
    sampleRate: number; // 8000
    payload: string; // base64-encoded audio
    timestamp: string;
  };
  streamId: string;
};

// Outbound: 'playAudio' event (send audio back to caller)
type PlivoPlayAudioEvent = {
  event: "playAudio";
  media: {
    contentType: "audio/x-mulaw";
    sampleRate: 8000;
    payload: string; // base64-encoded audio
  };
};

// Outbound: 'clearAudio' event (interrupt current playback)
type PlivoClearAudioEvent = {
  event: "clearAudio";
  streamId: string;
};
```

---

### 7.4 Real-Time Web Intelligence (You.com)

**What:** Continuously monitors the web for agent-related news, updates, community sentiment, and outage reports. This is the "live data layer" that keeps agent profiles current — the equivalent of PhysicalAI's live traffic Demand Score.

**Intelligence Gathering Pipeline:**

```typescript
/**
 * Gathers real-time web intelligence for a given agent.
 * Called on-demand when an agent profile is viewed,
 * and periodically via a Vercel Cron Job.
 */
async function gatherIntelligence(agentName: string, agentVendor: string): Promise<void> {
  const queries = [
    `${agentName} changelog updates ${new Date().getFullYear()}`,
    `${agentName} ${agentVendor} outage issues`,
    `${agentName} review comparison`,
    `${agentVendor} AI agent pricing changes`,
    `${agentName} community feedback reddit`,
  ];

  for (const query of queries) {
    // You.com Search API — GET https://api.ydc-index.io/v1/search
    const response = await fetch(
      `https://api.ydc-index.io/v1/search?${new URLSearchParams({
        query,
        count: "5",
        freshness: "month",
      })}`,
      {
        headers: { "X-API-Key": process.env.YOUCOM_API_KEY! },
      }
    );

    const data = await response.json();

    // For high-relevance results, fetch full content
    for (const result of data.results.web) {
      const contentResponse = await fetch(
        `https://api.ydc-index.io/v1/content?url=${encodeURIComponent(result.url)}`,
        {
          headers: { "X-API-Key": process.env.YOUCOM_API_KEY! },
        }
      );
      // ... process and store via Gemini summarization
    }
  }
}
```

**You.com API Endpoints Used:**

| Endpoint | Method | Base URL                              | Purpose                                   |
| -------- | ------ | ------------------------------------- | ----------------------------------------- |
| Search   | `GET`  | `https://api.ydc-index.io/v1/search`  | Web + news results with snippets          |
| Content  | `GET`  | `https://api.ydc-index.io/v1/content` | Full page HTML/Markdown for deep analysis |
| News     | `GET`  | `https://api.ydc-index.io/news`       | Breaking news about agents and vendors    |

**Key Parameters:**

- `query` (required): Search query string
- `count`: Max results per section (default 5, max 20)
- `freshness`: `day`, `week`, `month`, `year`, or `YYYY-MM-DDtoYYYY-MM-DD`
- `country`: ISO 3166-2 country code
- `livecrawl`: `web`, `news`, or `all` — fetches full page content inline
- `livecrawl_formats`: `html` or `markdown`

**Authentication:** All requests require `X-API-Key` header.

---

### 7.5 Third-Party Tool Integration (Composio)

**What:** Verify whether agents can actually perform the integrations they claim. If an agent says "I can create Jira tickets," Composio tests this by executing the tool call in a sandboxed environment and recording the result.

**Implementation:**

```typescript
import { Composio } from "@composio/core";

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
});

/**
 * Verifies whether a specific tool integration works
 * by executing a test action via Composio.
 */
async function verifyToolClaim(
  agentId: string,
  toolkitName: string // e.g., "GITHUB", "SLACK", "JIRA"
): Promise<ToolVerificationResult> {
  const userId = `litmus-verify-${agentId}`;

  // Get available tools for the claimed toolkit
  const tools = await composio.tools.get(userId, {
    toolkits: [toolkitName],
  });

  if (tools.length === 0) {
    return {
      claimed: true,
      verified: false,
      details: `No tools available for toolkit: ${toolkitName}`,
    };
  }

  // Execute a read-only test action
  // (e.g., list repos for GITHUB, list channels for SLACK)
  const testAction = tools.find(
    (t) => t.name.toLowerCase().includes("list") || t.name.toLowerCase().includes("get")
  );

  if (!testAction) {
    return {
      claimed: true,
      verified: false,
      details: "No safe read-only test action found",
    };
  }

  // ... execute and record result
}
```

**Composio V3 SDK Notes:**

- Package: `@composio/core` (V3 SDK, released July 2025)
- Authentication: `new Composio({ apiKey: "..." })`
- 850+ toolkits with 11,000+ individual tools
- Handles OAuth flows, API key management, and token refresh automatically
- Tool execution results include structured response schemas

---

### 7.6 Intercom-Specific Analytics

**What:** For agents deployed on the Intercom platform (particularly Fin), pull verified performance data directly from the Intercom API. This is the "verified employment" equivalent from Glassdoor — not self-reported, but API-verified.

**Metrics Pulled:**

| Metric             | Intercom API Endpoint             | Description                                          |
| ------------------ | --------------------------------- | ---------------------------------------------------- |
| Resolution Rate    | `GET /conversations` + filtering  | % of conversations resolved without human escalation |
| Avg. Response Time | `GET /conversations/{id}`         | Time between customer message and agent response     |
| Escalation Rate    | `GET /conversations`              | % of conversations handed off to human agents        |
| Topic Distribution | `GET /conversations` with tags    | What topics the agent handles most                   |
| CSAT Scores        | `GET /conversations` with ratings | Customer satisfaction from post-conversation surveys |

**Intercom REST API Usage:**

```typescript
// Base URL: https://api.intercom.io
// Auth: Bearer token in Authorization header
// API Version: Set via Intercom-Version header (use "2.11" or latest)

const intercomHeaders = {
  Authorization: `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/json",
  "Intercom-Version": "2.11",
};

// Fetch conversations resolved by Fin
const response = await fetch("https://api.intercom.io/conversations/search", {
  method: "POST",
  headers: intercomHeaders,
  body: JSON.stringify({
    query: {
      operator: "AND",
      value: [
        {
          field: "source.author.type",
          operator: "=",
          value: "bot",
        },
        {
          field: "statistics.last_close_at",
          operator: ">",
          value: Math.floor(Date.now() / 1000) - 86400 * 30, // last 30 days
        },
      ],
    },
  }),
});
```

**Privacy Note:** This feature requires the user to authenticate with their own Intercom workspace via OAuth. Litmus never stores raw conversation content — only aggregate metrics.

---

### 7.7 Comparison Dashboard

**What:** Select 2–4 agents and view them side-by-side with radar charts, metric tables, pricing calculators, and a Gemini-generated recommendation.

**UI Components:**

1. **Agent Selector:** Combobox (Shadcn) with search, max 4 agents
2. **Radar Chart:** Recharts `RadarChart` with axes: Accuracy, Coherence, Helpfulness, Hallucination Resistance, Latency, Tool Reliability
3. **Metric Table:** Tabular comparison of all quantitative metrics
4. **Pricing Calculator:** Input your expected monthly volume, see projected costs for each agent
5. **AI Recommendation:** Gemini generates a 3–5 sentence recommendation based on the comparison data and the user's stated use case
6. **Web Intel Diff:** Show the latest You.com intelligence for each agent side-by-side — recent news, changelogs, community sentiment

---

## 8. API Route Specifications

### `POST /api/agents`

**Purpose:** Submit a new agent to the registry.

| Parameter      | Type     | Required | Description                     |
| -------------- | -------- | -------- | ------------------------------- |
| `name`         | `string` | Yes      | Agent display name              |
| `vendor`       | `string` | Yes      | Company name                    |
| `category`     | `string` | Yes      | One of the defined categories   |
| `website_url`  | `string` | Yes      | Official product URL            |
| `api_endpoint` | `string` | No       | Public API endpoint for testing |

**Response:** `201` with created agent object. Triggers async You.com crawl + Gemini profile generation.

---

### `POST /api/agents/[slug]/benchmark`

**Purpose:** Trigger a benchmarking run for an agent.

| Parameter        | Type       | Required | Description                                              |
| ---------------- | ---------- | -------- | -------------------------------------------------------- |
| `benchmark_type` | `string`   | Yes      | One of: `text_qa`, `support_sim`, `tool_use`, `code_gen` |
| `custom_tasks`   | `object[]` | No       | Override default tasks with custom ones                  |

**Response:** `202 Accepted` with benchmark ID. Evaluation runs asynchronously. Client polls or uses Supabase Realtime subscription for results.

---

### `POST /api/voice/initiate`

**Purpose:** Start a voice evaluation call.

| Parameter      | Type     | Required | Description                        |
| -------------- | -------- | -------- | ---------------------------------- |
| `agent_id`     | `string` | Yes      | Agent to evaluate                  |
| `phone_number` | `string` | Yes      | User's phone number (E.164 format) |

**Implementation:**

```typescript
import plivo from "plivo";

export async function POST(request: Request): Promise<Response> {
  const { agent_id, phone_number } = await request.json();

  // Input validation
  if (!agent_id || !phone_number) {
    return Response.json({ error: "agent_id and phone_number are required" }, { status: 400 });
  }

  const client = new plivo.Client(process.env.PLIVO_AUTH_ID!, process.env.PLIVO_AUTH_TOKEN!);

  const call = await client.calls.create(
    process.env.PLIVO_PHONE_NUMBER!, // from
    phone_number, // to
    `https://${process.env.VERCEL_URL}/api/voice/answer?agent_id=${agent_id}`,
    {
      answerMethod: "POST",
      hangupUrl: `https://${process.env.VERCEL_URL}/api/webhooks/plivo`,
      hangupMethod: "POST",
    }
  );

  // Store call metadata in Supabase
  // ...

  return Response.json(
    {
      call_uuid: call.requestUuid,
      status: "initiating",
    },
    { status: 201 }
  );
}
```

---

### `POST /api/voice/answer`

**Purpose:** Plivo answer URL. Returns XML that initiates bidirectional audio streaming.

```typescript
import plivo from "plivo";

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agent_id");

  const plivoResponse = new plivo.Response();

  plivoResponse.addSpeak(
    "Connected to Litmus voice evaluation. " +
      "You will now speak with the AI agent. " +
      "Say end evaluation when you are finished."
  );

  const streamElement = plivoResponse.addStream(
    `wss://${process.env.VERCEL_URL}/api/voice/ws?agent_id=${agentId}`
  );
  streamElement.addAttribute("keepCallAlive", "true");
  streamElement.addAttribute("bidirectional", "true");
  streamElement.addAttribute("contentType", "audio/x-mulaw;rate=8000");
  streamElement.addAttribute("streamTimeout", "600");
  streamElement.addAttribute(
    "statusCallbackUrl",
    `https://${process.env.VERCEL_URL}/api/voice/status`
  );

  return new Response(plivoResponse.toXML(), {
    headers: { "Content-Type": "application/xml" },
  });
}
```

---

### `GET /api/agents/[slug]/intelligence`

**Purpose:** Fetch latest web intelligence for an agent.

**Response:**

```json
{
  "agent_slug": "intercom-fin-3",
  "intelligence": [
    {
      "source_type": "changelog",
      "title": "Fin 3 Procedures Feature Launch",
      "summary": "Intercom launched Procedures in Fin 3, enabling...",
      "source_url": "https://www.intercom.com/blog/whats-new-with-fin-3/",
      "sentiment": "positive",
      "fetched_at": "2026-02-05T14:30:00Z"
    }
  ],
  "last_updated": "2026-02-05T14:30:00Z"
}
```

---

## 9. Integration Details

### 9.1 Plivo Audio Streaming (Voice Agents)

**npm package:** `plivo`

```bash
npm install plivo
```

**Client Initialization:**

```typescript
import plivo from "plivo";

// Environment variables: PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN
const client = new plivo.Client(process.env.PLIVO_AUTH_ID!, process.env.PLIVO_AUTH_TOKEN!);
```

**Key APIs Used:**

| API         | Method                      | Endpoint                                         | Purpose                       |
| ----------- | --------------------------- | ------------------------------------------------ | ----------------------------- |
| Create Call | `client.calls.create()`     | `POST /v1/Account/{auth_id}/Call/`               | Initiate outbound call        |
| Get Call    | `client.calls.get(uuid)`    | `GET /v1/Account/{auth_id}/Call/{uuid}/`         | Get call details              |
| Hangup Call | `client.calls.hangup(uuid)` | `DELETE /v1/Account/{auth_id}/Call/{uuid}/`      | End a call                    |
| Stream API  | REST                        | `POST /v1/Account/{auth_id}/Call/{uuid}/Stream/` | Initiate audio stream via API |

**Audio Format Conversion:** Plivo streams `audio/x-mulaw` at 8kHz, while Gemini Live API expects PCM 16-bit at 16kHz input and outputs PCM at 24kHz. The WebSocket server must perform real-time format conversion:

- **Inbound (Plivo → Gemini):** mulaw 8kHz → PCM 16-bit 16kHz (upsample + decode)
- **Outbound (Gemini → Plivo):** PCM 24kHz → mulaw 8kHz (downsample + encode)

Use the `wavefile` npm package or a lightweight custom buffer converter for this. The conversion is computationally trivial and adds <1ms latency.

**WebSocket Events:**

- `start` — Stream established, contains `streamId` and `callId`
- `media` — Audio chunk with base64 payload
- `stop` — Stream ended
- `playAudio` — (outbound) Send audio back to caller
- `clearAudio` — (outbound) Interrupt current playback

**Critical Configuration:** Always set `keepCallAlive="true"` in the `<Stream>` XML element. Without this, Plivo disconnects the call immediately after the stream element is processed because there are no further XML execution elements.

---

### 9.2 You.com Search/Content APIs

**No npm package required.** Pure REST API with `X-API-Key` authentication.

**Base URL:** `https://api.ydc-index.io`

**Endpoints:**

| Endpoint | URL           | Key Params                                                                 |
| -------- | ------------- | -------------------------------------------------------------------------- |
| Search   | `/v1/search`  | `query`, `count`, `freshness`, `country`, `livecrawl`, `livecrawl_formats` |
| Content  | `/v1/content` | `url`                                                                      |
| News     | `/news`       | `query`, `count`, `freshness`                                              |

**Authentication:**

```typescript
const headers = {
  "X-API-Key": process.env.YOUCOM_API_KEY!,
};
```

**Response Shape (Search):**

```typescript
type YouSearchResponse = {
  results: {
    web: Array<{
      url: string;
      title: string;
      description: string;
      snippets: string[];
      page_age: string; // ISO date
      thumbnail_url: string;
      favicon_url: string;
    }>;
    news: Array<{
      url: string;
      title: string;
      description: string;
      page_age: string;
      thumbnail_url: string;
    }>;
  };
  metadata: {
    request_uuid: string;
    query: string;
    latency: number;
  };
};
```

---

### 9.3 Google Gemini API (@google/genai)

**npm package:** `@google/genai` (v1.40.0+, GA since May 2025)

```bash
npm install @google/genai
```

**Client Initialization:**

```typescript
import { GoogleGenAI } from "@google/genai";

// Server-side only — never expose API key to client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});
```

**Generate Content (Benchmark Evaluation):**

```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash", // Fast, cost-effective for judging
  contents: evaluationPrompt,
  config: {
    responseMimeType: "application/json", // Force JSON output
  },
});

const evaluation = JSON.parse(response.text!);
```

**Streaming (Agent Profile Generation):**

```typescript
const stream = await ai.models.generateContentStream({
  model: "gemini-2.5-flash",
  contents: profileGenerationPrompt,
});

for await (const chunk of stream) {
  // Stream to client via SSE or Supabase Realtime
  process.stdout.write(chunk.text ?? "");
}
```

**Function Calling (Tool Verification Support):**

```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Verify this agent can create GitHub issues",
  config: {
    tools: [
      {
        functionDeclarations: [
          {
            name: "verify_integration",
            description: "Test whether an AI agent can perform a specific tool action",
            parameters: {
              type: "OBJECT",
              properties: {
                toolkit: { type: "STRING", description: "Integration name" },
                action: { type: "STRING", description: "Action to verify" },
                test_params: { type: "OBJECT", description: "Test parameters" },
              },
              required: ["toolkit", "action"],
            },
          },
        ],
      },
    ],
  },
});
```

**Model Selection:**

| Model                                           | Use Case                                                          | Rationale                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| `gemini-2.5-flash`                              | Benchmark evaluation, profile generation, transcript scoring      | Fast, cheap, sufficient for structured judging tasks             |
| `gemini-2.5-pro`                                | Complex multi-agent comparison, nuanced recommendation generation | Higher reasoning capability for synthesis tasks                  |
| `gemini-2.5-flash-native-audio-preview-12-2025` | Voice evaluation (real-time STT + TTS in one session)             | Native audio model — replaces separate STT/TTS services entirely |
| `gemini-2.5-flash-preview-tts`                  | Standalone TTS for non-realtime audio generation                  | High-quality speech synthesis with style/emotion control         |

**Gemini Live API (Voice Evaluation Pipeline):**

The Live API is the critical piece that replaces both Deepgram (STT) and ElevenLabs (TTS) with a single Gemini session. It maintains a persistent bidirectional WebSocket connection that processes audio input and generates audio output in real-time.

```typescript
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Establishes a Gemini Live API session for real-time voice evaluation.
 * Handles both speech understanding (STT) and response generation (TTS)
 * in a single persistent WebSocket session.
 *
 * Audio input:  PCM 16-bit, 16kHz, mono
 * Audio output: PCM 16-bit, 24kHz, mono
 */
async function createLiveSession(agentSystemPrompt: string) {
  const session = await ai.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: agentSystemPrompt,
      inputAudioTranscription: {}, // Enable input transcription
      outputAudioTranscription: {}, // Enable output transcription
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Kore", // Female voice, professional tone
          },
        },
      },
    },
  });

  return session;
}

/**
 * Sends a chunk of audio to the Gemini Live API session.
 * Audio must be PCM 16-bit, 16kHz mono.
 */
async function sendAudioChunk(session: LiveSession, pcm16kBuffer: Buffer): Promise<void> {
  await session.sendRealtimeInput({
    audio: {
      data: pcm16kBuffer,
      mimeType: "audio/pcm;rate=16000",
    },
  });
}

/**
 * Receives messages from the Gemini Live API session.
 * Messages can include audio data, transcriptions, or tool calls.
 */
async function* receiveMessages(session: LiveSession) {
  for await (const msg of session.receive()) {
    // Audio response from Gemini (PCM 24kHz)
    if (msg.serverContent?.modelTurn?.parts) {
      for (const part of msg.serverContent.modelTurn.parts) {
        if (part.inlineData) {
          yield {
            type: "audio" as const,
            data: Buffer.from(part.inlineData.data, "base64"),
            mimeType: part.inlineData.mimeType,
          };
        }
      }
    }

    // Input transcription (what the user said)
    if (msg.serverContent?.inputTranscription) {
      yield {
        type: "input_transcript" as const,
        text: msg.serverContent.inputTranscription.text,
      };
    }

    // Output transcription (what the agent said)
    if (msg.serverContent?.outputTranscription) {
      yield {
        type: "output_transcript" as const,
        text: msg.serverContent.outputTranscription.text,
      };
    }
  }
}
```

**Key Gemini Live API Specs:**

| Parameter           | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| Input audio format  | PCM 16-bit, 16kHz, mono                                                     |
| Output audio format | PCM 16-bit, 24kHz, mono                                                     |
| Context window      | 128k tokens (native audio models)                                           |
| Built-in VAD        | Yes (automatic voice activity detection)                                    |
| Barge-in support    | Yes (user can interrupt agent mid-response)                                 |
| Affective dialog    | Yes (adapts tone to user emotion, requires `v1alpha` API version)           |
| Transcription       | Both input and output transcription available                               |
| Available voices    | 30+ HD voices (Kore, Puck, Charon, Fenrir, Aoede, Leda, Orus, Zephyr, etc.) |
| Languages           | 24 languages supported                                                      |

---

### 9.4 Composio Toolkits (@composio/core)

**npm package:** `@composio/core` (V3 SDK)

```bash
npm install @composio/core
```

**Client Initialization:**

```typescript
import { Composio } from "@composio/core";

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY!,
});
```

**Get Tools for a Toolkit:**

```typescript
const userId = "litmus-system";
const tools = await composio.tools.get(userId, {
  toolkits: ["GITHUB"],
});
// Returns array of tool definitions with names, descriptions, parameter schemas
```

**Available Toolkit Categories (relevant subset):**

| Category        | Example Toolkits                       |
| --------------- | -------------------------------------- |
| Developer Tools | GITHUB, GITLAB, LINEAR, SENTRY         |
| Communication   | SLACK, DISCORD, GMAIL, MICROSOFT_TEAMS |
| Productivity    | JIRA, NOTION, ASANA, TRELLO, CLICKUP   |
| CRM             | HUBSPOT, SALESFORCE                    |
| Data            | GOOGLE_SHEETS, AIRTABLE, SUPABASE      |

**V3 SDK Breaking Changes Note:** The V3 SDK (released mid-2025) renames "entities" to "users", "integrations" to "auth configs", and "connected accounts" to "connections". Always use V3 patterns:

```typescript
// V3 pattern (correct)
const tools = await composio.tools.get(userId, { toolkits: ["GITHUB"] });

// V1/V2 pattern (deprecated — do NOT use)
// const entity = await toolset.getEntity(userId);
```

---

### 9.5 Intercom REST API

**No npm SDK needed** (Intercom's Node SDK exists but the REST API is simpler for our read-heavy use case).

**Base URL:** `https://api.intercom.io`

**Authentication:**

```typescript
const headers = {
  Authorization: `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/json",
  "Intercom-Version": "2.11",
};
```

**Key Endpoints:**

| Endpoint                | Method | Purpose                           |
| ----------------------- | ------ | --------------------------------- |
| `/conversations/search` | `POST` | Search conversations with filters |
| `/conversations/{id}`   | `GET`  | Get single conversation detail    |
| `/contacts`             | `GET`  | List contacts                     |
| `/data_attributes`      | `GET`  | List custom data attributes       |
| `/tags`                 | `GET`  | List tags for categorization      |

**Regional Endpoints:**

| Region    | Base URL                     |
| --------- | ---------------------------- |
| US        | `https://api.intercom.io`    |
| EU        | `https://api.eu.intercom.io` |
| Australia | `https://api.au.intercom.io` |

---

## 10. Environment Variables

```bash
# === Core ===
NEXT_PUBLIC_APP_URL=https://litmus.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# === Google Gemini ===
GEMINI_API_KEY=AI...

# === Plivo (Voice) ===
PLIVO_AUTH_ID=MA...
PLIVO_AUTH_TOKEN=...
PLIVO_PHONE_NUMBER=+1415...

# === You.com ===
YOUCOM_API_KEY=...

# === Composio ===
COMPOSIO_API_KEY=...

# === Intercom ===
INTERCOM_ACCESS_TOKEN=dG9r...
INTERCOM_APP_ID=...
```

---

## 11. Deployment (Vercel)

### `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is default in Next.js 16 — no opt-in needed
  reactCompiler: true, // Stable in Next.js 16
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.intercom.com" },
    ],
  },
  serverExternalPackages: ["plivo"], // Plivo SDK needs Node.js native modules
};

export default nextConfig;
```

### WebSocket Limitation on Vercel

Vercel's serverless functions do **not** natively support persistent WebSocket connections. For the Plivo audio streaming WebSocket, you have two options:

**Option A (Recommended for hackathon): Separate WebSocket server**

Deploy a lightweight Fastify or Express WebSocket server on Railway, Render, or Fly.io. Point the Plivo `<Stream>` URL to this server. The WebSocket server communicates with the Next.js app via Supabase Realtime or direct API calls.

**Option B: Vercel with `@vercel/node` and upgrade**

Use a Vercel Serverless Function with manual WebSocket upgrade. This is experimental and may have timeout limitations (max 300s on Pro plan).

**Recommendation:** For hackathon demo reliability, go with **Option A**. Deploy a `ws-server/` directory to Railway with a `Dockerfile`. This isolates the flaky WebSocket handling from the rest of the app.

```
litmus/
├── ws-server/                 # Separate WebSocket server
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts           # Fastify + @fastify/websocket
└── ...                        # Main Next.js app on Vercel
```

### Vercel Cron Jobs

For periodic web intelligence gathering:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/intelligence",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## 12. Hackathon Demo Script

**Total demo time target: 3 minutes**

### Slide 1: The Problem (30 seconds)

"Choosing an AI agent today is like choosing a job without Glassdoor. Vendor claims are unverifiable. There are no standardized benchmarks. Community sentiment is scattered across Reddit threads and blog posts. And if you want to evaluate a voice agent? You literally have to call it yourself and take notes. Every agent needs a litmus test — and that's exactly what we built."

### Live Demo Part 1: Agent Discovery (30 seconds)

- Open Litmus → Agent Directory
- Type "customer support" → show filtered results with scores, categories, verified badges
- Click on "Intercom Fin 3" profile → show auto-generated profile with live web intelligence feed

### Live Demo Part 2: Live Benchmark (45 seconds)

- Click "Run Benchmark" → select `support_sim`
- Show the benchmark running in real-time: task sent → agent response received → Gemini evaluation streaming in
- Scores populate: Accuracy 92, Coherence 88, Helpfulness 94, Hallucination Resistance 96

### Live Demo Part 3: Voice Evaluation (45 seconds)

- Click "Evaluate by Voice" → enter phone number → call is placed
- Show the live transcript appearing on screen as the evaluator talks to the agent
- After 30 seconds, say "end evaluation"
- Show Gemini's post-call evaluation with voice-specific scores

### Live Demo Part 4: Comparison (30 seconds)

- Navigate to Compare → select Fin 3 vs. a custom agent
- Show radar chart overlay, metric diff table, and Gemini recommendation
- Show tool verification badges (green checkmarks from Composio)

### Closing (15 seconds)

"Litmus — because vendor claims aren't proof. Built with Plivo, You.com, Gemini, Composio, and Intercom."

---

## 13. Division of Labor (3-Person Team)

| Person                           | Responsibilities                                                                                                         | Key Files                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Person A (Full-Stack Lead)**   | Next.js 16 setup, Supabase schema, auth, agent CRUD, deployment, proxy.ts                                                | `next.config.ts`, `src/app/`, `src/api/agents/`, `supabase/`                                       |
| **Person B (Voice + Backend)**   | Plivo integration, WebSocket server, Gemini Live API audio pipeline, mulaw↔PCM conversion, post-call evaluation pipeline | `ws-server/`, `src/lib/plivo/`, `src/lib/gemini/live.ts`, `src/api/voice/`, `src/api/evaluate/`    |
| **Person C (Intelligence + UI)** | You.com integration, Composio verification, Intercom metrics, comparison dashboard, Shadcn components, Recharts          | `src/lib/youcom/`, `src/lib/composio/`, `src/lib/intercom/`, `src/components/`, `src/app/compare/` |

### Parallelization Strategy

**Hours 0–1:** Person A sets up Next.js 16, Supabase, and basic routing. Person B sets up the WebSocket server and Plivo account. Person C initializes Shadcn components and You.com client.

**Hours 1–3:** Person A builds agent CRUD and directory page. Person B gets Plivo → Gemini Live API bidirectional audio pipeline working end-to-end. Person C builds intelligence gathering and Composio verification.

**Hours 3–4.5:** Person A integrates Gemini benchmarking. Person B connects voice pipeline to Gemini evaluation. Person C builds comparison dashboard and Intercom metrics.

**Hours 4.5–5:** All three converge for integration testing, demo prep, and polish.

---

## 14. Risk Mitigation

| Risk                                 | Probability | Impact   | Mitigation                                                                                                                                                                                              |
| ------------------------------------ | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plivo WebSocket fails on Vercel      | High        | Critical | Deploy WebSocket server separately on Railway (Option A in §11)                                                                                                                                         |
| Plivo number not provisioned in time | Medium      | Critical | Pre-provision number before hackathon day; have a fallback demo using a pre-recorded call                                                                                                               |
| Gemini API rate limits               | Low         | Medium   | Use `gemini-2.5-flash` (generous free tier), batch evaluation requests                                                                                                                                  |
| You.com API latency                  | Low         | Low      | Cache intelligence results in Supabase with 6-hour TTL                                                                                                                                                  |
| Composio auth flow complexity        | Medium      | Medium   | Pre-authenticate test accounts before demo; show verification results from cached data if live auth fails                                                                                               |
| Intercom OAuth setup time            | Medium      | Medium   | Use a pre-configured development workspace with seed data                                                                                                                                               |
| Voice evaluation audio quality       | Medium      | Medium   | Use a quiet room for demo; have a pre-recorded evaluation as backup; Gemini Live API's built-in VAD helps filter noise                                                                                  |
| Gemini Live API latency              | Medium      | High     | Native audio model is still in preview; test latency before demo day. Fallback: use `gemini-live-2.5-flash-preview` (half-cascade, text mode) with separate Gemini TTS (`gemini-2.5-flash-preview-tts`) |
| Mulaw ↔ PCM conversion               | Low         | Medium   | Use `wavefile` npm package, well-tested; pre-validate conversion pipeline with a recorded Plivo call                                                                                                    |
| Next.js 16 proxy.ts unfamiliarity    | Low         | Low      | Minimal proxy logic needed; fallback to route-level auth checks                                                                                                                                         |

### Critical Pre-Hackathon Checklist

- [ ] Plivo account created, phone number purchased and verified
- [ ] Plivo answer URL and WebSocket URL configured
- [ ] You.com API key obtained with sufficient quota
- [ ] Gemini API key from Google AI Studio (covers benchmarking, profiling, AND voice STT+TTS)
- [ ] Composio account with test integrations pre-authenticated
- [ ] Intercom development workspace created with seed conversation data
- [ ] Supabase project created with schema migrated
- [ ] Railway or Fly.io account for WebSocket server deployment
- [ ] Vercel project linked to GitHub repo
- [ ] All environment variables set in Vercel dashboard
- [ ] ngrok installed for local WebSocket testing
- [ ] Demo phone number tested with Plivo outbound calls

---

## 15. Example Agents to Test

These are real, publicly accessible AI agents that Litmus can evaluate during the hackathon demo. They span multiple categories and represent the spectrum from major vendor products to open-source deployments.

### Customer Support Agents

| Agent                | Vendor   | Access Method                                                          | Why It's a Good Test Case                                                                                                                                                                                                                                                             |
| -------------------- | -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Intercom Fin 3**   | Intercom | Intercom API (Fin over API) + any public Intercom Messenger widget     | The hackathon's primary sponsor. Fin 3 introduced Procedures, Simulations, and Voice. Pulling Fin's verified resolution rate via the Intercom API is a direct demo of Litmus's "verified metrics" differentiator. Test against Fin's own published 66% average resolution rate claim. |
| **Zendesk AI Agent** | Zendesk  | Public help center chat widgets (many companies deploy these publicly) | Direct competitor to Fin. Benchmarking Fin vs. Zendesk side-by-side on the same support tickets is the ultimate demo moment. Find a company using Zendesk AI on their public support page and run a live comparison.                                                                  |
| **Ada AI Agent**     | Ada      | Public customer chat widgets                                           | Ada serves brands like Meta, Shopify, and Square. Their agents are deployed on many public e-commerce support pages. Good for testing support quality across different knowledge domains.                                                                                             |
| **Tidio Lyro**       | Tidio    | Public website chat widgets                                            | Commonly deployed on small-to-medium business websites. Tests how Litmus handles lower-tier agents vs. enterprise ones. Useful for showing score variance across quality tiers.                                                                                                       |

**How to test support agents without API access:** Many companies deploy their AI support agents on public-facing help pages. For the demo, identify 3–4 companies using different agents (check their chat widget — Intercom shows the Intercom logo, Zendesk shows "Powered by Zendesk," etc.) and run the same 5 support questions against each. Gemini judges the responses.

### Voice Agents

| Agent                    | Vendor | Access Method                                                                                  | Why It's a Good Test Case                                                                                                                                                                                  |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bland AI**             | Bland  | REST API (`api.bland.ai`) — free trial available, can trigger outbound calls to a phone number | Purpose-built voice agent platform. Call their demo line, pipe the audio through Plivo → Gemini Live API, and score the interaction. This is the flagship demo for Litmus's voice evaluation feature.      |
| **Vapi**                 | Vapi   | REST API (`api.vapi.ai`) — free tier with 10 minutes of calls                                  | Another major voice agent platform. Create a test assistant, have Litmus call it, and benchmark naturalness, latency, and helpfulness against Bland.                                                       |
| **Retell AI**            | Retell | REST API + WebSocket — free trial                                                              | Competes directly with Bland and Vapi. Has a "phone call" API where you can trigger calls. Third data point for voice agent comparison.                                                                    |
| **Google Dialogflow CX** | Google | Telephony integration via CCAI                                                                 | Google's own voice agent platform. Interesting to benchmark since Litmus uses Gemini as the judge — testing how Gemini-as-judge evaluates a Google-built agent adds credibility to the impartiality claim. |

**Demo strategy for voice agents:** Pre-configure a Bland AI and Vapi test assistant with identical system prompts (e.g., "You are a pizza restaurant booking agent"). During the live demo, call both through Litmus's Plivo voice evaluation, then show the side-by-side Gemini evaluation scores on stage.

### Coding Copilots / General Assistants

| Agent                         | Vendor          | Access Method                                     | Why It's a Good Test Case                                                                                                                                                                                                                                       |
| ----------------------------- | --------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude (Anthropic)**        | Anthropic       | REST API (`api.anthropic.com/v1/messages`)        | One of the top-tier LLMs. Use as a baseline "gold standard" for text-based benchmarks. Run Litmus's `text_qa` and `code_gen` benchmark suites against it.                                                                                                       |
| **GPT-4o**                    | OpenAI          | REST API (`api.openai.com/v1/chat/completions`)   | The other top-tier LLM. Head-to-head benchmarking GPT-4o vs. Claude on identical tasks, judged by Gemini, demonstrates Litmus's neutrality.                                                                                                                     |
| **Gemini 2.5 Flash**          | Google          | `@google/genai` SDK                               | Interesting meta-case: Gemini evaluating itself. Address this directly in the demo — "Yes, the judge is also a contestant. Here's why the scores are still credible..." (standardized rubric, structured output, no self-recognition in the evaluation prompt). |
| **Mistral Large**             | Mistral         | REST API (`api.mistral.ai/v1/chat/completions`)   | Strong European alternative. Tests whether Litmus can benchmark agents that have different API shapes — the adapter pattern in the benchmarking engine needs to handle varying response formats.                                                                |
| **Llama 4 (via Together AI)** | Meta / Together | REST API (`api.together.xyz/v1/chat/completions`) | Open-source model benchmark. Together AI hosts Llama with an OpenAI-compatible API. Good for testing the "open-source vs. proprietary" comparison narrative.                                                                                                    |

### Research Agents

| Agent                      | Vendor     | Access Method                                   | Why It's a Good Test Case                                                                                                                                                                                                            |
| -------------------------- | ---------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **You.com Research Agent** | You.com    | Advanced Agent API (`api.ydc-index.io`)         | A hackathon sponsor's own product. Using You.com's Advanced Agent API (multi-turn reasoning with iterative planning) as a test subject — then searching for reviews of it via You.com's Search API — is a compelling recursive demo. |
| **Perplexity**             | Perplexity | REST API (`api.perplexity.ai/chat/completions`) | Leading search-augmented AI. Benchmark its research output quality against You.com's Research Agent on the same queries.                                                                                                             |
| **Tavily**                 | Tavily     | REST API — purpose-built for AI agent search    | Designed specifically as a search tool for AI agents. Different architecture than You.com (returns pre-processed results). Tests whether Litmus can benchmark tool-type agents, not just chat agents.                                |

### Agents Testable via Composio

These agents claim specific tool integrations that Litmus can verify through Composio's 850+ toolkits:

| Claimed Integration                          | Composio Toolkit  | Test Action                               | What We Verify                                        |
| -------------------------------------------- | ----------------- | ----------------------------------------- | ----------------------------------------------------- |
| "Creates GitHub issues from support tickets" | `GITHUB`          | `GITHUB_CREATE_ISSUE` (use a test repo)   | Agent can actually write to GitHub, not just claim it |
| "Sends Slack notifications on escalation"    | `SLACK`           | `SLACK_SEND_MESSAGE` (use a test channel) | Agent can post to Slack with correct formatting       |
| "Creates Jira tickets"                       | `JIRA`            | `JIRA_CREATE_ISSUE`                       | Agent produces valid Jira payloads                    |
| "Updates Salesforce records"                 | `SALESFORCE`      | `SALESFORCE_CREATE_RECORD` (sandbox)      | Agent can write CRM data correctly                    |
| "Sends follow-up emails"                     | `GMAIL`           | `GMAIL_SEND_EMAIL` (to a test address)    | Agent can compose and send proper emails              |
| "Schedules calendar events"                  | `GOOGLE_CALENDAR` | `GOOGLE_CALENDAR_CREATE_EVENT`            | Agent produces valid event data with correct times    |

### Recommended Demo Agent Set (5 Agents, Maximum Impact)

For the 3-minute hackathon demo, pre-load these 5 agents to show breadth:

1. **Intercom Fin 3** (support) — sponsor product, verified Intercom API metrics
2. **Bland AI** (voice) — live voice evaluation via Plivo call
3. **Claude** (general LLM) — text benchmark baseline
4. **You.com Research Agent** (research) — sponsor product, recursive demo
5. **Zendesk AI** (support) — Fin's direct competitor for the comparison dashboard

This gives you a demo flow of: show directory → drill into Fin profile with live intel → run a benchmark → do a live voice eval on Bland → compare Fin vs. Zendesk side-by-side. Every sponsor tool gets touched, every feature gets shown.

---

## Appendix: Quick-Start Commands

```bash
# 1. Create the Next.js 16 project
npx create-next-app@latest litmus --typescript --tailwind --eslint --app --turbopack

# 2. Install dependencies
cd litmus
npm install @supabase/supabase-js @google/genai plivo @composio/core wavefile
npm install recharts date-fns zod

# 3. Install Shadcn UI
npx shadcn@latest init
npx shadcn@latest add button card input select table tabs badge dialog combobox

# 4. Install dev dependencies
npm install -D @types/ws

# 5. Set up the WebSocket server (separate project)
mkdir ws-server && cd ws-server
npm init -y
npm install fastify @fastify/websocket @google/genai wavefile dotenv
npm install -D typescript @types/node tsx

# 6. Run development
cd ../litmus
npm run dev
```

---

_Spec authored for the Continual Learning Hackathon — February 2026. San Francisco, CA. Litmus — the litmus test for AI agents._
