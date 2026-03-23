# TavolaPerfetta

Restaurant management dashboard with multi-location support, HACCP compliance, and supplier management.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS, @base-ui/react
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL
- **OCR**: Google Gemini AI

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (recommended) or PostgreSQL 16

### 1. Backend

**Option A: Docker (recommended)**

```bash
cd backend
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

docker compose up -d
python seed.py  # seed sample data
```

**Option B: Local**

```bash
cd backend

# Create virtualenv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Setup Postgres
createdb tavolaperfetta

# Configure env
cp .env.example .env
# Edit .env: DATABASE_URL, GEMINI_API_KEY

# Run
uvicorn app.main:app --reload
```

API runs at http://localhost:8000
Docs at http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

App runs at http://localhost:3000

## Project Structure

```
tavolaperfetta/
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── routers/        # API endpoints
│   ├── docker-compose.yml
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/            # Next.js pages
    │   ├── components/     # React components
    │   └── lib/            # Utils, API client
    └── package.json
```

## Features

- Supplier management with delivery tracking
- Invoice processing with Gemini OCR (Bolla)
- HACCP checklists
- Inventory management
- Multi-location support
