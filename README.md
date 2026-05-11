# Codeforces OJ API

An Online Judge backend inspired by Codeforces, built with Node.js, Express, and MongoDB. Users can create coding problems, submit solutions in C/C++/Python, and get real-time judging results.

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

- User registration and login with JWT
- Problem creation with sample and hidden test cases
- Code submission in C, C++, and Python
- Real-time code execution and judging
- Per-test-case results with execution time
- Submission status tracking (`pending`, `correct`, `incorrect`)
- Input validation on all endpoints
- Rate limiting on authentication routes
- Security headers with Helmet
- CORS enabled

## Getting Started

### Prerequisites

- Node.js >= 20
- MongoDB running locally or a MongoDB Atlas URI
- GCC, G++, and Python3 installed for the judge

### Install

```bash
git clone <your-repo-url>
cd codeforce___
cd server
npm install
```

### Environment Variables

Create a `.env` file inside `server/`:

```env
PORT=5000
MONGO_URL=""
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
NODE_ENV=development
```

### Run

```bash
# Development (auto-reload on Node >= 18)
npm run dev

# Production
npm start
```

## API Endpoints

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |

#### Register body

```json
{
  "name": "",
  "email": "",
  "password": ""
}
```

#### Login body

```json
{
  "email": "",
  "password": ""
}
```

### Problems

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/problem/create-problem` | Auth | Create a new problem |
| GET | `/api/problem/:id` | Auth | Get problem details (sample test cases only) |

#### Create problem body

```json
{
  "title": "Two Sum",
  "statement": "Given an array of integers and a target, return indices of two numbers that add up to target.",
  "difficulty": "easy",
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
3. Judge runs asynchronously:
   - Writes code to a temporary file
   - Compiles if C/C++
   - Runs against each test case with a 5-second timeout
   - Compares actual output with expected output (trimmed, normalized line endings)
4. Status updates to `correct` or `incorrect`
5. Results include per-test-case pass/fail, actual output, and execution time

## File Structure

```text
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

## Response Format

### Success

```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error

```json
{
  "message": "Error description"
}
```

### Validation Error

```json
{
  "message": "Validation failed",
  "errors": {
    "email": ["Invalid email format"],
    "password": ["Password must be at least 6 characters"]
  }
}
```

## Security

- JWT tokens expire in 1 hour
- Passwords hashed with bcrypt (salt rounds: 10)
- Rate limiting on login/register routes
- Helmet security headers
- CORS enabled
- Input validation on all endpoints
- Global error handler hides stack traces in production

## Future Improvements

- Replace file-based judging with Docker sandbox
- Add memory limit enforcement
- Support more languages (Java, JavaScript, Go)
- Add leaderboard and contest system
- Real-time submission updates via WebSocket
- Admin dashboard for problem moderation
- Code plagiarism detection

