# AI Feature Flag Manager

A small, end-to-end feature flag manager for an AI product team. The React interface talks to a Kotlin/Ktor REST API, and the API persists data in H2 by default or PostgreSQL when configured.

## Stack

- Frontend: React 18, TypeScript, Vite, custom CSS
- Backend: Kotlin/JVM 2.2, Ktor 3.5, Netty
- Persistence: JDBC + HikariCP, H2 for local development, PostgreSQL for a shared/production database
- Tests: Vitest for frontend validation, Kotlin/JUnit + Ktor test host for the API and H2 persistence path
- Build tooling: npm and the checked-in Gradle 8.14.3 wrapper

## Requirements

- Node.js 18+
- JDK 17+
- No global Gradle installation is required; `backend/gradlew` is included.
- PostgreSQL is optional. The default H2 file database requires no setup.

## Run locally

Use two terminals from the project root.

Terminal 1: start the API.

```bash
cd backend
./gradlew run
```

On Windows PowerShell:

```powershell
cd backend
.\gradlew.bat run
```

The API starts on `http://localhost:8080`. The default H2 database is stored under `backend/data/feature-flags.mv.db` and is ignored by Git.

Terminal 2: start the frontend.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/health` to the Ktor server, so no frontend CORS configuration is needed during normal local development.

## Verify the project

Frontend:

```bash
npm run build
npm test
```

Backend:

```bash
cd backend
./gradlew test
```

On Windows, use `.\gradlew.bat` instead of `./gradlew`.

Health check:

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{"status":"ok"}
```

## API contract

All feature endpoints are versioned under `/api/v1`.

### List flags

```http
GET /api/v1/flags
```

### Create a flag

```http
POST /api/v1/flags
Content-Type: application/json

{
  "key": "ai_smart_replies",
  "name": "AI Smart Replies",
  "description": "Suggests concise responses based on conversation context.",
  "type": "release",
  "enabled": false
}
```

Returns `201 Created` with the created flag. `key` must use lowercase letters, numbers, and underscores and must be unique.

### Enable or disable a flag

```http
PATCH /api/v1/flags/{id}
Content-Type: application/json

{"enabled":true}
```

Returns `200 OK` with the updated flag.

### Error shape

Errors use one predictable structure and include a request ID for diagnostics:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "requestId": "web-mb2k1-abc12",
    "details": { "key": "That key is already in use." }
  }
}
```

Important status codes are `400` for invalid input, `404` for an unknown flag, `409` for a duplicate key, and `500` for an unexpected server failure. The API echoes or generates `X-Request-ID` on every request.

## Database configuration

With no environment variables, the API uses:

```text
jdbc:h2:file:./data/feature-flags;MODE=PostgreSQL;DB_CLOSE_DELAY=-1
user: sa
password: empty
```

For PostgreSQL, set these before starting the backend:

```bash
export DB_URL='jdbc:postgresql://localhost:5432/feature_flags'
export DB_USER='feature_flags'
export DB_PASSWORD='change-me-locally'
./gradlew run
```

PowerShell:

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/feature_flags"
$env:DB_USER = "feature_flags"
$env:DB_PASSWORD = "change-me-locally"
.\gradlew.bat run
```

The application creates the `feature_flags` table on startup and seeds the initial demo flags only when the table is empty. Never commit real credentials; use environment variables or a local secret manager.

## Architecture

```text
React UI
  -> src/services/flagService.ts
  -> HTTP /api/v1/flags
  -> Ktor routing + JSON + error handling
  -> FeatureFlagRepository interface
  -> JdbcFeatureFlagRepository
  -> HikariCP
  -> H2 or PostgreSQL
```

- `src/App.tsx` owns the UI state and user flows.
- `src/services/flagService.ts` is the frontend API client and request diagnostics boundary.
- `backend/.../domain` contains request/response models and validation rules.
- `backend/.../persistence` contains database configuration and the repository abstraction.
- `backend/.../Application.kt` wires Ktor plugins, request IDs, CORS, routes, and error mapping.
- The repository abstraction keeps HTTP concerns separate from SQL and makes future repository implementations straightforward.
- Server validation is authoritative; client validation remains for fast user feedback.

## Assumptions and tradeoffs

This remains a focused first iteration. It supports one workspace and a single logical environment, and uses `You` as the mutating actor because authentication is intentionally out of scope. There are no targeting rules, percentage rollout, audit history, permissions, or scheduled changes yet.

JDBC was chosen over an ORM to keep the persistence layer explicit and easy to replace, while HikariCP provides connection pooling. H2 keeps local setup frictionless; PostgreSQL is supported through the same repository and schema contract. Schema creation is intentionally lightweight for this prototype; a production deployment should use versioned migrations such as Flyway or Liquibase.

## If there were another day

I would add authentication and workspace/environment scoping, role-based permissions, an immutable audit log, targeting and percentage rollout rules, versioned database migrations, OpenAPI generation, contract tests between frontend and backend, structured JSON logging, and CI that runs both Gradle and npm verification.
