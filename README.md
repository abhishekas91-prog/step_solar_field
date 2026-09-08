# Step Solar Field App

Mobile app for Sales and Ops to move every solar pipeline step from the field.
Separate repo from `StepSolar-CRM` — no shared code. Talks only to the CRM
backend API. See `API_CONTRACT.md`.

## Stack

- React + Vite (installable PWA, phone-first)
- Same JWT login as the CRM web app
- Android wrap later with Capacitor / Expo if you want a Play Store build

## Run

```bash
# Install dependencies
npm install

# Start the field app (proxies /api to the live backend)
npm run dev
```

Dev server: `http://localhost:5174`

Optional local backend:

```bash
# Point the Vite proxy at a local FastAPI
VITE_API_TARGET=http://localhost:8000 npm run dev
```

## What field staff can do

- Sign in with CRM email / password (Sales, Site Survey, Installation, Accounts, Admin)
- Dashboard copied from the LivSol360-style screenshot: profile, today count, chips, search, stage tiles, + lead
- Open a tile to see only that stage
- Call / WhatsApp the customer
- Advance a stage (Pending → In Progress → Completed) — only stages owned by your role
- Save field notes, pin GPS, upload a proof photo on the stage you own
- Capture a new lead from site (`source = Field Agent`)

## Not in this repo

CRM FastAPI + React desktop live in `StepSolar-CRM`. Do not copy this app into that tree.
