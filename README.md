# Clamason OEE Dashboard

Production & Maintenance Performance PWA built with Node.js + Express + Neon PostgreSQL.

## Setup

### 1. Copy node_modules
Copy these folders from an existing project's `node_modules`:
- express
- cors
- dotenv
- multer
- pg
- xlsx

### 2. Environment
Copy `.env.example` to `.env` and fill in your Neon connection string:
```
DATABASE_URL=postgresql://...
PORT=3011
```

### 3. Run locally
```cmd
node server.js
```
Open http://localhost:3011

### 4. Deploy to Render
- Push to GitHub
- New Web Service on Render → connect repo
- Environment variable: `DATABASE_URL`
- Start command: `node server.js`

## Weekly Monday Workflow
1. Export SFC weekly XLS → go to Upload tab → upload with label "Wk 16"
2. Export Agility AG3-601 quarterly → go to Upload tab → upload with period label

## Stack
- Node.js / Express
- Neon PostgreSQL (pg)
- Multer (file uploads)
- SheetJS/xlsx (XLS parsing)
- Vanilla JS PWA (no framework)
 
