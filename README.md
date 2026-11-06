# Numrah Vacation Tracker

A team vacation/leave tracker. Employees submit leave requests, managers approve/reject requests
from their direct reports, and admins manage users, leave types, and per-employee allowances.

## Stack

- **Client**: React + Vite, React Router
- **Server**: Node.js + Express, JWT auth
- **Database**: PostgreSQL (via Docker)

## Prerequisites

- [Node.js](https://nodejs.org/en/download) (LTS)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## 1. Start the database

From the project root:

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with a persistent volume.

## 2. Set up and run the server

```bash
cd server
copy .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

The API runs on `http://localhost:4000`. `npm run seed` creates:

- An admin user: `admin@numrah.com` / `Admin123!` (override via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`)
- Three leave types: Personal Leave (20 days/year, pinned default), Sick Leave (10), Travel Work Leave (5) — editable under Admin > Leave types

## 3. Set up and run the client

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

The app runs on `http://localhost:5173` and proxies `/api` requests to the server.

## 4. Log in

Open `http://localhost:5173`, log in as the seeded admin, then:

1. Go to **Users** and create a manager, then an employee assigned to that manager.
2. Go to **Leave Types** to adjust default allowances if needed.
3. Log out and log in as the employee to submit a leave request.
4. Log out and log in as the manager to approve/reject it under **Team Requests**.

## Notes on the leave balance model

- Each employee has one balance row per (leave type, year), with an `allotted_days` and `used_days` count.
- Submitting a request checks it against the employee's remaining balance, but `used_days` is only
  incremented when a request is **approved** — pending requests don't lock in days.
- Rejected requests never affect the balance.
- Day counts are calendar-day inclusive (start date through end date); weekends are not excluded.

## Project structure

```
server/   Express API, Postgres access, migrations, seed script
client/   React app (Vite)
docker-compose.yml   Local Postgres instance
```
