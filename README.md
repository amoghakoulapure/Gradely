<<<<<<< HEAD
# Gradely – AI Code Review (Next.js)

## Quickstart

- Install deps
  - pnpm i (or npm i / yarn)
- Add env
  - Create `.env.local` with:
    - GORQ_API_KEY=your_gorq_token
    - (optional) GORQ_API_URL=https://api.gorq.ai/v1
- Run
  - pnpm dev (or npm run dev / yarn dev)
  - Open http://localhost:3000

## Pages

- `/` – Editor with AI review and assistant
- `/teacher` – Create assignments and view list
- `/assignments` – Student assignment list
- `/assignments/[id]` – Assignment detail with editor and submit

## APIs

-- `POST /api/review` – Code review. Uses configured model provider (Gorq by default). Requires `GORQ_API_KEY`.
-- `POST /api/assistant` – AI assistant. Uses configured model provider (Gorq by default).
- `GET/POST /api/assignments` – List/create assignments (in-memory)
- `GET/POST /api/assignments/[id]/submissions` – List/create submissions (in-memory)

## Environment

- Required: `GORQ_API_KEY`. Set this to your Gorq API key.
- Optional: `GORQ_API_URL` if you're using a custom Gorq endpoint. Default: `https://api.gorq.ai/v1`

## Notes

- Execution/grading sandbox is not included yet (editor-only review).
- Next steps: real auth, persistent DB, queue-based grader.
=======
# Gradely
GRADELY is a browser-based AI-powered code review platform for students and instructors. Its primary goal is to streamline learning through instant code analysis, actionable feedback, and interactive assessment.
>>>>>>> f3c99c8aa92911f10a37886aebf9597cce2e7a3d
