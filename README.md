# LoanDash

A mobile-first personal finance tracker for **subscriptions**, **bills**, **debts**, and **loans**. Built with React + TypeScript on the frontend and Express + SQLite on the backend, packaged as a native Android app through Capacitor and deployable via Docker.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-indigo?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20Docker-brightgreen?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
</p>

---

## Features

### Core
- Track **subscriptions**, **bills**, **debts**, and **loans** in one place
- Log payments and partial repayments with date tracking
- Auto-record recurring payments (daily, weekly, monthly, yearly)
- By-period or by-amount recurring modes for debts and loans
- Interest rate support with automatic calculation
- **Archive** completed or inactive items
- Import/export local JSON backups

### Dashboard
- Monthly cost overview with total breakdowns
- Upcoming payments timeline
- Overdue payment alerts with visual indicators
- **Breakdown charts** — swipeable pie charts with horizontal legend layout:
  - **Debts You Owe** (red/orange palette)
  - **Loans Owed to You** (green/teal palette)
  - **Bills & Subscriptions** (indigo/purple palette)
- **Activity Over Time** — line chart tracking monthly payments across all categories with toggle filters

### Desktop Experience
- **Card detail modal** — clicking a card on desktop opens a full detail modal instead of inline expand
- **Always-visible breakdown stats** — amounts and percentages shown without clicking
- Collapsible **About** section in Settings

### Settings
- System / Light / Dark theme with live switching
- Default currency selector (30+ currencies)
- Notification preferences (Android)
- In-app update checker with APK download & install
- Data export/import
- Developer profile

### Android
- Native status bar integration
- Local notifications for bill reminders
- File export to Downloads folder

### Server (Docker)
- **SQLite backend** — persistent data storage via `better-sqlite3`
- **Automatic migration** — seamlessly migrates data from v1.x `db.json` to SQLite
- **Data fixup** — normalizes category casing, direction, recurrence, and status on startup
- **REST API** — `/api/data`, `/api/items`, `/api/settings` endpoints
- **Docker deployment** — single container with named volume for data persistence

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Backend | Express.js, better-sqlite3 |
| Mobile | Capacitor 7 (Android) |
| Build | Vite 5 |
| Deploy | Docker |
| Target | Android SDK 23–35 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- JDK 17+ with `JAVA_HOME` set
- Android Studio with Android SDK (for Android build)
- Docker (for server deployment)

### Install & Run (Web Dev)

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### Install & Run (Server)

```bash
npm install
npm start
```

Opens at `http://localhost:3000`.

### Docker Deployment

```bash
# Build image
docker build -t hamzamix/loandash:2.0.0 .

# Run container
docker run -d --name loandash -p 8050:3000 -v loandash-data:/data hamzamix/loandash:2.0.0
```

App accessible at `http://localhost:8050`.

### Build APK

```bash
# Build the web bundle
npm run build

# Sync to Android
npx cap sync android

# Build release APK
cd android
.\gradlew.bat assembleRelease
```

APK output:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Open in Android Studio

```bash
npx cap open android
```

---

## Project Structure

