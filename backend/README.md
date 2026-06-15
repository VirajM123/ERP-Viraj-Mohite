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

