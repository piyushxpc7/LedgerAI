# ── Backend ───────────────────────────────────────
FROM python:3.11-slim AS backend

WORKDIR /app

# Install system deps for psycopg2 and pikepdf
RUN apt-get update && apt-get install -y \
    gcc libpq-dev libgl1-mesa-glx libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create upload directory
RUN mkdir -p uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
