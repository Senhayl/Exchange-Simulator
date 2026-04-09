# Exchange Front + API

## Local setup

1. Install deps:

   npm run install:all

2. Start backend API (port 3002):

   npm run dev:backend

3. Start frontend Vite (port 5173):

   npm run dev:frontend

Frontend proxies `/api` to `http://localhost:3002`.

## Build + production

1. Build frontend:

   npm run build

2. Start backend (serves API and tries to serve `frontend/dist`):

   npm start

## Railway

- Root directory: repository root
- Build command:

  npm run install:all && npm run build

- Start command:

  npm start

- Environment:

  PORT is provided by Railway automatically.
