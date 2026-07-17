# LoanDash

A mobile-first personal finance tracker for **subscriptions**, **bills**, **debts**, and **loans**. Built with React + TypeScript, packaged as a native Android app through Capacitor.

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-indigo?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/platform-Android-brightgreen?style=flat-square" alt="Platform">
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
- Offline-first — all data stored locally via `localStorage`
- Crash recovery with auto data clearing

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Mobile | Capacitor 7 (Android) |
| Build | Vite 5 |
| Target | Android SDK 23–35 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- JDK 17+ with `JAVA_HOME` set
- Android Studio with Android SDK

### Install & Run (Web)

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### Build APK

```bash
# Build the web bundle
npm run build

# Sync to Android
npx cap sync android

# Build debug APK
cd android
.\gradlew.bat assembleDebug
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
│   ├── FinancialItemCard.tsx    # Expandable card with payment history
│   ├── FinancialItemForm.tsx    # Add/edit modal for all item types
│   ├── SettingsView.tsx         # App settings, theme, updates
│   ├── ProfileModal.tsx         # Developer profile with social links
│   ├── Modal.tsx                # Reusable modal component
│   ├── ErrorBoundary.tsx        # Crash recovery wrapper
│   └── Icons.tsx                # Custom SVG icon library
├── hooks/
│   ├── useLocalStorage.ts       # Persistent state hook
│   └── useNotifications.ts      # Notification scheduling
├── utils/
│   ├── versionCheck.ts          # GitHub release update checker
│   ├── currency.ts              # Currency formatting
│   └── iconCache.ts             # Service icon caching
├── types.ts                     # TypeScript interfaces
├── App.tsx                      # Root component
├── index.html                   # Entry point with theme preloader
├── capacitor.config.ts          # Capacitor Android config
├── android/                     # Native Android project
└── dist/                        # Production build output
```

---

## Data Model

All data is stored in `localStorage` on the device. Each financial item includes:

- **Category**: Debt, Loan, Subscription, or Bill
- **Type**: Friend/Family, Bank Loan, Credit Card, etc.
- **Amount**: Principal (interest is calculated, not stored in amount)
- **Interest**: Optional rate with automatic `totalWithInterest` computation
- **Payment History**: Array of dated payments with running totals
- **Recurrence**: By-period or by-amount modes with configurable intervals

---

## What's New in v1.1.0

- **Breakdown carousel** — swipeable pie charts for debts, loans, and services
- **Horizontal chart layout** — donut chart on the left, legend with values on the right
- **Activity timeline** — line chart showing payment history over time with category filters
- **Developer profile modal** — social links and contact info
- **System theme detection** — follows your OS light/dark preference automatically
- **In-app updates** — download and install APK updates directly from Settings
- **Interest calculation fixes** — progress bars and card status now use total owed (principal + interest)
- **Data migration** — automatic fix for corrupted data from older versions

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
