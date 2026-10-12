# CIVINEX — Government Welfare Scheme Assistant

CIVINEX is a web application designed to help users discover and explore Indian government welfare schemes. It provides a centralized interface for browsing scheme records, viewing scheme details, and accessing related assistance features.

> **Disclaimer:** CIVINEX is an independent project and is not an official government website. Always verify scheme eligibility, benefits, required documents, and application procedures through the relevant official government source.

## Features

- **Authentication:** User registration and login.
- **Government scheme catalogue:** Browse active schemes stored in PostgreSQL.
- **Search and filtering:** Search scheme names and descriptions; filter by government level and state/UT.
- **Scheme details:** View descriptions, categories, benefits, eligibility information, and official links where available.
- **Admin controls:** Admin-only scheme creation and role-aware interface controls.
- **Scheme documents:** Interface for accessing and managing scheme-related document records.
- **Dashboard:** Overview of application features.
- **AI Assistant:** Interface for scheme-related assistance, depending on the configured backend functionality.
- **Additional modules:** Eligibility, recommendations, applications, and Help Centre.
- **Responsive UI:** React/TypeScript frontend with theme support.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Validation | Pydantic |
| Authentication | JWT-based authentication |
| Icons | React Icons |
| Internationalization | react-i18next |
| Scheme data import | Python CSV importer |

## Project Structure

```text
CIVINEX/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   ├── data/
│   │   └── gov_myscheme_data.csv
│   ├── tests/
│   ├── import_schemes_csv.py
│   └── .env
└── frontend/
    ├── src/
    ├── package.json
    └── ...
```

The exact structure may differ slightly depending on the current project files.

## Prerequisites

- Python compatible with the backend dependencies
- Node.js LTS and npm
- PostgreSQL
- Git

## Local Setup

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd CIVINEX
```

Replace `<YOUR_REPOSITORY_URL>` with your actual repository URL.

### 2. Configure the database

Configure your existing PostgreSQL database and create `backend/.env` with the environment variables required by your backend.

Example configuration:

```dotenv
DATABASE_URL=postgresql+psycopg://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:5432/<DB_NAME>
SECRET_KEY=<YOUR_STRONG_RANDOM_SECRET>
```

These are example variable names. Check the project's configuration files to confirm the exact names expected by your code.

**Security:** Never commit `.env` files, database credentials, JWT secrets, or access tokens to Git.

### 3. Start the backend

Open a terminal:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux:**

```bash
source .venv/bin/activate
```

Install dependencies if `requirements.txt` exists:

```bash
pip install -r requirements.txt
```

Start FastAPI using the application's actual entry point. For example, if the entry point is `app.main:app`:

```bash
uvicorn app.main:app --reload
```

API documentation is commonly available at:

```text
http://127.0.0.1:8000/docs
```

### 4. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by the frontend development server, commonly:

```text
http://localhost:5173
```

Ensure the frontend API configuration points to the running backend.

## Scheme Dataset Import

CIVINEX uses a downloaded CSV dataset containing scheme records.

Expected file location:

```text
backend/data/gov_myscheme_data.csv
```

From the `backend` directory, run a read-only preview first:

```powershell
$env:PYTHONPATH = (Get-Location).Path
python import_schemes_csv.py --dry-run
```

After reviewing the output, the import command is:

```powershell
python import_schemes_csv.py
```

**Important:**
- The importer is intended to use the existing configured database.
- Back up the database before importing into production.
- Do not repeatedly import the same CSV without verifying duplicate handling.
- The dataset may not include every government scheme and may become outdated.
- Verify scheme information through official government sources.

## Production Deployment

The frontend, backend, and PostgreSQL database must be configured for the production environment.

### Backend deployment

1. Deploy the FastAPI application to a Python-compatible hosting service.
2. Configure the production database URL and secret values using the host's environment settings.
3. Configure the server to bind to the port supplied by the hosting platform.
4. Configure CORS to allow the deployed frontend's origin.
5. Ensure database tables or migrations are ready before serving requests.
6. Verify admin authentication and protected API endpoints.
7. Do not run the full CSV importer automatically during application startup.

A typical production start command, if the application entry point is `app.main:app`, is:

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Confirm your application's actual entry point and hosting provider's start-command requirements before using it.

### Frontend deployment

1. Install frontend dependencies.
2. Configure the production backend API URL using the environment-variable convention already supported by the project.
3. Build the frontend:

   ```bash
   npm run build
   ```

4. Deploy the generated build output to a static hosting provider.
5. Configure client-side routing if required by the hosting provider.

Never put server-side secrets in frontend environment variables.

### Database preparation

- Use the intended production PostgreSQL database.
- Back up existing records before imports or schema changes.
- Preserve existing scheme IDs and associated records.
- Verify scheme search, state filtering, authentication, and document access after deployment.
- Keep database credentials private.

## Testing Checklist

Before considering deployment complete, verify:

- [ ] User registration and login work.
- [ ] Admin-only operations require appropriate permissions.
- [ ] Schemes load from the database.
- [ ] Search and partial state filtering work.
- [ ] Telangana and other state/UT schemes can be found where present in the data.
- [ ] Scheme details and official links display correctly.
- [ ] Document-related functionality works as configured.
- [ ] Frontend requests use the deployed backend URL.
- [ ] CORS is configured for the deployed frontend.
- [ ] No secrets are exposed in the repository or frontend build.

## Scheme Data and Accuracy

The imported catalogue was sourced from a downloaded MyScheme-related CSV dataset. It should not be assumed to be a complete, official, or automatically updated list of every Central, State, and Union Territory scheme.

Users should confirm eligibility and application information on the relevant official government website.

## Security

- Do not commit `.env` files or secrets.
- Use strong production authentication secrets.
- Enable HTTPS in production.
- Restrict CORS to trusted frontend origins.
- Enforce authorization on the backend, not only in the frontend.
- Back up the database before data imports and schema changes.

## License

Add the license you choose for this project before publishing the repository publicly. Do not claim an open-source license unless one has been selected and included.
