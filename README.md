# Gradely – AI Code Review (Next.js)

## Quickstart

- Install deps
  - pnpm i (or npm i / yarn)
- Add env
  - Create `.env.local` with:
    - HUGGINGFACE_API_KEY=your_hf_token
- Run
  - pnpm dev (or npm run dev / yarn dev)
  - Open http://localhost:3000

## Pages

- `/` – Editor with AI review and assistant
- `/login` – Mock login (teacher/student). No real auth yet.
- `/teacher` – Create assignments and view list
- `/assignments` – Student assignment list
- `/assignments/[id]` – Assignment detail with editor and submit

## APIs

- `POST /api/review` – Code review. Uses HF StarCoder. Requires `HUGGINGFACE_API_KEY`.
- `POST /api/assistant` – AI assistant. Uses HF StarCoder.
- `GET/POST /api/assignments` – List/create assignments (in-memory)
- `GET/POST /api/assignments/[id]/submissions` – List/create submissions (in-memory)

## Environment

- Required: `HUGGINGFACE_API_KEY` (HF Inference API). Get one at https://huggingface.co/settings/tokens

## Notes

- Execution/grading sandbox is not included yet (editor-only review).
- Next steps: real auth, persistent DB, queue-based grader.
