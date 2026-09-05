# Codeforces Online Judge (OJ)

> A full-featured competitive programming online judge and REST API built with Node.js, Express, and MongoDB — featuring secure multi-language code execution (C, C++, Python), time/memory limits, process tree isolation, role-based access control, and real-time verdict evaluation.

## Tech Stack

- Node.js + Express 5
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs for password hashing
- Zod for input validation
- child_process for code execution
- Helmet for security headers
- CORS support

## Features

- User registration and login with JWT and Role-Based Access Control (`user`, `moderator`, `admin`)
- Problem creation restricted to admins and moderators
- Code submission in C, C++, and Python
- Real-time code execution and judging
- Per-test-case results with execution time
- Submission status tracking (`pending`, `correct`, `incorrect`)
- Input validation on all endpoints
- Rate limiting on authentication routes, submissions, and judge endpoints
- Security headers with Helmet
- CORS enabled

## Getting Started

### Prerequisites

- Node.js >= 20
- MongoDB running locally or a MongoDB Atlas URI
- Docker Engine or Docker Desktop for containerized sandboxing

### Quick Install (Both Backend & Frontend)

```bash
git clone <your-repo-url>
cd codeforce__

# 1. Build the Docker judge sandbox runner image
docker build -t judge-runner -f docker/judge-runner.Dockerfile .

# 2. Install dependencies for both server and client
npm run install:all
```

### Environment Variables

#### 1. Server Configuration (`server/.env`)
Create `server/.env`:
```env
PORT=5000
MONGO_URL=mongodb://localhost:27017/codeforces_mvp
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
NODE_ENV=development
JUDGE_IMAGE=judge-runner
```

#### 2. Client Configuration (`client/.env`)
Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### Running Locally

```bash
# Terminal 1 - Backend Server (Port 5000)
npm run server:dev

# Terminal 2 - Frontend Client (Port 5173 with /api proxy)
npm run client:dev
```
Or run individually inside each directory (`cd server && npm run dev` / `cd client && npm run dev`).

## API Endpoints

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |

#### Register body

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123"
}
```

#### Login body

```json
{
  "email": "jane@example.com",
  "password": "password123"
}
```

### Users

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| PATCH | `/api/users/:id/role` | Auth (Admin only) | Update user role (`user`, `moderator`, `admin`) |

#### Update user role body

```json
{
  "role": "moderator"
}
```

#### Update user role response

```json
{
  "message": "User role updated successfully",
  "user": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "moderator"
  }
}
```

### Problems

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/problem/create-problem` | Auth (Admin / Moderator) | Create a new problem |
| GET | `/api/problem` or `/api/problem/list` | Auth | List paginated problems (public-safe fields: id, title, difficulty, tags, limits) |
| GET | `/api/problem/:id` | Auth | Get problem details (sample test cases only) |

#### Query parameters for `GET /api/problem`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | Integer | `1` | Page number |
| `limit` | Integer | `20` | Number of items per page (max 100) |
| `difficulty` | String | - | Filter by difficulty (`easy`, `medium`, `hard`) |
| `search` or `q` | String | - | Case-insensitive title keyword search |
| `tags` or `tag` | String | - | Filter by tag(s), comma-separated (e.g. `array,math`) |
| `sortBy` | String | `createdAt` | Sort field (`createdAt`, `title`, `difficulty`, `timeLimit`, `memoryLimit`) |
| `sortOrder` | String | `desc` | Sort order (`asc` or `desc`) |

#### Create problem body

```json
{
  "title": "Two Sum",
  "statement": "Given an array of integers and a target, return indices of two numbers that add up to target.",
  "difficulty": "easy",
  "tags": ["array", "hash-table"],
  "timeLimit": 2000,
  "memoryLimit": 256,
  "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9",
  "editorial": "Use a hash map to look up the complement in O(1) time.",
  "testCases": [
    { "input": "2 7 11 15\n9\n", "output": "0 1\n", "isSample": true },
    { "input": "3 2 4\n6\n", "output": "1 2\n", "isSample": false }
  ]
}
```

