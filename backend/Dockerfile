FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 1) Copy only requirements first for better caching
COPY requirements.txt /app/requirements.txt

# 2) Install Python deps
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

# 3) Copy rest of the repo
COPY . /app

# 4) Make sure entrypoint is executable
RUN chmod +x /app/entrypoint.sh || true

# 5) Non-root user
RUN useradd --create-home appuser || true
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
ENV PORT=8000

ENTRYPOINT ["/app/entrypoint.sh"]
