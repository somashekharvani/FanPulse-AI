FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source files
COPY backend/ /app

# Hugging Face Spaces and free runtimes default to port 7860
EXPOSE 7860
ENV PORT=7860

# Run uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
