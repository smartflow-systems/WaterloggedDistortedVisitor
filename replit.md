# SFS Business Toolkit — Replit Extension

## Overview
A Replit Extension for SmartFlow Systems (SFS) that provides three powerful business tools:

1. **Client Onboarding Wizard** — Collects client details and auto-generates a project folder, contract template, task checklist, and client brief in the workspace.
2. **Service Launch Kit Generator** — Takes service details and generates a marketing email pitch, social media posts (LinkedIn, Twitter, Instagram), and a ready-to-use website section (HTML).
3. **Outreach Campaign Builder** — Takes prospect details and generates a 3-email follow-up sequence, a pitch deck outline, and updates a running prospects CSV ledger.

## Project Structure
- `index.html` — Full SFS-branded UI with tab navigation for all three tools
- `script.js` — All logic: tab switching, form handling, file generation via Replit FS API
- `style.css` — Professional dark-themed SFS styling
- `extension.json` — Extension metadata (name: "SFS Business Toolkit")
- `background.html` / `background.js` — Background extension scripts

## Running the Project
Served via `npx serve -l 5000` (Workflow: "Serve Extension").

**Note:** The `replit.fs` file-writing features only work when the extension is loaded inside the Replit Extension Devtools panel. The UI loads and displays correctly in the preview at all times.

## How to Use
1. **In Replit**: Open Extension Devtools → Tools → Open
2. Fill in the relevant tool's form and click Generate — files are created directly in your workspace

## Output Files
- **Client Onboarding** → `clients/<company-name>/contract.md`, `task-checklist.md`, `client-brief.md`
- **Service Launch Kit** → `launch-kits/<service-name>/email-pitch.md`, `social-media-posts.md`, `website-section.html`
- **Outreach Campaigns** → `outreach-campaigns/<prospect-name>/email-1-intro.md`, `email-2-followup.md`, `email-3-final.md`, `pitch-deck-outline.md`; `outreach-campaigns/prospects.csv` (appended each run)
