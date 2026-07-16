# FanPulse AI: Deployment Guide

This document describes how to deploy the Next.js frontend, FastAPI backend, and PostgreSQL database on various platforms.

---

## 1. Localhost Execution
For details on running frontend and backend locally with virtual environments and hot-reloading, read the [Installation Guide](file:///e:/FanPulse%20AI/INSTALLATION_GUIDE.md).

---

## 2. Docker Deployment
FanPulse AI includes a root-level `docker-compose.yml` to spin up both services locally under Docker containers.

### Steps:
1. Ensure Docker Desktop is installed and running.
2. Run command at the root of the project:
   ```bash
   docker-compose up --build
   ```
3. Access:
   - **Frontend**: `http://localhost:3000`
   - **Backend**: `http://localhost:8000`

---

## 3. Render Deployment (Backend & Database)
Render is recommended for hosting python backends and SQLite/PostgreSQL databases. We provide a **Render Blueprint (`render.yaml`)** to automate this:

1. Create a [Render Account](https://render.com).
2. Go to your dashboard and select **New +** ➔ **Blueprint**.
3. Link your GitHub repository (`FanPulse-AI`).
4. Review the blueprint. Render will automatically provision:
   - **FastAPI backend** (running on python env)
   - A persistent database volume.
5. Click **Apply**.
6. Copy your public backend URL from the service dashboard (e.g. `https://fanpulse-backend.onrender.com`).

---

## 4. Railway Deployment (Alternative Backend)
Railway is another excellent alternative:
1. Go to [Railway.app](https://railway.app).
2. Click **New Project** ➔ **Deploy from GitHub repo**.
3. Import your repository.
4. Add a **PostgreSQL** plugin database container.
5. Railway will automatically inject the `DATABASE_URL` environment variable.
6. Verify start commands under settings resolve to:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

---

## 5. Vercel Deployment (Frontend Next.js)
Vercel is the native platform for Next.js and hosts frontends out-of-the-box:

1. Create a [Vercel Account](https://vercel.com).
2. Click **Add New...** ➔ **Project**.
3. Import your `FanPulse-AI` repository.
4. Set the **Root Directory** to `frontend`.
5. Under **Environment Variables**, configure:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://<YOUR-RENDER-BACKEND-SUBDOMAIN>.onrender.com` (use the backend URL deployed in Step 3/4).
6. Click **Deploy**.
7. Vercel will build and output your public URL.

---

## 6. GitHub Remote Sync
To publish updates to your GitHub repository:
```bash
git add .
git commit -m "chore: configuration updates"
git push origin main
```
 Vercel and Render will automatically trigger new builds and redeploy your public URLs whenever changes are pushed to `main`.
