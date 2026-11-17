FROM python:3.14-alpine
WORKDIR /app
COPY requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "8", "app:app"]