FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# psycopg2-binary bundles libpq so no extra apt needed
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pipeline ./pipeline
COPY scripts  ./scripts

# Default: run the APScheduler daemon
CMD ["python", "scripts/run_pipeline.py", "scheduler"]
