# Pet Shop Billing App

Full-stack web application for managing a pet shop inventory and creating customer bills. Built with Vite + React on the frontend and Express + PostgreSQL on the backend.

## Project Structure

- `frontend/` – React UI (Vite)
- `backend/` – Express API with PostgreSQL

## Prerequisites

- Node.js 18+
- PostgreSQL 13+ running locally (or connection string via `DATABASE_URL`)

## Environment variables

Copy the provided samples and update the values to match your setup:

```bash
cd backend
copy env.sample .env        # Windows
# or: cp env.sample .env

cd ../frontend
copy env.sample .env
```

- `backend/.env`
  - `DATABASE_URL` – e.g. `postgresql://postgres:password@localhost:5432/petshop`
  - `PORT` – defaults to `4000`
  - `JWT_SECRET` – random string for signing admin tokens
  - `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD` – optional seed admin (defaults to `admin` / `admin123`)
- `frontend/.env`
  - `VITE_API_URL` – defaults to `http://localhost:4000/api`

## Setup & Running Locally

1. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
2. Run backend migrations (creates tables):
   ```bash
   cd backend
   npm run db:migrate
   npm run dev
   ```
3. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```
4. Open the UI at `http://localhost:5173`.

## Features

- Admin authentication with JWT-secured login
- Manage product catalog (name, price, stock) with create/edit/delete gated behind admin login
- Auto inventory warnings when stock < 10 and “Out of stock” at 0
- Build customer bills with multiple items, server-side stock validation, and live totals
- Automatic stock deduction when a bill is created
- Simple bill summary panel showing the latest invoice

## Next Steps

- Persist bill history view with pagination
- Reporting dashboard for revenue and low-stock alerts