### Submissions

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/submission/submit/:problemId` | Auth | Submit code for a problem |
| GET | `/api/submission/:id` | Auth | Get submission status and results |

#### Submit code body

```json
{
  "language": "python",
  "sourceCode": "n, target = map(int, input().split())\nnums = list(map(int, input().split()))\nfor i in range(n):\n    for j in range(i+1, n):\n        if nums[i] + nums[j] == target:\n            print(i, j)"
}
```

### Judge (Manual Trigger)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/judge/judge/:submissionId` | Auth | Manually re-run judge on a submission |

> The judge runs automatically when a submission is created. The manual endpoint is for re-judging.

## How Judging Works

1. User submits code via `POST /api/submission/submit/:problemId`
2. Submission is saved with status `pending`
3. Judge spawns an isolated ephemeral Docker container (`judge-runner`) via `dockerode`:
   - **Zero Network Access**: `--network none` blocks all incoming/outgoing connections.
   - **Read-Only Root Filesystem**: `--read-only` prevents modifying container system binaries.
   - **Non-Root Execution**: Runs under non-privileged `sandboxuser` (UID 1001).
   - **Resource Sandboxing**: Strict memory limits (256MB RAM with zero swap), 0.5 CPU cap, and 64 PID limit (fork bomb protection).
   - **Isolated Storage**: Temporary 10MB tmpfs mounted at `/sandbox` for compilation and runtime artifacts.
   - **Dual-Timeout Watchdog**: Enforces per-problem execution timeouts with a force-kill container fallback.
   - **Output Limiting**: Captures up to 1MB stdout before aborting with `Output Limit Exceeded`.
4. Status updates to `correct` or `incorrect` with specific verdicts:
   - `Accepted (AC)`
   - `Wrong Answer (WA)`
   - `Time Limit Exceeded (TLE)`
   - `Memory Limit Exceeded (MLE)`
   - `Output Limit Exceeded (OLE)`
   - `Compilation Error (CE)`
   - `Runtime Error (RE)`
   - `Sandbox Error` (isolated infrastructure/daemon errors)

## File Structure

```text
docker/
└── judge-runner.Dockerfile
server/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── judge.controller.js
│   │   ├── problem.controller.js
│   │   └── submission.controller.js
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   ├── rateLimiter.js
│   │   ├── roleMiddleware.js
│   │   ├── validate.js
│   │   └── validators.js
│   ├── models/
│   │   ├── User.js
│   │   ├── problem.js
│   │   └── submission.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── judge.routes.js
│   │   ├── problem.routes.js
│   │   └── submission.routes.js
│   ├── services/
│   │   └── judge.service.js
│   └── app.js
├── index.js
├── package.json
└── .env.example
```

## Security & Operational Guidance

- **Docker Sandbox Hardening**:
  - The host server running this service should **not** expose the Docker daemon over an unauthenticated TCP socket or run privileged containers.
  - The `judge-runner` Docker image (`docker/judge-runner.Dockerfile`) should be rebuilt and scanned periodically for base-image security patches and CVEs.
- **Authentication & RBAC**:
  - JWT tokens expire in 1 hour.
  - Passwords hashed with bcrypt (salt rounds: 10).
  - Role-Based Access Control (RBAC) on problem creation and moderation.
- **API Defense & Guardrails**:
  - Rate limiting on auth routes (5 req/15min), submissions (10 req/min per user), and judge triggers (10 req/min per user).
  - Helmet HTTP security headers and CORS protection.
  - Zod input validation on all request bodies.

## Future Improvements

- Support more programming languages (Java, JavaScript, Go, Rust)
- Add leaderboard and contest system
- Real-time submission updates via WebSocket
- Admin dashboard for problem moderation
- Code plagiarism detection


