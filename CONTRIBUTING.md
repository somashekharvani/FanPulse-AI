# Contributing to FanPulse AI

Thank you for your interest in contributing to FanPulse AI! We welcome bug reports, documentation updates, and pull requests.

---

## 1. Development Principles
Before submitting contributions, ensure that you adhere to our frozen stage architecture rules:
- **Incremental extension**: Extend features incrementally without changing core backend APIs or overwriting existing portals.
- **Strict Accessibility**: WCAG 2.1 Level AA compliance is mandatory for all UI additions.
- **Privacy-first Design**: Data tracking is opt-in only. Do not incorporate biometric scanning or CCTV-based face recognition.
- **Robust telemetries**: Ground recommendations in the Shared World Model.
- **Local fallbacks**: Ensure the entire application remains functional offline via local simulations.

---

## 2. Pull Request Guidelines
1. Fork the repository and create your branch from `main`.
2. Ensure backend automated tests pass by running `python -m pytest`.
3. Ensure frontend builds cleanly by running `npm run build`.
4. Document all changes in the `CHANGELOG.md` file.
