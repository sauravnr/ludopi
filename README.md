# LudoPi

Real-time multiplayer Ludo game with matchmaking, chat, profiles, and Pi Network login.

## Features
- Real-time rooms (2P and 4P) with Socket.IO
- Email/password auth and Pi Network login
- Profiles, friends, private chat, notifications
- Rankings, inventory, store, wheel spins, VIP
- Avatar uploads to Cloudflare R2 (VIP only)
- PIP token deposits and withdrawals (optional)

## Tech Stack
- Frontend: React 19, Vite 6, Tailwind CSS, React Router, Socket.IO client
- Backend: Node.js, Express 5, MongoDB, Socket.IO

## Project Layout
- `src/` React app
- `public/` static assets
- `server/` API and Socket.IO server
- `fortestludodice.html` standalone 3D dice experiment

## Prerequisites
- Node.js 18+ and npm
- MongoDB (local or remote)

## Environment Variables

Frontend `.env`:
- `VITE_API_URL` example: `https://localhost:4000/api`

Backend `server/.env`:
Required:
- `MONGO_URI`
- `JWT_SECRET`

Optional:
- `PORT` (default 4000)
- `R2_API_ENDPOINT`
- `R2_PUBLIC_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_REGION`
- `R2_ENDPOINT`
- `BSCSCAN_API_KEY`
- `PIP_DEPOSIT_ADDRESS`
- `PIP_TOKEN_ADDRESS`
- `PIP_WITHDRAW_MAX`

## Local Development

1. Start backend
   PowerShell:
   ```powershell
   cd server
   npm install
   $env:NODE_ENV="development"
   npm start
   ```
   Backend runs at `https://localhost:4000`.

2. Start frontend
   PowerShell:
   ```powershell
   cd ..
   npm install
   npm run dev
   ```
   Frontend runs at `http://localhost:5173`.

## HTTPS in Dev (Important)
Auth cookies are set with `Secure` and `SameSite=None`. The backend must run on HTTPS in development. The server uses `server/localhost.pem` and `server/localhost-key.pem`. If your browser does not trust them, regenerate with mkcert and replace those files.

## Scripts
Frontend:
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

Backend:
- `npm start`

## Notes
- Room state is in memory in `server/roomStore.js`. Server restarts clear all rooms.

## License
TBD