# Vocalyx Platform – Full README (convertible to PDF)

This document compiles project overview, tech stack, environment variables, local setup, deployment, and test credentials for the Vocalyx monorepo (backend + React/Vite frontend). Export to PDF as needed.

## 1) Repository layout
- `backend/` – Django REST API (`backend/backend/manage.py`, apps: `users`, `classrecord`, `notifications`, `speech_services`, `token_management`).
- `frontend_web/` – React 18 + Vite 6 SPA.
- `docs/` – feature and cloud integration guides (e.g., Firebase config, Sheets integration).
- Tooling: `Dockerfile`, `cloudrun.yaml`, `Procfile`, `deploy.sh` for backend deployment targets.

## 2) Tech stack (versions from code)

**Runtimes**
- Python `3.11.7` (`runtime.txt`)
- Node.js `22.x` / npm `9.x` (`frontend_web/package.json` engines)

**Backend (Django/DRF)**
- Core: Django `3.2.8`, DRF `3.12.4`, SimpleJWT `4.8.0`, django-cors-headers `3.10.0`, django-celery-beat `2.7.0`, drf-spectacular `0.28.0`
- Data/DB: psycopg2-binary, djongo `1.3.6`, pymongo `3.12.3`, dj-database-url `2.1.0`
- Tasks/infra: Celery `5.4.0`, gunicorn `21.2.0`, whitenoise `6.6.0`
- Google/Firebase: firebase-admin, google-auth, google-api-python-client, google-cloud-speech `2.23.0`
- Utilities: pandas `2.2.3`, openpyxl `>=3.0.0`, Pillow `>=9.0.0`, python-dotenv `1.0.1`, PyJWT `2.10.1`, pytz `2025.1`, python-Levenshtein `0.25.0`, unidecode `1.3.8`, scipy, fuzzywuzzy, requests, msal, cryptography

**Frontend (React/Vite)**
- Core: React `18.2.0`, React DOM `18.2.0`, Vite `6.1.0`, React Router `7.1.5`
- State/data: @tanstack/react-query `5.76.2`, axios `1.7.9`
- Auth: @react-oauth/google `0.12.2`, @azure/msal-browser `4.5.0`, @azure/msal-react `3.0.5`
- UI/UX: lucide `0.476.0`, lucide-react `0.476.0`, Radix UI avatar/checkbox `1.1.x`, tailwindcss `3.4.17`, react-hot-toast `2.5.2`, react-icons `5.4.0`
- Sheets/exports: @handsontable/react `12.3.1`, handsontable `12.3.1`, luckysheet `2.1.13`, react-spreadsheet `0.10.1`, xlsx `0.18.5`, html2canvas `1.4.1`, jspdf `3.0.1`, jspdf-autotable `5.0.2`, pdfmake `0.2.20`
- Voice/AI: microsoft-cognitiveservices-speech-sdk `1.44.1`, assemblyai `4.19.0`
- Tooling: serve `14.2.1`

**Frontend devDependencies**
- @vitejs/plugin-react `4.3.4`, @eslint/js `9.19.0`, eslint `9.19.0`, eslint-plugin-react `7.37.4`, eslint-plugin-react-hooks `5.0.0`, eslint-plugin-react-refresh `0.4.18`, @types/react `19.0.8`, @types/react-dom `19.0.3`, autoprefixer `10.4.20`, postcss `8.5.2`, tailwindcss `3.4.17`, globals `15.14.0`

## 3) Backend configuration
- `.env` location: `backend/backend/.env` (loaded in `settings.py`).
- Required core variables:
  - `SECRET_KEY`, `DEBUG` (`True` for local).
  - Database: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` (PostgreSQL; `DATABASE_URL` overrides all).
  - Email (SMTP): `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`.
  - JWT/security: no extra settings; tokens signed with `SECRET_KEY`.
  - Firebase Admin: `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string) or `firebase-service-account.json` file in repo root; optional `GOOGLE_APPLICATION_CREDENTIALS`.
  - Google Sheets/Drive: `GOOGLE_SHEETS_TEMPLATE_ID` (default provided), `GOOGLE_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` (JSON), `GOOGLE_APPS_SCRIPT_WEB_APP_URL`.
  - OAuth client IDs/secrets: `GOOGLE_OAUTH2_CLIENT_ID`, `GOOGLE_OAUTH2_CLIENT_SECRET`, `MICROSOFT_AUTH_CLIENT_ID`, `MICROSOFT_AUTH_CLIENT_SECRET`.
  - Token encryption: `GOOGLE_TOKEN_ENCRYPTION_KEY`.
