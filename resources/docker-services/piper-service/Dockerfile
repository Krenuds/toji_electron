# Multi-stage build for production Piper TTS service
# Piper TTS runs efficiently on CPU and doesn't require GPU acceleration like Whisper
# Using Python 3.11 on Ubuntu 22.04 for compatibility and performance

# Stage 1: Build environment for dependencies
FROM python:3.11-slim-bullseye AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    pkg-config \
    libffi-dev \
    libssl-dev \
    cmake \
    wget \
    ca-certificates \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and install build tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy requirements and install Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Pre-download and cache a default voice model to avoid startup delays
# This reduces first-request latency in production
RUN mkdir -p /opt/models/piper && \
    python -c "import urllib.request; import os; model_url = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx'; config_url = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json'; urllib.request.urlretrieve(model_url, '/opt/models/piper/en_US-lessac-medium.onnx'); urllib.request.urlretrieve(config_url, '/opt/models/piper/en_US-lessac-medium.onnx.json'); print('Default voice model cached successfully')"

# Stage 2: Runtime environment
FROM python:3.11-slim-bullseye

# Install runtime dependencies for audio processing and HTTP clients
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    libsndfile1 \
    libsndfile1-dev \
    portaudio19-dev \
    alsa-utils \
    espeak-ng \
    espeak-ng-data \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy cached voice models from builder
COPY --from=builder /opt/models /opt/models

# Create non-root user for security
RUN groupadd --gid 1001 piper && \
    useradd --uid 1001 --gid piper --shell /bin/bash --create-home piper

# Create directories with proper permissions
RUN mkdir -p /app/models/piper /app/logs /app/tmp && \
    chown -R piper:piper /app /opt/models && \
    chmod 755 /app

# Set working directory
WORKDIR /app

# Copy application code with proper ownership
COPY --chown=piper:piper service.py /app/
COPY --chown=piper:piper config.py /app/
COPY --chown=piper:piper start.py /app/

# Copy cached models to app directory
COPY --from=builder --chown=piper:piper /opt/models/piper /app/models/piper/

# Switch to non-root user
USER piper

# Set Python path to find local modules
ENV PYTHONPATH=/app

# Environment variables for production
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIPER_PORT=9001
ENV PIPER_HOST=0.0.0.0
ENV PIPER_MODELS_DIR=/app/models/piper
ENV PIPER_DEFAULT_VOICE=en_US-lessac-medium
ENV LOG_LEVEL=INFO
ENV PIPER_LOG_FILE=/app/logs/piper-service.log
ENV PIPER_MAX_TEXT_LENGTH=10000
ENV PIPER_MAX_CONCURRENT=10
ENV PIPER_MODEL_CACHE_SIZE=5

# Disable parallelism for tokenizers to avoid memory issues
ENV TOKENIZERS_PARALLELISM=false

# Health check - verify the service is responding and can load models
HEALTHCHECK --interval=30s --timeout=15s --start-period=45s --retries=3 \
    CMD curl -f http://localhost:9001/health | grep -q '"status":"healthy"' || exit 1

# Expose service port
EXPOSE 9001

# Use exec form for proper signal handling
CMD ["python", "service.py"]
