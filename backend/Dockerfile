FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY pyproject.toml .

# Install dependencies
RUN uv sync --no-dev --no-install-project

COPY . .

CMD uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
