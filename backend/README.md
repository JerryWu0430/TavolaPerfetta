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

1. Install PostgreSQL and create database:
```bash
createdb tavolaperfetta
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy environment file:
```bash
cp .env.example .env
# Edit .env with your database URL and Gemini API key
```

5. Run server:
```bash
uvicorn app.main:app --reload
```

## Seed Database

```bash
python seed.py
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
