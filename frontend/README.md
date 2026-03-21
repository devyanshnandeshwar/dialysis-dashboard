# Dialysis Dashboard Frontend

React + TypeScript + Vite client for the Dialysis Dashboard.

This app provides:
- Today's session queue with status-aware actions (start/complete)
- Patient directory with quick scheduling
- Session anomaly visualization and nurse notes workflow
- Machine-aware scheduling support

## Tech Stack
- React 19
- TypeScript
- Vite
- Axios
- Tailwind + shadcn-style UI primitives
- Vitest + Testing Library

## Prerequisites
- Node.js 18+
- Backend API running (default: `http://localhost:5000/api`)

## Local Setup
1. Install dependencies:
```bash
npm install
```

2. Configure environment:
Create `.env` in this `frontend` folder.

```env
VITE_API_URL=http://localhost:5000/api
```

If `VITE_API_URL` is not provided, the app defaults to `http://localhost:5000/api`.

3. Start development server:
```bash
npm run dev
```

App URL: `http://localhost:5173`

## Available Scripts
- `npm run dev` - Start Vite dev server
- `npm run build` - Type-check and build production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest test suite

## Project Structure
```text
src/
  api/           # Axios client + API modules
  components/    # UI, patient, session, layout components
  context/       # Theme and shared context providers
  pages/         # Route-level pages
  types/         # Shared frontend TypeScript types
```

## Notes
- Session and patient pages depend on backend response contracts (especially `/sessions/today`).
- Machine availability is derived by backend from active sessions (`not_started`/`in_progress`).
- For full-stack setup instructions, see the repository root README.
