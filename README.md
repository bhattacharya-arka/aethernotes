# AetherNotes

> A production-grade **encrypted note-taking platform** inspired by Notion, Linear, and Obsidian.
> Built with Java 21 + Spring Boot 3 on the backend and Next.js 14 on the frontend.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Encryption Design](#encryption-design)
5. [Feature Overview](#feature-overview)
6. [API Reference](#api-reference)
7. [Seed Data Loader](#seed-data-loader)
8. [Project Structure](#project-structure)
9. [Environment Variables](#environment-variables)
10. [Development Tips](#development-tips)

---

## Quick Start

> **Prerequisites:** Docker, Java 21, Node.js 20+

```bash
# 1. Clone the repository
git clone https://github.com/yourname/notes-app.git
cd notes-app

# 2. Configure environment
cp .env.example .env

# 3. Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# 4. Start backend
cd backend
./mvnw spring-boot:run

# 5. Start frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

> With `APP_SEED_DATA=true` the backend will automatically seed **50 demo users**, each with **20 notes**.
> Login password for any seeded account is: `Password123!`

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│  Next.js 14  ·  TipTap  ·  Zustand  ·  IndexedDB   │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS / WebSocket (STOMP)
┌────────────────────▼────────────────────────────────┐
│                Spring Boot 3                        │
│   REST API  ·  WebSocket  ·  Spring Security / JWT  │
└──────────┬────────────────────────┬─────────────────┘
           │                        │
    ┌──────▼──────┐          ┌──────▼──────┐
    │  PostgreSQL  │          │    Redis    │
    │  (Flyway)   │          │  (Sessions) │
    └─────────────┘          └─────────────┘
```

### Request Lifecycle

1. Client sends `POST /api/auth/login` with credentials.
2. Backend verifies password, **derives AES-256 key** via PBKDF2, stores key in Redis.
3. Backend returns a signed JWT containing `userId`.
4. For every subsequent request, the `JwtAuthenticationFilter` validates the JWT and the encryption key is retrieved from Redis.
5. Note content is **decrypted on-the-fly** before the response is sent; ciphertext never leaves the server in plaintext.
6. Real-time updates are pushed over WebSocket to all subscribed clients.

---

## Technology Stack

### Backend

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Language     | Java 21 (virtual threads ready)     |
| Framework    | Spring Boot 3.2                     |
| Security     | Spring Security + JWT (jjwt 0.12)   |
| Persistence  | Spring Data JPA + Hibernate 6       |
| Database     | PostgreSQL 16                       |
| Migrations   | Flyway                              |
| Cache        | Spring Data Redis + Lettuce         |
| Mapping      | MapStruct                           |
| Boilerplate  | Lombok                              |
| Fake data    | Java Faker (net.datafaker)          |
| Build        | Maven 3.9                           |

### Frontend

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | Next.js 14 (App Router)             |
| Language     | TypeScript 5                        |
| Styling      | TailwindCSS 3 + ShadCN UI           |
| Editor       | TipTap 2 (ProseMirror-based)        |
| State        | Zustand 4                           |
| Data fetch   | TanStack Query v5                   |
| Offline      | IndexedDB (idb)                     |
| Real-time    | STOMP over SockJS                   |
| Icons        | Lucide React                        |
| Toasts       | Sonner                              |

### Infrastructure

| Service    | Image               | Purpose                          |
|------------|---------------------|----------------------------------|
| PostgreSQL | `postgres:16-alpine`| Primary data store               |
| Redis      | `redis:7-alpine`    | Session keys, cache, token blacklist |

---

## Encryption Design

AetherNotes uses **end-to-end encryption at the application layer**:

```
Registration
  password ──PBKDF2WithHmacSHA256──► encryption_key (256-bit)
             (100,000 iterations)
             salt (random, 32-byte, stored in users table)

Login
  password + salt ──► encryption_key
  encryption_key ──► Redis (TTL: 24h)

Write note
  plaintext ──AES-256-GCM──► IV + ciphertext
  IV stored in notes.iv
  Ciphertext stored in notes.encrypted_content

Read note
  encryption_key (from Redis) + IV + ciphertext ──► plaintext
```

### Security Properties

| Property              | Implementation                                    |
|-----------------------|---------------------------------------------------|
| Confidentiality       | AES-256-GCM (authenticated encryption)            |
| Key derivation        | PBKDF2WithHmacSHA256, 100k iterations             |
| Per-note IVs          | 12-byte random IV per encryption operation        |
| Authenticity          | 128-bit GCM authentication tag (tamper detection) |
| Key storage           | Redis (in-memory only, TTL-bound) — never in DB   |
| Token revocation      | JWT blacklist in Redis on logout                  |
| Password storage      | BCrypt (cost 12)                                  |
| Transport             | HTTPS (configure in production)                   |

> **Caveat:** Only note **titles** are indexed for full-text search (they are stored unencrypted). Note **content** is always encrypted and cannot be searched server-side — this is an intentional security trade-off.

---

## Feature Overview

### Authentication

- Register with username, email, and password
- Login with JWT response
- Logout invalidates the JWT in Redis and removes the encryption key
- Password strength requirements enforced on both FE and BE

### Notes

- Create, read, update, delete notes
- Rich text editing with **TipTap** (bold, italic, headings, lists, code blocks, task lists, blockquotes)
- **Auto-save** with 1.5s debounce — changes are saved transparently
- **Favorites** toggle (starred notes)
- **Tagging** system — comma-separated tags on each note
- Sort by last edited

### Search

- Full-text search using PostgreSQL `tsvector` (title-based)
- Keyboard shortcut: `Ctrl+/`
- Highlighted search term matches in results

### Command Palette

- Open with `Ctrl+K`
- Commands: New note, Search, Favorites, Toggle theme, Sign out
- Recent notes listed for quick access

### Real-time Sync

- WebSocket via STOMP over SockJS
- All connected clients receive live note updates
- Editing indicator broadcast to other open sessions

### Offline Support

- Notes cached in **IndexedDB** via `idb`
- Mutations (create/update/delete) queued when offline
- Automatic background sync when connection is restored
- Optimistic UI updates via TanStack Query

---

## API Reference

### Authentication

```
POST /api/auth/register   { username, email, password }  → AuthResponse
POST /api/auth/login      { email, password }            → AuthResponse
POST /api/auth/logout                                    → 200 OK
GET  /api/auth/me                                        → { email }
```

### Notes

```
GET    /api/notes?page=0&size=50    → PagedResponse<Note>
GET    /api/notes/{id}              → Note
POST   /api/notes                   → Note (201)
PUT    /api/notes/{id}              → Note
DELETE /api/notes/{id}              → 204 No Content
GET    /api/notes/search?q={query}  → Note[]
GET    /api/notes/favorites         → Note[]
```

### Tags

```
GET /api/tags   → Tag[]
```

### WebSocket

Connect to `ws://localhost:8080/ws` (SockJS).

Subscribe to `/topic/notes/{userId}` for live note updates.

---

## Seed Data Loader

Controlled by the `APP_SEED_DATA` environment variable.

```yaml
app:
  seed-data: true     # enable seeding
  seed-users: 50      # number of demo users to create
```

**Behaviour:**
- Runs once on application startup via `ApplicationRunner`
- Skips if the `users` table already contains rows
- Creates configurable number of users via Java Faker (realistic names/emails)
- Each user gets **20 notes** with random markdown content and tags
- All note content is encrypted with AES-256-GCM using `Password123!`

**Seeded tags:** `work`, `personal`, `ideas`, `todo`, `research`, `journal`, `meeting-notes`, `project`, `reference`, `archive`, `draft`, `urgent`, `review`, `planning`, `learning`

To reset and re-seed:
```bash
docker compose down -v   # wipe volumes
docker compose up -d     # fresh DB
./mvnw spring-boot:run   # seeds on startup
```

---

## Project Structure

```
notes-app/
├── backend/                          # Spring Boot application
│   ├── src/main/java/com/aethernotes/
│   │   ├── AetherNotesApplication.java
│   │   ├── config/                   # Security, Redis, WebSocket
│   │   ├── controller/               # REST endpoints
│   │   ├── service/                  # Business logic
│   │   ├── repository/               # Spring Data JPA repos
│   │   ├── entity/                   # JPA entities (User, Note, Tag)
│   │   ├── dto/                      # Request / Response DTOs
│   │   ├── mapper/                   # MapStruct mappers
│   │   ├── security/                 # JWT filter, entry point
│   │   ├── encryption/               # AES-256-GCM service
│   │   ├── cache/                    # Redis operations
│   │   ├── websocket/                # STOMP controller
│   │   ├── loader/                   # Seed data loader
│   │   └── exception/                # Global error handler
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/             # Flyway SQL migrations
│
├── frontend/                         # Next.js 14 application
│   ├── app/
│   │   ├── (auth)/                   # Login, Register pages
│   │   └── (dashboard)/              # Protected notes workspace
│   ├── components/
│   │   ├── ui/                       # ShadCN primitives
│   │   ├── layout/                   # Sidebar
│   │   ├── notes/                    # NoteList, NoteCard, EmptyState
│   │   ├── editor/                   # TipTap editor + toolbar
│   │   ├── search/                   # Search modal
│   │   └── command/                  # Command palette
│   ├── hooks/                        # useNotes, useWebSocket, useOfflineSync
│   ├── lib/                          # api.ts, db.ts (IndexedDB), utils.ts
│   ├── store/                        # Zustand global store
│   └── types/                        # Shared TypeScript types
│
├── infra/
│   └── postgres/init.sql             # DB extensions bootstrap
│
├── docker-compose.yml                # PostgreSQL + Redis services
├── .env.example                      # Template — copy to .env
└── README.md
```

---

## Environment Variables

| Variable            | Default                   | Description                              |
|---------------------|---------------------------|------------------------------------------|
| `POSTGRES_HOST`     | `localhost`               | PostgreSQL host                          |
| `POSTGRES_PORT`     | `5432`                    | PostgreSQL port                          |
| `POSTGRES_DB`       | `aethernotes`             | Database name                            |
| `POSTGRES_USER`     | `postgres`                | Database user                            |
| `POSTGRES_PASSWORD` | `password`                | Database password                        |
| `REDIS_HOST`        | `localhost`               | Redis host                               |
| `REDIS_PORT`        | `6379`                    | Redis port                               |
| `JWT_SECRET`        | *(hex string)*            | HMAC-SHA256 signing key (min 256-bit)    |
| `JWT_EXPIRATION`    | `86400000`                | Token TTL in milliseconds (24h default)  |
| `APP_SEED_DATA`     | `false`                   | Enable/disable seed data loader          |
| `APP_SEED_USERS`    | `50`                      | Number of users to seed                  |
| `SERVER_PORT`       | `8080`                    | Backend HTTP port                        |
| `NEXT_PUBLIC_API_URL`| `http://localhost:8080`  | Frontend → backend URL                   |
| `NEXT_PUBLIC_WS_URL` | `http://localhost:8080`  | WebSocket endpoint base URL              |

---

## Development Tips

### Generate a JWT secret

```bash
openssl rand -hex 32
```

### Run only backend tests

```bash
cd backend
./mvnw test
```

### Inspect Redis keys

```bash
docker exec -it aethernotes-redis redis-cli keys "*"
```

### View live SQL queries

Set in `application.yml`:
```yaml
spring.jpa.show-sql: true
logging.level.org.hibernate.SQL: DEBUG
```

### Reset the database

```bash
docker compose down -v
docker compose up -d
```

### Lint & type-check frontend

```bash
cd frontend
npm run lint
npm run type-check
```

---

*Built with Java 21, Spring Boot 3, Next.js 14, and AES-256-GCM encryption.*
