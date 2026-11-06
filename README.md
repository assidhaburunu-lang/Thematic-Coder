# Thematic Coder

A web app for qualitative coding of interview transcripts in **Dhivehi (Thaana) and English**. Several people can code at the same time.

- **Accounts:** people sign up with just a **name and password**. The owner approves each sign-up.
- **Access:** the owner decides, project by project, who can **code** and who can only **view**.
- **Coding:** upload Word (`.docx`) or `.txt` transcripts, select text, and attach one or more codes. You can add memos and see who coded each segment.
- **Themes:** drag codes into themes and sub-themes.
- **Theme map:** a mind map, tree or top-down chart, downloadable as PNG or SVG.
- **Exports:** a Word thematic report, coded segments and codebook as CSV files (open in Excel, Thaana included), and project backups.
- **Live collaboration:** everyone's changes appear within about 2 seconds. You can see who's online and which document they're in, and their text selection is outlined.

It runs on **Vercel with a free Neon Postgres database**, or on any computer or server with Node.js.

---

## Deploy on Vercel (free)

Vercel doesn't keep files between requests, so the app stores everything in a **Postgres database**. Neon has a free plan and connects to Vercel in a few clicks.

1. **Put the code on GitHub.** Upload this folder to a GitHub repository (see *Uploading to GitHub* below). If you already deployed an older version, replace all the files in your repository with these.
2. **Import it in Vercel.** Go to **Add New → Project** and pick the repository.
   - Leave **Framework Preset** as **Other**.
   - Leave the build and output settings empty; `vercel.json` sets them.
   - Click **Deploy**. The first deploy shows a "Setup needed" message until the database is connected. That's expected.
3. **Add the database.** In your Vercel project, open **Storage** and click **Create Database**.
   - Choose **Neon (Serverless Postgres)**, accept the free plan and pick a region close to you (e.g. Singapore or Mumbai for the Maldives).
   - **Connect it to this project** for all environments. This adds `DATABASE_URL` automatically.
4. **Redeploy.** Go to **Deployments**, open the ⋯ menu on the latest deployment and choose **Redeploy**. The database tables are created automatically on first use.
5. **Create the owner account straight away.** Open your site (e.g. `https://thematiccoder.vercel.app`). You'll land on the log-in page. **Sign up first**: the first account becomes the owner, and everyone after that needs your approval.

### Things to know on Vercel