- Services:
  - CORS whitelists prod hosts (`vocalyx.online`, Cloud Run URL, Vercel frontend); dev origins added when `DEBUG=true`.
  - Auth: Custom user (`email` as username), SimpleJWT via `CustomJWTAuthentication`.
  - Static files via WhiteNoise.
  - Celery beat scheduled task `token_management.tasks.cleanup_expired_tokens` (daily).

### Backend local setup
1) Prereqs: Python 3.11, PostgreSQL, virtualenv.
2) `cd backend`  
3) `python -m venv .venv && .venv\Scripts\activate` (Windows)  
4) `pip install -r requirements.txt` (pulls `backend/requirements.txt`).  
5) Create `backend/backend/.env` using variables above; ensure DB is reachable.  
6) Apply migrations: `python manage.py migrate`.  
7) Optional: create admin user `python manage.py createsuperuser`.  
8) Run dev server: `python manage.py runserver 0.0.0.0:8000`.

## 4) Frontend configuration
- Env file: `frontend_web/.env` with Firebase web config (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`). See `frontend_web/firebase-config-instructions.md` for console steps.
- Dev server: Vite at `http://localhost:5173` (hot reload).

### Frontend local setup
1) Prereqs: Node 22.x, npm 9.x.  
2) `cd frontend_web`  
3) `npm install`  
4) Ensure `.env` is populated.  
5) Start dev: `npm run dev -- --host --port 5173`  
6) Production build: `npm run build`; preview locally with `npm run preview -- --host --port 4173`.

## 5) Deployment

### Backend – Docker/Cloud Run (from repo root)
1) Build image: `docker build -t vocalyx-backend -f Dockerfile .`  
2) Run locally (example):  
   `docker run -p 8080:8080 --env-file backend/backend/.env vocalyx-backend`  
3) Google Cloud Run:  
   - Push image to GCR (set `PROJECT_ID`): `gcloud builds submit --tag gcr.io/$PROJECT_ID/vocalyx-backend`.  
   - Deploy: `gcloud run deploy vocalyx-backend --image gcr.io/$PROJECT_ID/vocalyx-backend --region <region> --allow-unauthenticated --port 8080 --set-env-vars DJANGO_SETTINGS_MODULE=backend.settings`.  
   - `cloudrun.yaml` mirrors these settings (containerPort 8080, 512Mi, concurrency 80).  
4) Heroku-style: `Procfile` uses `gunicorn backend.wsgi:application` from `backend/backend/`.

### Frontend – Static hosting / Vercel
1) Build: `cd frontend_web && npm run build` (outputs to `dist/`).  
2) Any static host (Vercel/Netlify/S3/CloudFront): serve `dist/` as SPA; include rewrite to `index.html` (see `frontend_web/vercel.json`).  
3) Configure env vars in hosting platform matching `.env` keys.  
4) Set backend API base URL in the frontend services (e.g., axios clients) to your deployed API domain.

## 6) Sample / dummy credentials
- The project does **not** ship seeded users. Create real accounts via registration or Django admin.
- Dummy email/password used in automated test scenarios: `test@example.com` / `testpassword123` (can be used for staging smoke tests after creating such a user in the DB).
- Requested admin dummy user (create this account in your DB for testing): `neighbornet0@gmail.com` / `Admin-123`.
- Admin access: create via `python manage.py createsuperuser` (choose your own email/password).
- OAuth logins: use Google/Microsoft test accounts configured in your Firebase/Google Cloud and Azure App registrations; no hard-coded client secrets are stored in the repo.

## 7) Operational notes
- Database: PostgreSQL with SSL required in production; `DATABASE_URL` supported for platforms like Heroku.  
- Static files: collected during Docker build via `python manage.py collectstatic --noinput`.  
- Security: restrict `ALLOWED_HOSTS` and CORS lists in production; keep `DEBUG` false.  
- Background tasks: Celery beat schedule is defined; ensure a broker (e.g., Redis) is configured if enabling Celery workers (not included in Dockerfile).  
- Google Sheets integration: template ID defaults to `1h-dR0ergnvgqxXsS6nLFb7lAthuoJ5MVKya4NbYHT2c` and can be overridden via `.env`.  
- Voice/AI: Google Cloud Speech SDK is installed; `assemblyai` and `microsoft-cognitiveservices-speech-sdk` are available on the frontend for voice recognition.

## 8) Quick start (development)
```bash
# Backend
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# Frontend
cd ../frontend_web
npm install
npm run dev -- --host --port 5173
```

## 9) Exporting this README to PDF
- From VS Code/Cursor: install a Markdown-to-PDF extension or run `npx md-to-pdf README_FULL.md`.  
- Or upload the markdown to GitHub and use browser print-to-PDF.

