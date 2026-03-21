# Dialysis Dashboard
Dialysis center intake dashboard for registering patients, recording dialysis sessions, and flagging session-level anomalies for nursing review.
Stack: TypeScript · Express · React (Vite) · MongoDB Atlas

## Quick Start
- Prerequisites: Node.js 18+, npm, MongoDB Atlas URI
- Create `backend/.env` with `MONGO_URI=<your_connection_string>`

```bash
git clone <repository-url>
cd dialysis-dashboard

# install
cd backend && npm install
cd ../frontend && npm install
cd ..

# seed sample data
cd backend && npm run seed
cd ..

# run both servers
# Terminal 1 (backend)
cd backend && npm run dev

# Terminal 2 (frontend)
cd frontend && npm run dev
```

| Area | Script | Purpose |
|---|---|---|
| backend | `npm run dev` | Start API with nodemon |
| backend | `npm run build` | Compile TypeScript |
| backend | `npm run seed` | Seed MongoDB sample patients/sessions |
| backend | `npm test` | Run Jest tests |
| frontend | `npm run dev` | Start Vite dev server |
| frontend | `npm run build` | Build frontend bundle |
| frontend | `npm run test` | Run Vitest tests |
| frontend | `npm run lint` | Run ESLint |

## Architecture
The frontend calls a thin API client layer that talks to Express routes; controllers validate input, apply session rules and anomaly detection, then persist/retrieve records through Mongoose models in MongoDB.

```text
React (Vite) -> Axios API client -> Express routes -> Controllers
                                            |
                                            v
                                 anomalyDetector + config
                                            |
                                            v
                                  Mongoose models -> MongoDB
```

Session lifecycle (plain text):
- `not_started` -> `in_progress` when pre-session data is recorded and session begins
- `in_progress` -> `completed` when post-session data and duration are submitted
- `not_started` sessions remain scheduled until started or replaced by rescheduling workflow

## API Reference
### Patients
- `GET /api/patients` - List patients with latest session context.
- `GET /api/patients/:id` - Get one patient and recent sessions.
- `POST /api/patients` - Register a patient. Body: `name, mrn, dryWeight, dateOfBirth?, primaryDiagnosis?`.
- `PATCH /api/patients/:id` - Update patient details (MRN not editable). Body: `name?, dryWeight?, dateOfBirth?, primaryDiagnosis?`.

### Sessions
- `GET /api/sessions` - List sessions with pagination/filter support.
- `GET /api/sessions/today` - Return today schedule with anomalies included.
- `GET /api/sessions/:id` - Get one session.
- `POST /api/sessions` - Create session. Body: `patientId, machineId, scheduledDate, targetDurationMinutes, preWeight, preBloodPressure{systolic,diastolic}, status`.
- `PATCH /api/sessions/:id` - Start/update status to in-progress. Body: `status` (`in_progress`).
- `PATCH /api/sessions/:id/complete` - Complete session and compute anomalies. Body: `postWeight, postBloodPressure{systolic,diastolic}, sessionDurationMinutes, nurseNotes?`.
- `PATCH /api/sessions/:id/notes` - Update nurse notes. Body: `nurseNotes`.

### Queue
- `PATCH /api/sessions/:id/queue` - Update queue ordering metadata. Body: `queuePosition` (and reorder payload handled by controller logic).

## Clinical Assumptions & Trade-offs
### Weight Gain (Interdialytic)
| Category | Threshold | Severity | Rationale |
|---|---|---|---|
| Excess weight gain | >= 2.0 kg | Warning | Common dialysis monitoring threshold for fluid overload risk |
| Critical weight gain | >= 3.0 kg | Critical | Elevated risk; needs immediate clinical attention |

### Blood Pressure (Post-Dialysis)
| Category | Threshold | Severity | Rationale |
|---|---|---|---|
| High post-dialysis systolic BP | >= 160 mmHg | Critical | Conservative threshold to surface hypertensive post-dialysis risk |

### Session Duration
| Category | Threshold | Severity | Rationale |
|---|---|---|---|
| Short session | > 30 min below target | Warning | May indicate under-dialysis |
| Long session | > 60 min above target | Warning | May reflect treatment or workflow variance needing review |

- MRN auto-assigned sequentially, immutable after creation.
- Machine required before session can be created.
- Duplicate session per patient per day not allowed.
- Sessions scheduled max 30 days in advance.

