# Docker Services for Toji TTS/STT

This directory contains the Docker Compose configuration and service definitions for:

- **Whisper Service** (STT) - Port 9000
- **Piper Service** (TTS) - Port 9001

## Files Structure

```
docker-services/
├── docker-compose.yml          # Orchestration configuration
├── whisper-service/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── service.py              # FastAPI service
│   ├── config.py
│   └── logger.py
└── piper-service/
    ├── Dockerfile
    ├── requirements.txt
    ├── service.py              # FastAPI service
    └── config.py
```

## Quick Start (Manual)

```bash
# Build and start services
cd resources/docker-services
docker-compose up -d

# Check health
curl http://localhost:9000/health
curl http://localhost:9001/health

# Stop services
docker-compose down
```

## Integration

The Electron app manages these services automatically via `DockerServiceManager`:

- Starts services on app launch
- Monitors health
- Stops services on app quit

## GPU Support

Uncomment the GPU section in docker-compose.yml if you have:

- NVIDIA GPU
- NVIDIA Container Toolkit installed
- Docker configured for GPU access

## Model Storage

Models are persisted in Docker volumes:

- `whisper-models`: Whisper AI models (~1-5GB)
- `piper-models`: Piper TTS voices (~50-200MB per voice)

First startup will download models (may take several minutes).
