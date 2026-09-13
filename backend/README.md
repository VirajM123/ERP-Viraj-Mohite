# Backend (Express + MongoDB)

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

# Local SQL backup conversion

Native SQL Server `.bak` files must be restored by SQL Server. To convert a
backup from the production website without uploading it to the hosted backend,
run this command on the Windows computer that has SQL Server and `sqlcmd`:

```powershell
npm install
npm run desktop-import-helper
```

The helper listens only on `127.0.0.1:5055`. Keep its terminal open, use
**Generate Excel** in the website, download the generated workbooks, and select
those workbooks in **Import generated Excel files**. Only the generated Excel
files are sent to production; the `.bak` remains on the local computer.
