FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY server.py india_public_apis.json ./
RUN useradd -m app
USER app
CMD exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1
