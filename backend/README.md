# Backend (Express + MongoDB)

## Browser sessions
Browser login requests use `X-ERP-Browser: 1` and an explicitly allowed Origin.
They receive an HttpOnly, SameSite=Lax cookie (Secure in production) and a
session-bound CSRF value. The browser sends that value as `X-CSRF-Token` on
state-changing calls. Sessions expire after eight hours and logout deletes only
the current browser session. Account session-version changes and disabled users
still invalidate all of that account's sessions. MongoDB must permit creation of
the `Sys_BrowserSession` TTL index. Session records contain bearer credentials and
must be protected with the same access controls as credentials.

Configure `CORS_ORIGINS` with exact frontend origins and use HTTPS. Lax cookies
require a same-site frontend/API topology; the configured origins alone do not
establish this. Confirm the actual production hostnames, scheme, reverse proxy,
and browser cookie behavior before deployment. Local development uses
`http://localhost:5173` and `http://localhost:5000` (same site, different ports).
The SPA clears its legacy local token and requires users to sign in again. Old
bearer tokens expire after at most eight hours; set `REJECT_BROWSER_BEARER=true`
at cutover to reject bearer requests carrying an Origin, after checking browser
integrations. External non-browser clients retain bearer login and authorization;
their inventory and migration are deployment prerequisites. This setting does not
distinguish clients that omit Origin, and existing stolen bearer tokens therefore
remain valid until expiry or an authorized account-wide session-version change.

## Legacy password migration
Back up the database first. With the production connection configured securely,
run `node backend/scripts/migrateLegacyPasswords.js` to count legacy passwords,
then repeat with `--apply` to hash eligible passwords and revoke existing sessions.
Missing, malformed bcrypt-like, and passwords over bcrypt's 72-byte limit require
an administrator-led reset. Repeat the dry run after applying and resetting;
only when both `legacy` and `requiresReset` are zero for each collection, set
`BCRYPT_ONLY=true` in the deployment and restart the API. The apply step changes
session versions for migrated accounts, so authorize and schedule it separately.
The counts cover active records only and never contain credential values.

## Setup
1. Install deps:
   ```bash
   npm i express mongoose cors bcryptjs dotenv
   ```

2. Create env file (copy):
   ```bash
   cp backend/.env.example .env
   ```
   Then set `MONGO_URI`.

3. Run server:
   ```bash
   node backend/server.js
   ```

## Endpoints
- `POST /api/register`
- `POST /api/login`
- `GET /health`

