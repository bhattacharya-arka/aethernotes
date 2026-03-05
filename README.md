# AetherNotes

> A production-grade **encrypted note-taking platform** inspired by Notion, Linear, and Obsidian.
> Built with **Java 21 + Spring Boot 3** on the backend and **Next.js 14** on the frontend.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Encryption Design](#encryption-design)
5. [Setup — Docker (recommended for macOS/Linux)](#setup--docker-recommended-for-macoslinux)
6. [Setup — Windows (native, no Docker)](#setup--windows-native-no-docker)
7. [Setup — macOS (native, no Docker)](#setup--macos-native-no-docker)
8. [Environment Variables](#environment-variables)
9. [Seed Data & Demo Account](#seed-data--demo-account)
10. [API Reference](#api-reference)
11. [Project Structure](#project-structure)
12. [Known Caveats](#known-caveats)
13. [Development Tips](#development-tips)

---

## Features

### Rich Text Editor
- **TipTap** (ProseMirror) editor with full formatting: bold, italic, underline, headings (H1–H3), bullet lists, ordered lists, blockquotes, inline code, fenced code blocks, and task lists
- Floating **bubble menu** appears on text selection for quick formatting
- **Auto-save** with 1.5 s debounce — changes are persisted transparently; no manual save needed
- Word and character count in the status bar

### Notes Management
- Create, read, update, and delete notes
- **Favorites** — star any note for quick access
- **Tagging** — add comma-separated tags to each note; filter the sidebar by tag
- Sort by last edited date

### Search
- Full-text search over note **titles** using PostgreSQL `tsvector` with prefix matching (partial words work after 2 characters)
- Highlighted match terms in results
- Keyboard shortcut: `Ctrl+/` (or `Cmd+/` on Mac)

### Command Palette
- Open with `Ctrl+K` / `Cmd+K`
- Commands: New note, Search, toggle theme, Sign out
- Recent notes listed for instant navigation

### Authentication
- Register with username, email, and password
- Login issues a signed **JWT** (24 h TTL)
- Logout blacklists the token in Redis and removes the encryption key from the session

### Real-time Sync
- **WebSocket** (STOMP over SockJS) — all open sessions for the same user receive live note updates
- Optimistic UI updates via TanStack Query

### Offline Support
- Notes cached in **IndexedDB** via `idb`
- Create/update/delete mutations queued while offline
- Auto-synced in the background when the connection is restored

### Theming
- Dark and light modes (system-aware default, togglable per session)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│   Next.js 14  ·  TipTap  ·  Zustand  ·  IndexedDB      │
└─────────────────────┬──────────────────────────────────-┘
                      │  HTTP/REST + WebSocket (STOMP)
┌─────────────────────▼───────────────────────────────────┐
│                  Spring Boot 3                          │
│   REST API  ·  WebSocket  ·  Spring Security / JWT      │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
    ┌──────▼──────┐            ┌──────▼──────┐
    │ PostgreSQL  │            │    Redis    │
    │  (Flyway)   │            │ enc keys,   │
    │  tsvector   │            │ token BL,   │
    │  search     │            │ note cache  │
    └─────────────┘            └─────────────┘
```

### Request Lifecycle

1. Client sends `POST /api/auth/login` with email and password.
2. Spring Security validates credentials against the BCrypt hash in PostgreSQL.
3. Backend derives a 256-bit AES key via **PBKDF2WithHmacSHA256** (password + stored salt) and stores it in Redis with a 24 h TTL.
4. Backend issues a signed JWT containing the `userId`.
5. Subsequent requests carry the JWT in `Authorization: Bearer <token>`.
6. `JwtAuthenticationFilter` validates the token and rejects blacklisted tokens.
7. Note content is **decrypted on-the-fly** from Redis + AES-GCM; ciphertext never leaves the server in plaintext.
8. Real-time note updates are broadcast over WebSocket to all subscribed sessions for that user.

---

## Technology Stack

### Backend

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Language    | Java 21                                       |
| Framework   | Spring Boot 3.2.3                             |
| Security    | Spring Security 6 + JJWT 0.12.5              |
| Persistence | Spring Data JPA + Hibernate 6                 |
| Database    | PostgreSQL 17 (native) / 16-alpine (Docker)   |
| Migrations  | Flyway                                        |
| Cache       | Spring Data Redis + Lettuce                   |
| Mapping     | MapStruct 1.5.5                               |
| Boilerplate | Lombok 1.18.36                                |
| Fake data   | DataFaker 2.1.0                               |
| Build       | Maven 3.9 (wrapper included)                  |

### Frontend

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Framework   | Next.js 14.2.3 (App Router)                   |
| Language    | TypeScript 5.4                                |
| Styling     | TailwindCSS 3 + ShadCN UI + Radix UI          |
| Editor      | TipTap 2.4 (ProseMirror)                      |
| State       | Zustand 4.5 (persisted to localStorage)       |
| Data fetch  | TanStack Query v5                             |
| Offline     | IndexedDB via `idb` 8                         |
| Real-time   | `@stomp/stompjs` 7 over SockJS                |
| Icons       | Lucide React                                  |
| Toasts      | Sonner                                        |

### Infrastructure

| Service    | Docker image             | Purpose                                    |
|------------|--------------------------|--------------------------------------------|
| PostgreSQL | `postgres:16-alpine`     | Primary data store, full-text search index |
| Redis      | `redis:7-alpine`         | Encryption key sessions, JWT blacklist     |

---

## Encryption Design

AetherNotes encrypts note content at the application layer before it reaches the database.

```
Registration
  password ──PBKDF2WithHmacSHA256──► 256-bit encryption key
             (100,000 iterations, random 32-byte salt)
             salt stored in users.encryption_salt (Base64)

Login
  password + salt ──► 256-bit encryption key
  key ──► Redis  (TTL: 24 h, never written to DB)

Write note
  plaintext ──AES-256-GCM──► 12-byte IV + ciphertext
  notes.iv               ← Base64(IV)
  notes.encrypted_content ← Base64(ciphertext + 16-byte auth tag)

Read note
  key (Redis) + IV + ciphertext ──AES-256-GCM──► plaintext
```

### Security Properties

| Property           | Implementation                                                |
|--------------------|---------------------------------------------------------------|
| Confidentiality    | AES-256-GCM (authenticated encryption)                       |
| Key derivation     | PBKDF2WithHmacSHA256 — 100,000 iterations                    |
| Per-note IVs       | 12-byte random IV generated per encryption call              |
| Tamper detection   | 128-bit GCM authentication tag                               |
| Key storage        | Redis only (in-memory, TTL-bound) — never persisted to DB    |
| Token revocation   | JWT blacklist stored in Redis on logout                       |
| Password storage   | BCrypt (cost factor 12)                                      |
| Transport          | Configure HTTPS/TLS in production                            |

> **Search caveat:** Only note **titles** are stored unencrypted and indexed for full-text search.
> Note **content** is always encrypted and cannot be searched server-side — by design.

---

## Setup — Docker (recommended for macOS/Linux)

The simplest path. Docker handles PostgreSQL and Redis; you only need Java 21 and Node.js.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Java 21 — [Eclipse Temurin](https://adoptium.net/) recommended
- Node.js 20+

### Steps

```bash
# 1. Clone
git clone https://github.com/bhattacharya-arka/aethernotes.git
cd aethernotes

# 2. Configure environment
cp .env.example .env
# .env.example defaults work out of the box with Docker

# 3. Start PostgreSQL + Redis
docker compose up -d

# 4. Start backend  (first run downloads Maven deps — takes ~2 min)
cd backend
./mvnw spring-boot:run

# 5. Start frontend  (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

---

## Setup — Windows (native, no Docker)

Docker Desktop for Windows has limitations (requires WSL2, Hyper-V). This guide runs everything natively.

### 1. Install prerequisites

| Tool         | Version  | Installer                                                                                  |
|--------------|----------|--------------------------------------------------------------------------------------------|
| Java 21      | 21.x     | [Eclipse Temurin 21](https://adoptium.net/temurin/releases/?version=21)                   |
| Node.js      | 20+      | [nodejs.org](https://nodejs.org/)                                                          |
| PostgreSQL   | 15–17    | [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)            |
| Redis        | any      | [tporadowski/redis](https://github.com/tporadowski/redis/releases) (Windows port)          |
| Git          | any      | [git-scm.com](https://git-scm.com/)                                                        |

### 2. Configure PostgreSQL

Open **pgAdmin** or a fresh PowerShell:

```powershell
psql -U postgres -c "CREATE DATABASE aethernotes;"
```

Note the password you chose during the PostgreSQL installer — you'll need it for `.env`.

### 3. Configure Redis

After installing the tporadowski Redis package, **optionally** enable a password:

1. Open `C:\Program Files\Redis\redis.windows-service.conf` in Notepad as Administrator.
2. Find (or add): `requirepass redis@123`
3. Restart the service:
   ```powershell
   net stop Redis
   net start Redis
   ```

Verify: `redis-cli -a "redis@123" ping` → should print `PONG`.

If you do not set a password, leave `REDIS_PASSWORD=` empty in `.env`.

### 4. Set JAVA_HOME (if needed)

If `java -version` works in a new PowerShell, skip this. Otherwise:

```powershell
# PowerShell (current session)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.x.x-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

Or set it permanently via **System Properties → Environment Variables**.

### 5. Clone and configure

```bash
git clone https://github.com/bhattacharya-arka/aethernotes.git
cd aethernotes
cp .env.example .env
```

Edit `.env` with your actual PostgreSQL and Redis passwords.

### 6. Start the backend

```bash
cd backend
./mvnw spring-boot:run
```

> **IntelliJ users:** In the Run Configuration, environment variables must be
> **semicolon-separated** in the "Environment variables" text field:
> `POSTGRES_HOST=localhost;POSTGRES_PORT=5432;POSTGRES_DB=aethernotes;...`
> Do **not** paste them newline-separated — Spring will treat the entire block as one value.

### 7. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

---

## Setup — macOS (native, no Docker)

Homebrew makes this straightforward. You can also use the Docker path above.

### 1. Install prerequisites

```bash
# Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Java 21
brew install --cask temurin21

# Node.js
brew install node

# PostgreSQL
brew install postgresql@17
brew services start postgresql@17

# Redis
brew install redis
brew services start redis
```

### 2. Configure PostgreSQL

```bash
# Create the database
createdb aethernotes

# (Optional) set a password for the postgres superuser
psql postgres -c "ALTER USER postgres PASSWORD 'postgres@123';"
```

### 3. Configure Redis (optional password)

Edit `/opt/homebrew/etc/redis.conf` (Apple Silicon) or `/usr/local/etc/redis.conf` (Intel):

```
requirepass redis@123
```

Then restart: `brew services restart redis`

Verify: `redis-cli -a "redis@123" ping` → `PONG`

### 4. Clone and configure

```bash
git clone https://github.com/bhattacharya-arka/aethernotes.git
cd aethernotes
cp .env.example .env
# Edit .env with your PostgreSQL / Redis passwords
```

### 5. Start backend and frontend

```bash
# Terminal 1 — backend
cd backend
./mvnw spring-boot:run

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

---

## Environment Variables

Copy `.env.example` to `.env` and adjust for your environment.

| Variable              | Example value                                | Description                                              |
|-----------------------|----------------------------------------------|----------------------------------------------------------|
| `POSTGRES_HOST`       | `localhost`                                  | PostgreSQL hostname                                      |
| `POSTGRES_PORT`       | `5432`                                       | PostgreSQL port                                          |
| `POSTGRES_DB`         | `aethernotes`                                | Database name (must exist before first run)              |
| `POSTGRES_USER`       | `postgres`                                   | Database user                                            |
| `POSTGRES_PASSWORD`   | `postgres@123`                               | Database password                                        |
| `REDIS_HOST`          | `localhost`                                  | Redis hostname                                           |
| `REDIS_PORT`          | `6379`                                       | Redis port                                               |
| `REDIS_PASSWORD`      | `redis@123`                                  | Redis `requirepass` value — leave empty if none set      |
| `JWT_SECRET`          | *(64-char hex)*                              | HMAC-SHA256 signing key — minimum 256 bits               |
| `JWT_EXPIRATION`      | `86400000`                                   | Token TTL in ms (86400000 = 24 h)                        |
| `SERVER_PORT`         | `8080`                                       | Backend HTTP port                                        |
| `APP_SEED_DATA`       | `true`                                       | Run seed loader on startup                               |
| `APP_SEED_USERS`      | `50`                                         | Number of random users to seed                           |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080`                      | Frontend → backend base URL                              |
| `NEXT_PUBLIC_WS_URL`  | `http://localhost:8080`                      | WebSocket endpoint base URL                              |

**Generate a strong JWT secret:**

```bash
# macOS / Linux / Git Bash (Windows)
openssl rand -hex 32
```

---

## Seed Data & Demo Account

### Demo account (always available)

When `APP_SEED_DATA=true`, the seed loader **always** ensures this account exists on startup — even if the database already has users:

| Field    | Value                    |
|----------|--------------------------|
| Email    | `demo@aethernotes.dev`   |
| Password | `Password123!`           |

Look for this in the startup log to confirm it was created:

```
========================================
  Demo account ready:
  Email   : demo@aethernotes.dev
  Password: Password123!
========================================
```

### Bulk seed (50 random users × 20 notes)

Runs **once** on first startup if the `users` table contains only the demo account. Generates realistic users via DataFaker; all seeded accounts use `Password123!`. All note content is encrypted with AES-256-GCM.

To look up a seeded user's email:

```sql
SELECT email FROM users WHERE email != 'demo@aethernotes.dev' LIMIT 10;
```

### Reset and re-seed

**Docker:**
```bash
docker compose down -v   # wipe volumes
docker compose up -d
cd backend && ./mvnw spring-boot:run
```

**Native (Windows/macOS):**
```bash
# Drop and recreate the database
psql -U postgres -c "DROP DATABASE aethernotes;"
psql -U postgres -c "CREATE DATABASE aethernotes;"
# Then restart the backend — Flyway re-runs migrations and seed re-runs
```

---

## API Reference

All endpoints except `/api/auth/**` and `/ws/**` require `Authorization: Bearer <token>`.

### Authentication

```
POST /api/auth/register   { username, email, password }  → AuthResponse
POST /api/auth/login      { email, password }            → AuthResponse
POST /api/auth/logout                                    → 200 OK
GET  /api/auth/me                                        → { email }
```

**AuthResponse:**
```json
{
  "accessToken": "eyJ...",
  "userId": "uuid",
  "username": "alice",
  "email": "alice@example.com",
  "expiresIn": 86400000
}
```

### Notes

```
GET    /api/notes?page=0&size=50   → PagedResponse<Note>
GET    /api/notes/{id}             → Note
POST   /api/notes                  → Note  (201 Created)
PUT    /api/notes/{id}             → Note
DELETE /api/notes/{id}             → 204 No Content
GET    /api/notes/search?q={query} → Note[]
GET    /api/notes/favorites        → Note[]
```

### Tags

```
GET /api/tags   → Tag[]
```

### WebSocket

Connect: `ws://localhost:8080/ws` (SockJS endpoint).

Subscribe: `/topic/notes/{userId}` — receives a `NoteResponse` JSON payload on every create/update.

---

## Project Structure

```
notes-app/
├── backend/                              # Spring Boot application
│   ├── src/main/java/com/aethernotes/
│   │   ├── AetherNotesApplication.java
│   │   ├── config/                       # SecurityConfig, RedisConfig, WebSocketConfig
│   │   ├── controller/                   # NoteController, AuthController, TagController
│   │   ├── service/                      # NoteService, AuthService, SearchService
│   │   ├── repository/                   # Spring Data JPA repos
│   │   ├── entity/                       # User, Note, Tag (JPA entities)
│   │   ├── dto/                          # Request / Response DTOs
│   │   ├── mapper/                       # MapStruct mappers
│   │   ├── security/                     # JwtAuthFilter, JwtTokenProvider, UserDetailsServiceImpl
│   │   ├── encryption/                   # AES-256-GCM + PBKDF2 key derivation
│   │   ├── cache/                        # CacheService (Redis operations)
│   │   ├── websocket/                    # STOMP WebSocket controller
│   │   ├── loader/                       # SeedDataLoader (demo + bulk seed)
│   │   └── exception/                    # GlobalExceptionHandler, ApiException
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/
│           ├── V1__init_schema.sql       # users, notes, tags tables + tsvector trigger
│           └── V2__add_tag_search_index.sql
│
├── frontend/                             # Next.js 14 application
│   ├── app/
│   │   ├── (auth)/                       # /login, /register pages
│   │   └── (dashboard)/                  # Protected workspace + layout
│   │       └── notes/[id]/               # Note editor route
│   ├── components/
│   │   ├── ui/                           # ShadCN primitives (Button, Input, …)
│   │   ├── auth/                         # LoginForm, RegisterForm
│   │   ├── layout/                       # Sidebar (nav, tag filter, user footer)
│   │   ├── notes/                        # NoteList, NoteCard, EmptyState
│   │   ├── editor/                       # NoteEditor, TipTapEditor, EditorToolbar
│   │   ├── search/                       # SearchModal
│   │   └── command/                      # CommandPalette
│   ├── hooks/
│   │   ├── useNotes.ts                   # TanStack Query CRUD hooks
│   │   ├── useWebSocket.ts               # STOMP connection + note subscription
│   │   ├── useOfflineSync.ts             # IndexedDB queue flush on reconnect
│   │   └── useDebounce.ts
│   ├── lib/
│   │   ├── api.ts                        # Axios instance + JWT interceptors
│   │   ├── db.ts                         # IndexedDB schema (idb)
│   │   └── utils.ts                      # cn, debounce, formatDate, stripMarkdown, …
│   ├── store/
│   │   └── useStore.ts                   # Zustand global store (user, token, UI state)
│   └── types/
│       └── index.ts                      # Shared TypeScript types (Note, User, …)
│
├── infra/
│   └── postgres/init.sql                 # Enables pgcrypto + uuid-ossp extensions
│
├── docker-compose.yml                    # PostgreSQL 16 + Redis 7
├── .env.example                          # Template — copy to .env
└── README.md
```

---

## Known Caveats

### Encryption key session (Redis required)

The encryption key is stored in Redis on login (TTL: 24 h). **If Redis is unavailable, login will fail with 500.** Notes cannot be created or read without an active Redis session. After 24 h, or after logout, the user must log in again.

### Search is title-only

Note content is encrypted in the database and cannot be full-text searched. Only note **titles** are indexed. This is intentional — searching ciphertext is not meaningful and decrypting all notes server-side for search would negate the encryption model.

### Seed skips if users already exist

The bulk seed (50 random users) runs only when the database contains ≤ 1 user (the demo account). If you registered accounts before the seed ran, the bulk seed will not run on later restarts. Use the demo account, or query the database for seeded emails, or reset the database to re-seed.

### IntelliJ environment variables (Windows)

In IntelliJ IDEA's Run Configuration, **environment variables must be semicolon-separated** in the text field:

```
POSTGRES_HOST=localhost;POSTGRES_PORT=5432;POSTGRES_DB=aethernotes;POSTGRES_USER=postgres;POSTGRES_PASSWORD=postgres@123;REDIS_HOST=localhost;REDIS_PORT=6379;REDIS_PASSWORD=redis@123;JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970;JWT_EXPIRATION=86400000;APP_SEED_DATA=true;APP_SEED_USERS=50
```

Pasting newline-separated key-value pairs (e.g. from `.env`) will cause Spring to read the entire block as a single hostname, producing `UnknownHostException`.

### Stale Next.js cache

After pulling code changes, if you see `ChunkLoadError` or hydration errors, delete the build cache:

```bash
cd frontend
rm -rf .next
npm run dev
```

### JWT expiry and Redis TTL

Both the JWT (`JWT_EXPIRATION=86400000` = 24 h) and the Redis encryption key (24 h TTL) expire after one day. Users will be redirected to login automatically when either expires. For development, increase `JWT_EXPIRATION` or restart the backend to extend the Redis key TTL on next login.

### Redis password mismatch

If Redis has `requirepass redis@123` in its config, `REDIS_PASSWORD` in `.env` **must** match exactly (including capitalisation). A mismatch causes Spring to fail silently on all Redis operations — login will succeed but note creation will fail with 500.

### macOS browser autocorrect

Safari and some Chrome versions on macOS silently capitalise or autocorrect email addresses typed into text inputs. The login form has `autoCorrect="off"` and `autoCapitalize="none"` to prevent this, but if you use a password manager that auto-fills and modifies the email, try typing it manually or using an incognito window.

---

## Development Tips

### Inspect Redis keys

```bash
# Docker
docker exec -it aethernotes-redis redis-cli keys "*"

# Native (with password)
redis-cli -a "redis@123" keys "*"
```

### View live SQL queries

In `backend/src/main/resources/application.yml`:

```yaml
spring:
  jpa:
    show-sql: true
logging:
  level:
    org.hibernate.SQL: DEBUG
```

### Run backend tests

```bash
cd backend
./mvnw test
```

Tests use an **H2 in-memory database** — no PostgreSQL required for the test suite.

### Lint & type-check frontend

```bash
cd frontend
npm run lint
npm run type-check
```

### Generate a JWT secret

```bash
openssl rand -hex 32
```

### Reset the database (native)

```bash
psql -U postgres -c "DROP DATABASE aethernotes; CREATE DATABASE aethernotes;"
# Restart backend — Flyway re-runs all migrations and seed re-runs
```

---

*Built with Java 21 · Spring Boot 3 · Next.js 14 · AES-256-GCM encryption*
