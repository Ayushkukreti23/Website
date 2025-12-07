# Ayush Webpage – Full‑Stack Auth App

A React + Vite client and Express + MongoDB API with JWT auth via HTTP‑only cookies, signup/login, Forgot Password, and an optional n8n signup webhook.

## Project Structure
- `client/` React app (Vite)
- `server/` Express API (Mongoose, JWT)

## Getting Started
1. Install deps
   - `cd server && npm install`
   - `cd ../client && npm install`
2. Configure env (`server/.env`)
   - `PORT=5000`
   - `MONGODB_URI=mongodb://127.0.0.1:27017/auth_demo`
   - `JWT_SECRET=<strong-secret>`
   - `CLIENT_ORIGIN=http://localhost:5173`
   - `N8N_WEBHOOK_URL=<optional n8n webhook URL>`
3. Run
   - API: `cd server && npm run dev`
   - Client: `cd client && npm run dev` then open `http://localhost:5173`

## Features
- Signup/Login with JWT cookie
- Dashboard shows user profile
- Forgot Password: request reset code, then reset
- Optional n8n webhook on signup

## API (server)
- `POST /api/auth/signup` { name, lastName?, mobile?, email, password }
- `POST /api/auth/login` { email, password }
- `GET /api/auth/me` returns current user
- `POST /api/auth/logout` clears auth cookie
- `POST /api/auth/forgot` { email } → reset code
- `POST /api/auth/reset` { email, token, password }

## Frontend (client)
- Pages: Signup, Login, Forgot Password, Dashboard
- Axios client uses `VITE_API_URL` or `http://localhost:5000`

## Security
- Secrets are never committed. `.env` files are ignored by Git.

## Deploy (quick notes)
- Client: build with `npm run build` and deploy `client/dist`
- Server: run `npm run start` on a Node host; set env vars
- Set `CLIENT_ORIGIN` to deployed client URL; set `VITE_API_URL` to deployed API URL

## GitHub Push
1. Initialize: `git init` (at project root)
2. Add files: `git add .`
3. Commit: `git commit -m "Initial commit: full-stack app"`
4. Create repo on GitHub (empty) and add remote:
   - `git branch -M main`
   - `git remote add origin https://github.com/<your-username>/<repo>.git`
5. Push: `git push -u origin main`
