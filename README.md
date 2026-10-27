# KA Mart

Backend (Express + MongoDB) in `backend/`. Money is integer minor units (Rs. 1 = 100).

## Setup

1. MongoDB must run as a replica set (transactions): Atlas, or `mongod --replSet rs0` then `rs.initiate()`.
2. `cd backend && cp .env.example .env` and set `JWT_SECRET` (long random) and `MONGODB_URI`.
3. `npm install`
4. Create admin: `ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='long-password' npm run create-admin`
5. Optional dev demo data: `npm run seed:dev` (refuses in production / non-empty DB)

## Commands

`npm run dev` (API on :5000) · `npm test` · `npm start` (production, NODE_ENV=production)

## Accounting rules

Weighted-average costing; purchase transport/other costs are capitalised into inventory, not expenses. COGS = cost of goods actually sold. Transfers and owner money never affect profit. Payments carry an `Idempotency-Key` header to prevent duplicates. Ledger is append-only; corrections are offsetting entries. Dashboard/P&L: `GET /api/reports/dashboard|pnl?from=YYYY-MM-DD&to=...`.

## Known limits

Returns refund at line price (invoice-level discounts are not apportioned). CSV export, invoice PDF, product images, per-channel/category reports and a Cash Flow page are not built yet.

## Frontend

`cd frontend && npm install && npm run dev` (http://localhost:5173, proxies /api to :5000) · `npm run build` for production (serve `dist/`).

## API smoke test

With the API running on a **fresh, empty database** and an admin `admin@kamart.lk` / `SmokeTest12345` created: `cd backend && npm run smoke` (52 end-to-end checks: spec cases 3-5, payments, returns, cancellations, transfers, closing, all reports). Use a throwaway database; it writes data.

## Dev without a replica set

`NO_TRANSACTIONS=1` in `.env` disables DB transactions so the API runs on a plain/standalone MongoDB-compatible server. Dev/testing only; the server refuses to start with it when `NODE_ENV=production`. Real data needs the replica set so a failed write cannot leave stock and money half-updated.

## Connecting frontend and backend (two separate .env files)

- `backend/.env`: `MONGODB_URI`, `JWT_SECRET`, `PORT`, and `CLIENT_ORIGIN` (the frontend's URL, e.g. `http://localhost:5173`).
- `frontend/.env`: `VITE_API_URL` (the backend's URL ending in `/api`, e.g. `http://localhost:5000/api`).
- In production set `CLIENT_ORIGIN` to your real site address and `VITE_API_URL` to your real API address, then rebuild the frontend (`npm run build`), because Vite reads it at build time.
- Restart each server after changing its `.env`.

## Product photos

Upload from Products > Add/Change photo (JPG, PNG, WebP, max 2 MB). Files are checked by content, renamed randomly and stored in `backend/uploads/` (served at `/uploads`). Back this folder up with your database.

## Settings lists

Settings > Lists used in forms controls expense categories, product categories, payment methods and sales channels.

## Expense receipts

Expenses > Attach receipt (JPG, PNG, WebP or PDF, max 3 MB). Checked by content, stored in `backend/private-uploads/` (not publicly served) and only viewable by logged-in users via "View receipt". Back this folder up too.

## Frontend page tests

`cd frontend && npm test` renders all 15 pages plus the edit, return, statement and login-redirect flows in a simulated browser against the running API. Needs the backend running on a throwaway database that already contains the demo data from `npm run smoke` (login `admin@kamart.lk` / `SmokeTest12345`, or set `TEST_EMAIL` / `TEST_PASSWORD`).

## Deleting a purchase

Purchases > Delete (admin only) voids a purchase safely: the stock it added is removed at its landed cost, payments you made are recorded as supplier refunds in the account ledger, and it disappears from supplier balances, payables, purchase reports and the dashboard. The record is kept (tick "Show deleted") for auditing. Deletion is refused if any of that stock was already sold, returned or adjusted: use a stock adjustment instead.

## Scan a supplier bill (auto-fill purchases)

Purchases > New purchase > **Scan bill** (photo, camera or PDF, max 5 MB). An AI reads the bill and pre-fills supplier, date, bill number, each product with quantity and unit cost, discount and transport. Everything stays editable and nothing is saved until you press Save.
Pick ONE option in `backend/.env`, restart the backend, then run `cd backend && npm run check-ai`:

- **Free: Google Gemini.** Create a key at https://aistudio.google.com/apikey and set `GEMINI_API_KEY=` (default model `gemini-2.5-flash`). Free tier has rate limits and no credit card is needed; check Google's current free-tier terms, including how free-tier data may be used.
- **Free and private: local model with Ollama** (photos only). Install Ollama, run `ollama pull llama3.2-vision`, then set `OPENAI_BASE_URL=http://localhost:11434/v1` and `OPENAI_MODEL=llama3.2-vision`. Slower and less accurate than the cloud options.
- **Paid:** Claude (`ANTHROPIC_API_KEY`, needs credit) or OpenAI (`OPENAI_API_KEY`).
  If several are set, Gemini is used first unless `BILL_AI_PROVIDER` says otherwise.
  What the scan system does for you:
- Shrinks phone photos before upload, so big camera pictures never hit the size limit; reads PDFs too (Gemini).
- Gemini returns structured data (not free text); if the model is busy or the free limit is reached it retries, then falls back to `GEMINI_FALLBACK_MODEL`.
- Matches lines to your products by name or exact SKU (different model numbers such as iPhone 14 vs 15 are never auto-matched); unmatched lines show "No matching product" with a Create button; weak matches show "Check this match".
- Warns when the same **bill number** was already recorded for that supplier (saving it again needs a confirmation), when a unit cost is 10% or more away from your average cost, and when the bill total differs from the form.
- Saves the bill photo with the purchase (private, login required): Purchases > View bill. Back up `backend/private-uploads/`.
  Errors: 400 "credit too low" = that provider has no credit; 401/403 or "key rejected" = wrong key or backend not restarted after editing `.env`; 429 = free limit reached, wait.
  Tests use fake AI servers: `PORT=4010 node backend/tests/mock-anthropic.js`, start the API with `GEMINI_API_KEY=test-key GEMINI_BASE_URL=http://127.0.0.1:4010`, then `SMOKE_MOCK_AI=1 npm run smoke`.
