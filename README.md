# Dialysis Dashboard
Clinical workflow app for dialysis session intake, tracking, and anomaly highlighting for nurse operations.

## Quick Start (under 5 minutes)
- Prerequisites: Node.js 18+, npm, MongoDB Atlas connection string.
- Create `backend/.env` with `MONGO_URI=<your_connection_string>`.

```bash
git clone <repository-url>
cd dialysis-dashboard

# install dependencies
cd backend && npm install
cd ../frontend && npm install

# seed data
cd ../backend && npm run seed

# run API (Terminal 1)
npm run dev

# run UI (Terminal 2)
cd ../frontend && npm run dev
```

## Architecture
Frontend pages call Axios API modules, Express routes validate and delegate to controllers, controllers execute session rules and anomaly detection, and Mongoose persists data in MongoDB; this keeps UI concerns, request handling, business rules, and storage concerns separated.

```text
React (Vite) -> Axios API client -> Express routes -> Controllers
                                            |
                                            v
                                 anomalyDetector + config
                                            |
                                            v
                                  Mongoose models -> MongoDB
```

Key decisions:
- Express over FastAPI: keeps one language (TypeScript) across frontend and backend, reducing context switching and type translation.
- MongoDB Atlas: flexible document model fits evolving session/vitals payloads and supports quick iteration for assignment scope.
- Server-side anomaly detection: guarantees a single source of truth and consistent anomaly flags across all clients.

## Clinical Assumptions & Trade-offs
### Weight Gain
| Metric | Threshold | Clinical rationale |
|---|---|---|
| Excess interdialytic gain | >= 2.0 kg | Early warning threshold for fluid overload risk between sessions |
| Critical interdialytic gain | >= 3.0 kg | Higher-risk threshold indicating potential urgent intervention need |

### Blood Pressure
| Metric | Threshold | Clinical rationale |
|---|---|---|
| High post-dialysis systolic BP | >= 160 mmHg | Conservative post-treatment flag for persistent hypertension risk |

### Session Duration
| Metric | Threshold | Clinical rationale |
|---|---|---|
| Short session | > 30 min below target | May indicate incomplete dialysis delivery |
| Long session | > 60 min above target | May indicate treatment complexity or workflow delays needing review |

- MRN is immutable after creation to preserve patient identity integrity across historical records.
- Machine selection is required before session creation to prevent unassigned treatment records.
- FIFO queue is default for predictability, with manual override to handle urgent clinical prioritization.
- Session workflow is split into start (`not_started` -> `in_progress`) and complete (`in_progress` -> `completed`) to enforce staged validation and avoid partial data corruption.

## Data Modeling Decisions
- Sessions reference patients (rather than embedding) because sessions are unbounded over time and need independent querying, pagination, and updates.
- Anomalies are stored on each session document so historical flags remain reproducible without recalculating from changing configs.
- Indexes added and rationale:
  - `patients.mrn` (unique): enforces patient identity uniqueness.
  - `sessions.scheduledDate + queuePosition`: supports fast daily schedule retrieval and queue ordering.
  - `sessions.patientId`: supports patient history lookup and joins/population.

## Known Limitations & What's Next
- No authentication or role-based permissions yet.
- No real-time push updates; refresh is request-driven.
- Thresholds are global and not patient-personalized.
- Scheduling rules are basic and do not include conflict detection across units.
- No export/audit reporting workflow yet.
- No deployment pipeline or observability dashboard included.

## AI Tools Used
### What for
- Drafting initial API and README structure.
- Generating baseline unit-test skeletons.
- Proposing refactor candidates for session UI components.
- Suggesting validation/error-handling patterns.

### What reviewed manually
- Clinical thresholds and anomaly rule semantics.
- API validation and state-transition guards.
- UI behavior for session cards, badges, and notes flows.
- Seed scenarios for anomaly and non-anomaly coverage.

### One disagreement example
AI suggested one large `VitalsComponent` with conditional rendering for both display and edit states. I split this into focused parts (`VitalsDisplay`, modal/input flows, and `AnomalyBadge`) to reduce prop complexity, improve readability, and simplify testing.

