# AetherNotes — Project Context for Claude Code

## What this project is
Production-grade encrypted note-taking platform (Notion/Linear/Obsidian aesthetic).
Monorepo at `C:\personal_Projects\notes-app\`.

## Architecture
```
notes-app/
├── backend/      Spring Boot 3, Java 21, Maven
├── frontend/     Next.js 14, TypeScript, TailwindCSS
├── infra/        PostgreSQL init SQL
├── docker-compose.yml   (PostgreSQL + Redis — DOCKER IS PROHIBITED on this machine)
├── .env          (created from .env.example — has real passwords)
└── CLAUDE.md
```

## Tech Stack
**Backend:** Java 21 (Temurin 21.0.10 @ `C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot`), Spring Boot 3.2, Spring Security + JWT, Spring Data JPA, PostgreSQL, Redis, Flyway, MapStruct, Lombok, Maven
**Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, ShadCN UI, TipTap editor, Zustand, TanStack Query v5, IndexedDB (idb), STOMP WebSocket, Sonner
**DB/Cache:** PostgreSQL 17 (native, no Docker), Redis (native Windows install)

## This Device — Important
- **Docker is PROHIBITED** — PostgreSQL and Redis must run natively
- **Java 21** installed at `C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot`
  - Already on machine PATH; requires a **fresh terminal** to pick up (old terminals won't see it)
  - JAVA_HOME may need to be set manually if Maven can't find it
- **Node.js** v24.11.0, npm v11.11.0 ✅
- **PostgreSQL 17** — installed natively via winget
- **Redis** — Windows port (tporadowski) — install status unclear at last check

## Environment (.env)
```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=aethernotes
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres@123

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis@123

JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
JWT_EXPIRATION=86400000
SERVER_PORT=8080

APP_SEED_DATA=true
APP_SEED_USERS=50

NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8080
```

## How to Run (no Docker)

### PostgreSQL (native)
```powershell
# Should auto-start as a Windows service after install
# Verify:
psql -U postgres -c "\l"
# Create DB if missing:
psql -U postgres -c "CREATE DATABASE aethernotes;"
```

### Redis (native Windows)
```powershell
# Start service:
net start Redis
# Verify:
redis-cli ping   # → PONG
# If password is set in redis.conf (requirepass redis@123):
redis-cli -a "redis@123" ping
```
> Redis config file: `C:\Program Files\Redis\redis.windows-service.conf`
> Add `requirepass redis@123` to that file to enable password auth, then restart service.

### Backend
```bash
cd C:/personal_Projects/notes-app/backend
# Option A — if java is on PATH in this terminal:
./mvnw spring-boot:run
# Option B — if PATH not updated yet, set JAVA_HOME explicitly:
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-21.0.10.7-hotspot" ./mvnw spring-boot:run
```
Runs on **http://localhost:8080**. First run downloads Maven + deps (~3 min).
`APP_SEED_DATA=true` auto-seeds 50 users × 20 notes on first boot. Seed password: `Password123!`

### Frontend
```bash
cd C:/personal_Projects/notes-app/frontend
npm install   # first time only
npm run dev
```
Runs on **http://localhost:3000**

## Key File Paths
| File | Purpose |
|------|---------|
| `backend/src/main/resources/application.yml` | Spring Boot config (reads from env vars) |
| `backend/src/main/resources/db/migration/` | Flyway SQL migrations (V1, V2) |
| `backend/src/main/java/com/aethernotes/encryption/EncryptionService.java` | AES-256-GCM + PBKDF2 |
| `backend/src/main/java/com/aethernotes/loader/SeedDataLoader.java` | Fake data generator |
| `frontend/lib/api.ts` | Axios client with JWT interceptors |
| `frontend/store/useStore.ts` | Zustand global state |
| `frontend/hooks/useNotes.ts` | TanStack Query CRUD hooks |
| `frontend/components/editor/NoteEditor.tsx` | Main editor (title + TipTap + auto-save + tags) |
| `frontend/components/layout/Sidebar.tsx` | Sidebar with note list, nav, user footer |

## API Endpoints
```
POST /api/auth/register   POST /api/auth/login   POST /api/auth/logout
GET  /api/notes           POST /api/notes        PUT  /api/notes/{id}   DELETE /api/notes/{id}
GET  /api/notes/search?q= GET  /api/notes/favorites
GET  /api/tags
WS   /ws  (STOMP, subscribe: /topic/notes/{userId})
```

## Encryption Design
- Registration: `PBKDF2WithHmacSHA256(password, randomSalt, 100k iterations)` → 256-bit AES key
- Key stored in **Redis only** (TTL 24h), never in DB
- Notes encrypted with **AES-256-GCM** (random 12-byte IV per note)
- DB stores: `iv` (Base64) + `encrypted_content` (Base64) columns
- Only note **titles** are full-text indexed (content stays encrypted, not searchable)

## Current Status
- [x] Backend fully generated (47 files)
- [x] Frontend fully generated (46 files), empty dir bug fixed
- [x] Docker Compose exists but cannot be used — native PostgreSQL + Redis required
- [x] .env created with real passwords
- [ ] Redis Windows installation + password config — in progress
- [ ] First full end-to-end run not yet completed

## Ports
| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend | 8080 |
| PostgreSQL | 5432 |
| Redis | 6379 |
