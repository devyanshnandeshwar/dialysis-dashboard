# Dialysis Dashboard

A full-stack clinical dashboard for managing dialysis sessions, patient history, and automated anomaly detection. Developed to streamline nurses workflows, monitor patient vitals in real-time batches, and safely flag critical ESRD threshold breaches.

## Setup
**Prerequisites**: Node 18+, MongoDB Atlas URI or local MongoDB

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd dialysis-dashboard
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Inside .env, fill in the MONGO_URI with your database connection string
   npm run seed
   npm run dev
   ```
   The backend will start at `http://localhost:5000`.

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   The frontend will start at `http://localhost:5173`.

## Architecture
```text
React (Vite) → Axios → Express API → Mongoose → MongoDB Atlas

                              ↓
                    anomalyDetector.ts (pure fn)
                    anomalyConfig.ts (thresholds)
```

**Request flow**: React component → `api/sessions.ts` (axios) → Express route → controller → Mongoose model → MongoDB

## Clinical Assumptions & Trade-offs
- **Excess weight gain**: 2.0kg threshold (warning), 3.0kg (critical, 1.5×)
  - *Rationale*: standard ESRD interdialytic weight gain guideline.
- **High post-dialysis systolic BP**: 160 mmHg → critical
  - *Rationale*: conservative threshold; adjustable in `anomalyConfig.ts`.
- **Short session**: > 30 min below target → warning
- **Long session**: > 60 min above target → warning
- All thresholds exist in `anomalyConfig.ts` — no magic numbers in logic code.
- **Queue**: FIFO by default; manual override supported for clinical flexibility.
- **MRN (Medical Record Number)**: Immutable after registration for record integrity.

## AI Tools Used
This project was built with the assistance of **Antigravity (Google DeepMind)**. The AI agent operated strictly as a pair-programmer to the user, independently navigating the codebase, executing command-line instructions, interpreting MongoDB aggregations, detecting anomalous code behavior, generating deterministic unit tests via Jest/Vitest, profiling component render loops (via `React.memo`), and producing responsive CSS grid layouts using Tailwind v4. The agent wrote the full stack dynamically in response to iterative natural language requirements.

## Known Limitations & What's Next
- **No authentication** — nurse login with role-based access needed in production.
- **Rule-based anomaly detection** — ML baselines per patient would be more accurate than generic global thresholds.
- **No real-time updates** — WebSockets could be implemented for live machine/session status across devices without page refreshing.
- **Machine pool management** — auto-assign patients from queue when machine frees up.
- **Timezone handling** needs unit-level config for multi-site deployment.
- **Audit log** with one-click export (PDF/CSV) for compliance.