```
LoanDash-AV/
├── components/
│   ├── DashboardView.tsx        # Main dashboard with stats & upcoming payments
│   ├── StatisticsView.tsx       # Pie charts & line chart (Recharts)
│   ├── FinanceTrackerView.tsx   # Item list with search & grid layout
│   ├── FinancialItemCard.tsx    # Expandable card with detail modal (desktop)
│   ├── FinancialItemForm.tsx    # Add/edit modal for all item types
│   ├── AddServiceForm.tsx       # Add/edit form for bills & subscriptions
│   ├── BulkPaymentModal.tsx     # Record multiple missing payments at once
│   ├── SettingsView.tsx         # App settings, theme, updates
│   ├── ProfileModal.tsx         # Developer profile with social links
│   ├── Modal.tsx                # Reusable modal component
│   ├── ConfirmModal.tsx         # Styled confirm dialog (replaces window.confirm)
│   ├── AlertModal.tsx           # Styled alert dialog (replaces alert())
│   ├── ErrorBoundary.tsx        # Crash recovery wrapper
│   └── Icons.tsx                # Custom SVG icon library
├── hooks/
│   ├── useLocalStorage.ts       # Persistent state hook
│   └── useNotifications.ts      # Notification scheduling
├── utils/
│   ├── versionCheck.ts          # GitHub release update checker
│   ├── currency.ts              # Currency formatting
│   └── iconCache.ts             # Service icon caching
├── server/
│   ├── index.js                 # Express entry point
│   ├── db.js                    # SQLite schema initialization
│   ├── migrate.js               # v1.x db.json → SQLite migration
│   └── routes/
│       ├── data.js              # GET/POST /api/data (sync & export/import)
│       ├── items.js             # CRUD /api/items
│       └── settings.js          # GET/PUT /api/settings
├── src/api/
│   └── client.ts                # API client functions
├── types.ts                     # TypeScript interfaces
├── App.tsx                      # Root component with auto-payment processor
├── index.html                   # Entry point with theme preloader
├── capacitor.config.ts          # Capacitor Android config
├── Dockerfile                   # Multi-stage Docker build
├── docker-compose.yml           # Docker Compose config
├── android/                     # Native Android project
└── dist/                        # Production build output
```

---

## Data Model

All data is stored in **SQLite** on the server (or `localStorage` in standalone mode). Each financial item includes:

- **Category**: Debt, Loan, Subscription, or Bill
- **Type**: Friend/Family, Bank Loan, Credit Card, etc.
- **Amount**: Principal (interest is calculated, not stored in amount)
- **Interest**: Optional rate with automatic `totalWithInterest` computation
- **Payment History**: Array of dated payments with running totals
- **Recurrence**: By-period or by-amount modes with configurable intervals
- **Payment Method**: Manual or Auto (auto-records missing payments on app start)

---

## What's New in v2.0.0

### Backend & Data
- **SQLite database** — replaced in-memory `localStorage` server with persistent SQLite via `better-sqlite3`
- **Automatic data migration** — seamlessly migrates v1.x `db.json` data to SQLite on first run, including payment date normalization
- **Data fixup on startup** — automatically corrects category casing, direction, recurrence, and status values
- **Auto-payment backfill** — records all missing payments for auto-pay items when app starts after being offline (e.g., 2–3 months)
- **Batched auto-payment updates** — reliable state updates preventing race conditions

### UI/UX
- **Desktop card modal** — clicking a card on desktop opens a full detail modal instead of inline expand
- **Collapsible About section** — Settings About card collapsed by default, expandable on click
- **Always-visible breakdown stats** — amounts and percentages shown directly in breakdown charts on desktop
- **Styled confirmation dialogs** — replaced native `window.confirm()` and `alert()` with app-styled modals
- **Removed Pay button for auto-pay cards** — hidden for items with automatic payments enabled

### Bug Fixes
- **Payment date normalization** — fixed invalid dates on migrated loan payments (ISO timestamps → YYYY-MM-DD)
- **Services breakdown** — Spotify and other zero-payment services now appear in Bills & Subscriptions chart
- **Service payment start date** — migrated services use `startDate` instead of `nextBillingDate`

### Infrastructure
- **Docker deployment** — multi-stage Dockerfile with slim production image (~430MB)
- **Named volume persistence** — `loandash-data` volume mounted at `/data` for SQLite storage
- **REST API** — `/api/data`, `/api/items`, `/api/settings` endpoints for server sync mode

---

## License

MIT

---

## Author

**Hamza Mribti** — [hamzamix.com](https://hamzamix.com)

- [GitHub](https://github.com/hamzamix)
- [X / Twitter](https://x.com/hamzamix)
- [LinkedIn](https://linkedin.com/in/hamzamix)
- [Instagram](https://instagram.com/hamzamix)