## Data Models
### Patient Schema (MongoDB)
```typescript
{
  _id: ObjectId,
  name: String,
  mrn: String,            // unique, immutable
  dryWeight: Number,
  dateOfBirth?: Date,
  primaryDiagnosis?: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Session Schema (MongoDB)
```typescript
{
  _id: ObjectId,
  patientId: ObjectId,
  scheduledDate: Date,
  status: "not_started" | "in_progress" | "completed",
  machineId: String,
  nurseId?: String,
  preWeight?: Number,
  postWeight?: Number | null,
  preBloodPressure?: { systolic: Number, diastolic: Number },
  postBloodPressure?: { systolic: Number, diastolic: Number } | null,
  sessionDurationMinutes?: Number | null,
  targetDurationMinutes: Number,
  nurseNotes?: String | null,
  queuePosition?: Number,
  anomalies: Array<{ type: String, severity: "warning" | "critical", message: String }>,
  createdAt: Date,
  updatedAt: Date
}
```

## Tests
Run:
```bash
cd backend && npm test
cd frontend && npm test
```

- `backend/src/utils/__tests__/anomalyDetector.test.ts` - anomaly detection business rules; expected pass count contributes to backend total.
- `backend/src/routes/__tests__/sessions.test.ts` - session API route behavior and validations; backend expected: 10 tests passing.
- `frontend/src/components/session/__tests__/SessionCard.test.tsx` - session card rendering and anomaly indicators; frontend expected: 3 tests passing.

## Seed Data
- Ananya Patel (MRN 1001): in-progress, high post-BP + short-session anomaly.
- Michael Reyes (MRN 1002): completed, normal run, no anomalies.
- Farah Khan (MRN 1003): scheduled/not-started with pre-vitals entered.
- Leo Martins (MRN 1004): in-progress, normal trend.
- Nora Ibrahim (MRN 1005): completed with long-session warning.
- Omar Haddad (MRN 1006): registered patient without a same-day session.

## Project Structure
```text
dialysis-dashboard/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── anomalyConfig.ts
│   │   │   └── db.ts
│   │   ├── controllers/
│   │   │   ├── patientController.ts
│   │   │   └── sessionController.ts
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts
│   │   │   └── validate.ts
│   │   ├── models/
│   │   │   ├── Patient.ts
│   │   │   └── Session.ts
│   │   ├── routes/
│   │   │   ├── patientRoutes.ts
│   │   │   ├── sessionRoutes.ts
│   │   │   └── __tests__/
│   │   │       └── sessions.test.ts
│   │   ├── scripts/
│   │   │   └── seed.ts
│   │   ├── utils/
│   │   │   ├── anomalyDetector.ts
│   │   │   └── __tests__/
│   │   │       └── anomalyDetector.test.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── patients.ts
│   │   │   └── sessions.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── patient/
│   │   │   ├── session/
│   │   │   │   └── __tests__/
│   │   │   │       └── SessionCard.test.tsx
│   │   │   └── ui/
│   │   ├── context/
│   │   │   └── ThemeContext.tsx
│   │   ├── pages/
│   │   │   ├── PatientsPage.tsx
│   │   │   └── TodaySchedule.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## AI Tools Used
### 1. What AI was used for
- Drafting API documentation structure and endpoint summaries.
- Generating baseline unit-test scaffolds for Jest and Vitest.
- Suggesting refactor candidates for session UI components.
- Producing first-pass README formatting and section organization.

### 2. What was reviewed manually
- Clinical thresholds and anomaly rules in configuration.
- Validation rules for required fields and state transitions.
- Session-card rendering details for status, vitals, and anomalies.
- Seed scenarios to ensure anomaly/non-anomaly coverage.

### 3. Example disagreement with AI output
AI suggested one large `VitalsComponent` with conditional rendering for display and editing states. I split it into focused parts (`VitalsDisplay`, input/modal flows, and `AnomalyBadge`) to keep responsibilities separate, reduce prop complexity, and make tests easier to maintain.

## Known Limitations & What's Next
- No authentication or role-based access control yet.
- No live updates; schedule refresh is request-driven.
- Rule-based thresholds are global, not patient-personalized.
- No audit export/reporting pipeline for compliance workflows.
- Queue tooling is basic and lacks conflict-aware scheduling.
- Multi-center timezone and unit-level policy configuration is pending.
