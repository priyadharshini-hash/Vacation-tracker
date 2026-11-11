# Numrah Leaves Tracker

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
- Three leave types: Personal Leave (10 days/year, pinned default), Travel Work Leave (10), Sick Leave (unlimited) — days, the unlimited flag and the pinned default are editable under Admin > Leave types

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

## 5. Optional: Sign in with Slack

Lets the team log in with their Slack account, like "Sign in with Google". The button only shows up
once Slack is configured.

1. Go to <https://api.slack.com/apps> and choose **Create New App** > **From scratch** (name it e.g.
   "Numrah Leaves Tracker", pick the Numrah workspace).
2. Under **OAuth & Permissions** > **Redirect URLs**, add `<APP_URL>/api/auth/slack/callback` and click
   **Save URLs**. Slack only accepts `https://` addresses (it rejects `http://localhost` with "invalid
   redirect_uri"), so locally use `https://localhost:5173/api/auth/slack/callback` and set
   `APP_URL=https://localhost:5173` (see "Local HTTPS" below). In production use your real `https://` address.
3. Under **OAuth & Permissions** > **User Token Scopes**, add `openid`, `email` and `profile`.
4. Under **Basic Information** > **App Credentials**, copy the Client ID and Client Secret.
5. Put these in `server/.env` (this file is git-ignored; never commit the secret) and restart the server:

   ```
   APP_URL=http://localhost:5173
   SLACK_CLIENT_ID=...
   SLACK_CLIENT_SECRET=...
   SLACK_TEAM_ID=T...   # optional but recommended: your workspace ID
   ```

**Local HTTPS.** If `client/certs/localhost.pfx` exists, the Vite dev server serves the app on
`https://localhost:5173`. Create a throwaway certificate once (PowerShell), then restart the client; the browser
shows a one-time "not private" warning for it (choose Advanced > Proceed to localhost):

```powershell
New-Item -ItemType Directory -Force client\certs | Out-Null
$c = New-SelfSignedCertificate -DnsName localhost -CertStoreLocation Cert:\CurrentUser\My -NotAfter (Get-Date).AddYears(1) -KeyExportPolicy Exportable
Export-PfxCertificate -Cert $c -FilePath client\certs\localhost.pfx -Password (ConvertTo-SecureString 'localhost-dev' -AsPlainText -Force)
Remove-Item "Cert:\CurrentUser\My\$($c.Thumbprint)"
```

`client/certs/` is git-ignored. Without the file the app runs on plain `http://localhost:5173` as before.

How it behaves:

- A person signs in with the Slack email; it is matched (case-insensitive) to an existing user.
- With `SLACK_TEAM_ID` set, only people in that workspace can sign in, and anyone without an account is
  created automatically as an **employee** (with default balances). An admin can change their role later.
- Without `SLACK_TEAM_ID`, only people who already have an account can sign in (nobody is auto-created).
- Email and password login keeps working alongside Slack.

## 6. Deploy from GitHub (run it without your own computer)

The server can serve the built website itself, so one service hosts everything at one address. Any host
that deploys from a GitHub repository works (Render, Railway, Fly.io, Azure App Service, ...). Deploy the
`main` branch.

**Commands the host needs** (the repo root has a `package.json` for this):

| Step | Command |
|---|---|
| Build | `npm run build` (installs both parts and builds the client into `client/dist`) |
| Start | `npm start` (runs migrations, creates the first admin if missing, then starts the server) |
| Health check path | `/api/health` |
| Node version | 20 or newer |

**Resources:** one web service plus one PostgreSQL database.

**Environment variables** (enter them in the host's dashboard; never commit them):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | the hosted database's connection string |
| `DATABASE_SSL` | `true` (if the database requires an encrypted connection) |
| `JWT_SECRET` | a new long random value |
| `APP_URL` and `CLIENT_ORIGIN` | the public `https://` address of the site |
| `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` | the first admin; use a strong password. With `NODE_ENV=production` the default password is refused and no admin is created |
| `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_TEAM_ID` | see section 5 |

After the first deploy:

1. In your Slack app (**OAuth & Permissions > Redirect URLs**) add `<APP_URL>/api/auth/slack/callback` and click **Save URLs**.
2. Open the site and sign in with Slack, or with the seeded admin at `<APP_URL>/login?email=1`.
3. Under **Users**, give the right people the manager or admin role, and set each person's manager.
4. Delete any test accounts and change the seeded admin password if it was ever shared.

Every merge into `main` redeploys automatically on most hosts. New database migrations run on start.

## Notes on the leave balance model

- Each employee has one balance row per (leave type, year), with an `allotted_days` and `used_days` count.
- **Unlimited** leave types (Sick Leave by default) skip the balance check; days taken are still counted.
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
