# FanPulse AI: Testing & Verification Guide

This guide describes how to execute automated test suites and verify code compliance in the FanPulse AI Operating System.

---

## 1. Backend Automated Tests
Backend testing is driven by `pytest` and checks authentication routers, token rotation, database state updates, and agent orchestrators.

### Executing pytest
1. Navigate to `/backend`.
2. Ensure your virtual environment is active:
   ```bash
   # Windows
   .\venv\Scripts\activate
   # Linux/macOS
   source venv/bin/activate
   ```
3. Run test runner:
   ```bash
   python -m pytest
   ```

---

## 2. Frontend Build Verification
Frontend validation is driven by TypeScript type compilation and Next.js static page checks.

### Executing Next.js Build Check
1. Navigate to `/frontend`.
2. Run npm production build compilation:
   ```bash
   npm run build
   ```
   *Ensure that the compilation completes with zero errors and all pages prerender successfully.*
