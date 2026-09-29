# SkyTrack Admin Portal

Enterprise Workforce & Attendance Management Dashboard for **Skypass Visa Services**.

---

## 📌 Project Working State & Changelog

A comprehensive, live tracking document detailing current features, module states, architectural specifications, and upcoming/historical changes is maintained in:

👉 **[`PROJECT_STATE.md`](./PROJECT_STATE.md)**

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:5173`. API requests to `/api/skytrack` are automatically proxied to the Supabase Edge Function via Vite.

### 3. Build for Production
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS v4, Google Fonts (Plus Jakarta Sans, Inter), Material Symbols Outlined
- **Backend & Auth**: Supabase (@supabase/supabase-js), Supabase Edge Functions (`skytrack-api`), Supabase Postgres RLS
- **Icons**: lucide-react, Google Material Symbols

---

## 📂 Core Modules

- **Authentication & RBAC**: Edge function authentication with role enforcement (`admin`, `super_admin`, `administrator`, `manager`).
- **Dashboard**: Real-time workforce metrics, today's attendance summary, and pending leave queue.
- **Workforce Registry**: Employee directory with live search, filtering, and detailed profile management.
- **Attendance**: Daily attendance tracking, status categorization, and attendance record inspector.
- **Leave Management**: Leave submission approval/rejection workflows with status tracking.
- **Public Holidays Management**: 2026 gazetted & restricted holiday calendar, branch coverage configuration, quarterly matrix view, and schedule export.
- **Settings & Profile**: Administrator profile view, password updates, and session termination.
# SkyTrack-admin
