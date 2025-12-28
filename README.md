# Patient Risk Assessment App

A full-stack web application built with **Next.js (App Router)** and **React** that fetches patient data from an external API, analyzes risk on the backend, and presents results in a clean, paginated UI.

---

## Features

- **Paginated patient table**
    - Server-side pagination
    - Skeleton loaders for a snappy UX
- **Backend-only risk analysis**
    - Configurable rule engine (JSON-driven)
    - No calculations in the frontend
- **Data caching**
    - Patient data and analysis stored as local JSON files
    - Toggle cache usage via environment/config
- **Robust API handling**
    - Retries for transient failures (429 / 5xx)
    - Handles inconsistent response shapes and missing fields
- **Assessment submission**
    - Hard-blocked until analysis exists
    - Typed confirmation required
    - Submits only backend-generated results

---

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Next.js API routes
- **HTTP:** Axios with retry & backoff
- **Storage:** Local JSON files (no database)

---

## Environment Variables

Create a `.env.local` file:

```env
API_BASE_URL=https://example.com/api
API_KEY=your-api-key-here
```

> These variables are **server-only** and are never exposed to the browser.

---

## Scripts

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## High-Level Flow

1. App loads first page of patients
2. User paginates → backend fetches pages on demand
3. User clicks **Start Analysis**
    - Backend fetches all pages (if not cached)
    - Runs rule-based risk analysis
    - Saves results to JSON
4. User reviews results and submits assessment

---

## Notes

- All business logic lives on the server
- Rules and thresholds are fully configurable via JSON
- Designed for clarity, correctness, and assessment safety

---
