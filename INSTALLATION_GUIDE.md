# FanPulse AI: Installation & Local Setup Guide

This document describes how to clone, install, configure, and boot the FanPulse AI application on Windows, macOS, or Linux.

---

## 1. Prerequisites
Before beginning, ensure you have the following installed:
- **Node.js**: v20 or newer
- **Python**: v3.11 or newer
- **Git**: (Optional) For cloning the repository

---

## 2. Step-by-Step Backend Setup

1. Open your terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the environment:
   - **Windows PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux/macOS**:
     ```bash
     source venv/bin/activate
     ```
4. Install python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Copy the configuration file:
   ```bash
   cp .env.example .env
   ```
6. Start uvicorn development server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

---

## 3. Step-by-Step Frontend Setup

1. Open a new terminal tab and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Create local env files:
   ```bash
   cp .env.example .env.local
   ```
4. Start Next.js development server:
   ```bash
   npm run dev
   ```
5. Navigate to `http://localhost:3000` in your web browser.
