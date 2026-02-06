# LudoPi Backend

Express + MongoDB API with Socket.IO for real-time gameplay.

## Setup
PowerShell:
```powershell
npm install
$env:NODE_ENV="development"
npm start
```

## Key Files
- `index.js` server and Socket.IO
- `routes/` API endpoints
- `models/` Mongoose models
- `roomStore.js` in-memory room state

## Environment Variables
Required:
- `MONGO_URI`
- `JWT_SECRET`

Optional:
- `PORT`
- `R2_*` for avatar uploads
- `BSCSCAN_API_KEY`, `PIP_DEPOSIT_ADDRESS`, `PIP_TOKEN_ADDRESS`, `PIP_WITHDRAW_MAX` for PIP features