- **Live updates:** each open browser tab checks for changes every 2 seconds (every 5 seconds when idle or in the background). A class of 30 for one hour is roughly 50,000 small requests. Keep an eye on **Usage** in Vercel and Neon; the free plans cover normal classroom use.
- **Transcript size:** single transcripts up to about 3 MB of text upload fine (that's hundreds of pages).
- **Database backups:** Neon keeps its own restore history. You can also download your data from **Admin → Download backup of all projects**.

## Sign in with Google (Gmail)

People can sign in with their Google/Gmail account instead of making a password. They still need your approval, and you still choose their project access. To switch it on:

1. **Create a project.** Go to <https://console.cloud.google.com/>, sign in with your Google account, and create a project, e.g. "Thematic Coder".
2. **Set up the consent screen.** Open **APIs & Services → OAuth consent screen** (also called **Google Auth Platform → Branding**).
   - Choose **External**.
   - Enter an app name ("Thematic Coder") and your email.
   - Only the basic scopes are needed: `openid`, `email` and `profile`.
   - Under **Audience**, click **Publish app** so that any Gmail user can sign in. While it's in *Testing*, only the test users you list can sign in. These basic scopes don't need Google's verification.
3. **Create the OAuth client.** Open **Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - **Authorised redirect URI:** `https://thematiccoder.vercel.app/api/auth/google/callback`. Use your own address if it's different. For local testing, also add `http://localhost:3000/api/auth/google/callback`.
   - Click **Create** and copy the **Client ID** and **Client secret**.
4. **Add the settings in Vercel.** Go to **Settings → Environment Variables** and add:
   - `GOOGLE_CLIENT_ID` = the client ID
   - `GOOGLE_CLIENT_SECRET` = the client secret
   - *(optional)* `GOOGLE_ALLOWED_DOMAINS` = e.g. `school.edu.mv`, to only allow your institution's Google accounts
5. **Redeploy.** A **Continue with Google** button appears on the log-in page.

**Already have a password account?** Log in as usual, then choose **your name → Connect Google account**. From then on you can sign in either way.

People who joined with Google can add a password later from **your name → Set a password**. The owner sees each person's email address in **Admin**, so you can tell who's who before approving them.

If Google says *"redirect_uri_mismatch"*, the address in step 3 doesn't exactly match your site. Either fix it in Google Cloud, or set `PUBLIC_URL` (e.g. `https://thematiccoder.vercel.app`) in Vercel.

## Run it on your own computer

You need **Node.js 20.12 or newer** (Node 24 LTS recommended).

```bash
npm install
npm start
```

Open <http://localhost:3000> and sign up. The first account becomes the owner.

With no `DATABASE_URL` set, the app uses a **built-in database** stored in the `data/` folder. There's nothing else to install.

## Other hosting: a server with Docker

On any Linux server (DigitalOcean, Hetzner, your institution's server…):

1. Point your domain at the server.
2. Replace `coder.example.com` in `Caddyfile` with your domain.
3. Run `docker compose up -d`.

Caddy sets up HTTPS automatically. Data is kept in `./data`. To use a Postgres database instead, set `DATABASE_URL`.

## Daily use

1. **Owner:** create a project, or add the sample project, and upload transcripts.
2. **Members:** share the sign-up address, `https://your-site/login`. Each person signs up with a name and password.
3. **Owner:** open **Admin**, approve the sign-ups, then use **Project access** to choose *View* or *Code* for each person in each project.
   - **Everyone → Code** gives a whole class access in one click.
4. Everyone with *Code* access can work in the project at the same time.
   - Removing someone's access closes the project on their screen within a few seconds.
   - Turn off **Allow new sign-ups** once everyone is registered.

**Forgotten passwords:**
- **A member:** use **Admin → People → Reset password** and tell them the new one.
- **The owner:** run this from a computer with the code. On Vercel, copy `DATABASE_URL` from **Settings → Environment Variables** first.

  ```bash
  DATABASE_URL="postgres://…" npm run reset-password -- "Your Name" "a-new-password" --owner
  ```

## Settings

| Variable | Default | What it does |
|---|---|---|
| `DATABASE_URL` | *(empty)* | Postgres connection string. Required on Vercel (Neon adds it). Empty means the built-in database |
| `DATA_DIR` | `./data` | Folder for the built-in database |
| `PORT` | `3000` | Port for the standalone server |
| `TRUST_PROXY` | `0` | Set to `1` behind a reverse proxy that handles HTTPS. Automatic on Vercel |
| `SESSION_DAYS` | `30` | How long people stay logged in |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | *(empty)* | Turn on "Continue with Google" (see above) |
| `GOOGLE_ALLOWED_DOMAINS` | *(empty)* | Only allow Google accounts from these email domains, e.g. `school.edu.mv` |
| `PUBLIC_URL` | *(automatic)* | Your site's address, if Google sign-in needs it set explicitly |

## Security notes

- **Passwords:** hashed with scrypt.
- **Google sign-in:** uses Google's standard OpenID Connect flow, with state, nonce and PKCE checks. The app never sees Google passwords.
- **Logins:** use an HTTP-only, same-site cookie. Log-in and sign-up attempts are rate-limited.
- **Access checks:** the server checks project access on every request. Members only receive projects they've been given, and view-only members can't change anything.
- **HTTPS:** always use HTTPS. Vercel and the Docker/Caddy setup provide it automatically.
- **Sensitive data:** for confidential research data, check your institution's rules about where data may be stored, including which database region you choose.

## Project layout

```
api/index.js         Vercel function: receives every /api request
lib/app.js           accounts, permissions, project data, live sync
lib/db.js            database tables; Postgres (DATABASE_URL) or the built-in database
public/              the app itself: index.html, app.js, login.html, login.js, vendor/
local-server.js      standalone server (own computer / Docker) — not used on Vercel
vercel.json          Vercel settings
scripts/reset-password.js
Dockerfile, docker-compose.yml, Caddyfile
```

## Uploading to GitHub

1. Create a repository on GitHub. **Private** is fine.
2. Upload the files in either of two ways:
   - **In the browser:** **Add file → Upload files**, then drag in **everything inside** this folder. The repository's top level should show `api`, `lib`, `public`, `package.json`, `vercel.json` and so on.
   - **From the command line:** `git init && git add . && git commit -m "Thematic Coder" && git push`, after adding your GitHub remote.

Don't upload `node_modules/` or `data/`. The included `.gitignore` already leaves them out.
