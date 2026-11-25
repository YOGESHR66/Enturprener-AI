# EntrepreneurAI — AI-Powered Startup Recommendation Platform

EntrepreneurAI helps students, graduates, and aspiring entrepreneurs discover tailored startup opportunities, evaluate market dynamics, model financial projections, generate structured business plans, track launch roadmaps, explore verified Indian government schemes, and consult **VentureBot** powered by Google Gemini.

## Architecture & Project Structure

- `frontend/` — Vanilla HTML5, CSS3, and modular ES6 JavaScript (`Chart.js` + `jsPDF`), served by Nginx in Docker (`frontend/Dockerfile`).
- `backend/` — Python FastAPI REST API with Motor (async MongoDB), `bcrypt` password hashing, JWT authentication, and `google-genai` (`gemini-4-hydrogen`).
- `server.ts` — Integrated preview server for single-process Node/Vite environments, providing identical API endpoints and Gemini integration.
- `docker-compose.yml` — Multi-container orchestration for **MongoDB**, **FastAPI**, and **Nginx Frontend**.

## Setup & Running with Docker (Windows 11)

1. **Install Docker Desktop on Windows 11**
   - Download and install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
   - Ensure **WSL 2** is enabled (Docker Desktop prompts for this during setup) and wait until Docker Desktop displays **Engine running**.

2. **Configure Environment Variables**
   - Open **PowerShell** or **Windows Terminal** inside the project folder (`EntrepreneurAI`).
   - Copy `.env.example` to `.env`:
     ```powershell
     Copy-Item .env.example .env
     ```
   - Open `.env` in Notepad or VS Code and set your `GEMINI_API_KEY` (and optionally a strong random `JWT_SECRET`):
     ```env
     GEMINI_API_KEY=your_google_gemini_api_key_here
     JWT_SECRET=replace_with_a_long_random_secret_string
     ```

3. **Build and Launch All Services**
   ```powershell
   docker compose up --build
   ```

4. **Access the Application**
   - **Web App (Frontend):** [http://localhost:8080](http://localhost:8080)
   - **FastAPI Interactive Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **MongoDB:** `mongodb://localhost:27017`

5. **Stop Containers**
   ```powershell
   docker compose down
   ```
   *(Add `-v` only if you want to wipe the persistent MongoDB volume.)*

## Deploying on Vercel

1. Import this repository into Vercel (framework preset: **Vite**).
2. Add `GEMINI_API_KEY` (and optionally `JWT_SECRET`) in **Project Settings → Environment Variables**.
3. Deploy — Vercel automatically builds the static frontend (`dist/`) and mounts the Express backend routes via `/api/*` serverless functions (`vercel.json`). Note: serverless `/tmp` storage is ephemeral across cold starts; for durable production persistence, run with Docker Compose + MongoDB.

