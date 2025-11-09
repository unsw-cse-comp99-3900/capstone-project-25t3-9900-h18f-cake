FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgl1 \
    libgomp1 \
    tesseract-ocr \
    tesseract-ocr-chi-sim \
    tesseract-ocr-chi-tra \
    poppler-utils \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir poetry
COPY backend/pyproject.toml backend/poetry.lock* ./backend/
COPY backend/app ./backend/app
COPY backend/README.md ./backend/README.md
COPY AI ./AI

WORKDIR /app/backend

RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root
WORKDIR /app/AI
RUN pip install --no-cache-dir -r requirements.txt

WORKDIR /app
COPY backend ./backend
COPY AI ./AI
WORKDIR /app/backend
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
