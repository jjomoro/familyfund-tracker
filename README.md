# FamilyFund Tracker 

FamilyFund Tracker is a React/Vite app for managing a shared monthly family emergency fund.

This version removes fund data from browser `localStorage` and stores members, contributions, withdrawals, settings, and audit activity in Supabase Postgres.

## What is included

- Supabase email/password authentication
- PostgreSQL tables for members, contributions, withdrawals, fund settings, and audit logs
- Row Level Security policies
- First signed-up user becomes admin
- Members can view their own contribution records
- Admins can add/edit members, set targets, record contributions, and approve/reject withdrawals
- Dashboard snapshot RPC for fund balance, monthly growth, outstanding dues, and recent activity
- GitHub Pages deployment workflow

## Folder highlights

```text
supabase/schema.sql
src/lib/supabaseClient.js
src/lib/fundService.js
src/pages/AuthPage.jsx
.github/workflows/deploy.yml
.env.example
```

## Local setup

### 1. Install Node.js

Install Node.js LTS from https://nodejs.org.

Check it is installed:

```bash
node -v
npm -v
```

### 2. Install the app

```bash
npm install
```

### 3. Create a Supabase project

1. Go to https://supabase.com
2. Create a new project
3. Wait for the project to finish provisioning
4. Open the project dashboard

### 4. Run the database schema

1. In Supabase, open **SQL Editor**
2. Click **New query**
3. Copy everything from:

```text
supabase/schema.sql
```

4. Paste it into Supabase SQL Editor
5. Click **Run**

Important: run the schema before creating your first app account. The first account that signs up becomes the admin.

### 5. Get your Supabase keys

In Supabase:

1. Open **Project Settings**
2. Go to **API**
3. Copy the **Project URL**
4. Copy the **anon public key**

### 6. Create your local environment file

Copy the example file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_BASE_PATH=/
```

Use `VITE_BASE_PATH=/` for local development.

### 7. Start the app locally

```bash
npm run dev
```

Open the URL Vite gives you, usually:

```text
http://localhost:5173/
```

### 8. Create the admin account

1. Open the app
2. Click **Create account**
3. Enter your name, email, and password
4. If Supabase asks you to confirm your email, check your inbox and confirm
5. Sign in

The first signed-up user becomes the admin.

### 9. Add family members

As admin:

1. Open **Settings**
2. Click **Add Member**
3. Enter the family member's name, email, target amount, and role
4. Save

When that person creates an account using the same email, Supabase links their login to that member profile.

## Deploy to GitHub Pages

### 1. Create a GitHub repository

Example repository name:

```text
familyfund-tracker
```

### 2. Push the code

```bash
git init
git add .
git commit -m "Supabase version of FamilyFund Tracker"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/familyfund-tracker.git
git push -u origin main
```

### 3. Add GitHub repository secrets

In GitHub:

1. Open your repository
2. Go to **Settings**
3. Go to **Secrets and variables**
4. Click **Actions**
5. Click **New repository secret**

Add these two secrets:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Use the values from Supabase Project Settings > API.

### 4. Enable GitHub Pages

In GitHub:

1. Open **Settings**
2. Open **Pages**
3. Under **Build and deployment**, choose **GitHub Actions**

### 5. Deploy

Push to `main`. GitHub Actions will build and publish the app.

Your live URL will usually be:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/
```

The included workflow automatically sets the correct Vite base path using the repository name.

## Supabase authentication notes

For a simpler family setup, you may want to disable email confirmation while testing:

1. Supabase dashboard
2. Authentication
3. Providers
4. Email
5. Turn off **Confirm email** for testing

For real use, turn email confirmation back on.

## Security notes

- The Supabase anon key is safe to expose in a browser app when Row Level Security is enabled.
- Do not expose the Supabase service role key in GitHub, frontend code, or `.env.local`.
- Fund records are no longer stored in browser `localStorage`.
- Supabase Auth may still store the user session token in the browser. That is normal for client-side apps.
- For stronger production-grade audit logs, move write actions behind Supabase Edge Functions or your own backend.

## GitHub Actions npm registry fix

If GitHub Actions fails with a URL containing `packages.applied-caas-gateway1.internal.api.openai.org`, delete `package-lock.json` and keep the included `.npmrc`. That internal URL came from the original generated environment and GitHub cannot access it. This project now installs from the public npm registry.

## Member management update

This version adds safer admin member management:

- **Add Member** opens a working modal from Settings.
- **Copy Invite** copies a WhatsApp/email invite message with the app link.
- **Remove** archives/deactivates the member from active access while keeping historical contributions, withdrawals, and audit records.

### Existing Supabase project migration

If you already ran the first schema, run this file in Supabase SQL Editor:

```text
supabase/migrations/20260707_member_management.sql
```

Then redeploy the GitHub Pages workflow.

### Why Remove does not hard-delete Auth users

The frontend uses the public anon key, so it cannot safely call Supabase Auth admin methods. True Auth user deletion requires a server-side function with the service role key. Do not put the service role key in this React app or GitHub Pages secrets intended for Vite builds.

## Mobile responsiveness update

This build keeps the existing Supabase database/auth logic intact and only adjusts the front-end presentation layer.

What changed:

- Sticky compact mobile header/navigation
- Dashboard KPI cards tightened for small screens
- Contribution, withdrawal, and member tables convert into mobile card rows
- Dialogs behave better on phones and fit within the viewport
- Buttons and inputs use touch-friendly sizing
- Long emails, reasons, and amounts wrap safely instead of overflowing

To apply on GitHub Pages, replace your current repo files with this version, commit, and push. No new Supabase SQL migration is required for this mobile-only update if you already ran the member-management migration.
