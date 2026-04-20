# SFS Business Toolkit — SaaS Web App

## Overview
A full-stack SaaS web application for SmartFlow Systems (SFS) that provides three powerful business tools. Users sign up with email/password, get 5 free document generations per month, and can upgrade to Pro (via Stripe) for unlimited access.

## Tools
1. **Client Onboarding Wizard** — 3-step wizard generating a contract, task checklist, and client brief
2. **Service Launch Kit Generator** — Generates email pitch, social media posts (LinkedIn/Twitter/Instagram), and website HTML section
3. **Outreach Campaign Builder** — Generates 3-email follow-up sequence and pitch deck outline for a prospect
4. **Business Settings** — One-time setup of business details pre-filled into all generated documents

## Architecture
- **Backend**: Node.js + Express (`server.js`)
- **Database**: PostgreSQL (Replit built-in) via `pg` driver — tables managed in `db.js`
- **Auth**: bcrypt password hashing + express-session + connect-pg-simple (sessions in DB)
- **Payments**: Stripe (freemium model — 5 free generations/month, Pro = unlimited)
- **Frontend**: Vanilla HTML/CSS/JS served from `public/` directory
- **Content Generators**: All generation logic in `generators.js` (server-side)

## Project Structure
```
server.js          — Express server (auth, API routes, Stripe)
db.js              — PostgreSQL connection + all DB queries
generators.js      — All document/content generator functions
public/
  dashboard.html   — Main app UI (auth-protected, API-driven)
  login.html       — Login page
  signup.html      — Signup page
  upgrade-success.html — Post-Stripe-payment success page
  style.css        — SFS gold/marble theme
  sfs-circuit-flow.js — Animated circuit background
scripts/
  post-merge.sh    — npm install (runs after task merges)
```

## Running the Project
Workflow: `Serve Extension` → runs `node server.js` on port 5000

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` — Secret for session signing (falls back to hardcoded default in dev)
- `STRIPE_SECRET_KEY` — Stripe secret key (optional — payments disabled if not set)
- `STRIPE_PRICE_ID` — Stripe price ID for the Pro subscription
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret

## Freemium Model
- **Free**: 5 document generations per month (total across all tools)
- **Pro**: Unlimited generations — users upgrade via Stripe checkout
- Usage tracked in `usage` table per user/tool/month

## DB Tables
- `users` — id, name, email, password_hash, plan, stripe_customer_id, stripe_subscription_id
- `user_settings` — user_id (FK), business_name, your_name, email, phone, website, logo_url, calendar_link
- `usage` — user_id, tool, month_year, count (unique per user/tool/month)
- `generated_files` — user_id, tool, label, file_name, content (history)
- `session` — managed by connect-pg-simple
