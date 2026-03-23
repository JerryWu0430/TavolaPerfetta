# TavolaPerfetta Backend

FastAPI + PostgreSQL backend for restaurant management.

## Setup

### Option 1: Docker (Recommended)

```bash
cd backend
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- FastAPI on port 8000

### Option 2: Local Development

1. Install [uv](https://docs.astral.sh/uv/) and PostgreSQL:
```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create database
createdb tavolaperfetta
```

2. Install dependencies:
```bash
cd backend
uv sync
```

3. Copy environment file:
```bash
cp .env.example .env
# Edit .env with your database URL and Gemini API key
```

4. Run server:
```bash
uv run uvicorn app.main:app --reload
```

## Seed Database

```bash
uv run python seed.py
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

| Resource | Methods | Description |
|----------|---------|-------------|
| `/suppliers` | GET, POST, PATCH, DELETE | Supplier management |
| `/products` | GET, POST, PATCH, DELETE | Product catalog |
| `/deliveries` | GET, POST, PATCH, DELETE | Delivery tracking |
| `/invoices` | GET, POST, PATCH, DELETE | Invoice management |
| `/inventory` | GET, PATCH, POST | Stock levels |
| `/haccp/templates` | GET, POST, PATCH, DELETE | HACCP checklist config |
| `/haccp/checklists` | GET, POST | Daily HACCP records |
| `/locations` | GET, POST, DELETE | Restaurant locations |
| `/ocr/invoice` | POST | Gemini OCR for invoices |
