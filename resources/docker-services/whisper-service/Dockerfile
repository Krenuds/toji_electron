# Multi-stage build for production Whisper service with GPU acceleration
# Base on NVIDIA CUDA runtime for GPU support with Python 3.11

# Stage 1: Build environment for dependencies
FROM ubuntu:22.04 AS builder

# Install system dependencies and Python 3.11
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3.11-venv \
    python3-pip \
    build-essential \
    gcc \
    g++ \
    cmake \
    pkg-config \
    libffi-dev \
    libssl-dev \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python3.11 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and install build tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy requirements and install Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Pre-download common Whisper models to cache them
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='float32')"

# Stage 2: Runtime environment
FROM ubuntu:22.04

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy pre-downloaded models from builder
COPY --from=builder /root/.cache/huggingface /root/.cache/huggingface

# Create non-root user for security
RUN groupadd --gid 1001 whisper && \
    useradd --uid 1001 --gid whisper --shell /bin/bash --create-home whisper

# Create directories with proper permissions
RUN mkdir -p /app/logs /app/tmp /app/models && \
    chown -R whisper:whisper /app && \
    chmod 755 /app

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=whisper:whisper service.py /app/
COPY --chown=whisper:whisper config.py /app/
COPY --chown=whisper:whisper logger.py /app/

# Switch to non-root user
USER whisper

# Set Python path to find local modules
ENV PYTHONPATH=/app

# Environment variables for production
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV WHISPER_PORT=9000
ENV WHISPER_HOST=0.0.0.0
ENV CUDA_VISIBLE_DEVICES=0
ENV TORCH_CUDNN_V8_API_DISABLED=1
ENV TOKENIZERS_PARALLELISM=false

# Add cuDNN libraries to library path for GPU acceleration
ENV LD_LIBRARY_PATH="/opt/venv/lib/python3.11/site-packages/nvidia/cudnn/lib:/opt/venv/lib/python3.11/site-packages/ctranslate2.libs:${LD_LIBRARY_PATH}"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

# Expose service port
EXPOSE 9000

# Use exec form for proper signal handling
CMD ["python", "service.py"]
