"""
Piper TTS HTTP Service

A production-ready FastAPI service for text-to-speech using Piper TTS.
This service converts the embedded Piper client library into a RESTful HTTP API.
"""

import asyncio
import io
import os
import logging
from pathlib import Path
from typing import Optional, Dict, List, Any
import urllib.request
import wave
import json

from fastapi import FastAPI, HTTPException, Response, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import piper
import uvicorn

from config import ServiceConfig, EXTENDED_VOICE_CATALOG, setup_logging


# Request/Response models
class TTSRequest(BaseModel):
    """Request model for text-to-speech generation."""
    text: str = Field(..., description="Text to convert to speech", min_length=1, max_length=10000)
    voice: Optional[str] = Field(None, description="Voice model to use (defaults to service default)")
    speed: Optional[float] = Field(1.0, description="Speech speed multiplier", ge=0.5, le=2.0)


class VoiceInfo(BaseModel):
    """Information about an available voice."""
    name: str
    language: str
    speaker: str
    quality: str
    sample_rate: int
    gender: str
    file_size_mb: Optional[float] = None
    available: bool = True


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    voice_models_loaded: int
    default_voice: str
    models_directory: str


class DownloadVoiceRequest(BaseModel):
    """Request to download a new voice model."""
    voice_name: str = Field(..., description="Voice name to download (e.g., en_US-lessac-medium)")
    language: str = Field("en", description="Language code")
    country: str = Field("US", description="Country code")  
    speaker: str = Field("lessac", description="Speaker name")
    quality: str = Field("medium", description="Quality (low/medium/high)")


# Global state
config = ServiceConfig()
voice_models: Dict[str, piper.PiperVoice] = {}
app = FastAPI(
    title="Piper TTS Service",
    description="HTTP API for Piper text-to-speech synthesis",
    version="1.0.0"
)

# Setup logging
logger = setup_logging(config)


# Use extended voice catalog from config
VOICE_CATALOG = EXTENDED_VOICE_CATALOG


async def download_voice_model(voice_name: str) -> tuple[str, str]:
    """Download a voice model if it doesn't exist."""
    if voice_name not in VOICE_CATALOG:
        raise HTTPException(status_code=404, detail=f"Voice '{voice_name}' not found in catalog")
    
    model_path = config.models_dir / f"{voice_name}.onnx"
    config_path = config.models_dir / f"{voice_name}.onnx.json"
    
    if model_path.exists() and config_path.exists():
        logger.info(f"Voice model already exists: {voice_name}")
        return str(model_path), str(config_path)
    
    logger.info(f"Downloading voice model: {voice_name}")
    voice_info = VOICE_CATALOG[voice_name]
    base_url = voice_info["base_url"]
    
    try:
        # Download model file
        if not model_path.exists():
            model_url = f"{base_url}/{voice_name}.onnx"
            logger.info(f"Downloading model from {model_url}...")
            urllib.request.urlretrieve(model_url, str(model_path))
            logger.info(f"Model downloaded: {model_path}")
        
        # Download config file  
        if not config_path.exists():
            config_url = f"{base_url}/{voice_name}.onnx.json"
            logger.info(f"Downloading config from {config_url}...")
            urllib.request.urlretrieve(config_url, str(config_path))
            logger.info(f"Config downloaded: {config_path}")
            
        return str(model_path), str(config_path)
            
    except Exception as e:
        logger.error(f"Failed to download voice model {voice_name}: {e}")
        # Clean up partial downloads
        for path in [model_path, config_path]:
            if path.exists():
                path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to download voice model: {str(e)}")


async def load_voice_model(voice_name: str) -> piper.PiperVoice:
    """Load a voice model into memory."""
    if voice_name in voice_models:
        return voice_models[voice_name]
    
    try:
        # Download if needed
        model_path, config_path = await download_voice_model(voice_name)
        
        # Load model in executor to avoid blocking
        loop = asyncio.get_event_loop()
        voice_model = await loop.run_in_executor(
            None,
            piper.PiperVoice.load,
            model_path,
            config_path
        )
        
        voice_models[voice_name] = voice_model
        logger.info(f"Voice model loaded: {voice_name}")
        return voice_model
        
    except Exception as e:
        logger.error(f"Failed to load voice model {voice_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load voice model: {str(e)}")


def synthesize_audio_sync(text: str, voice_model: piper.PiperVoice) -> bytes:
    """Synchronous audio synthesis - runs in executor."""
    wav_buffer = io.BytesIO()
    
    try:
        with wave.open(wav_buffer, 'wb') as wav_file:
            # Configure WAV format parameters
            wav_file.setnchannels(1)  # Mono audio
            wav_file.setsampwidth(2)  # 16-bit samples
            wav_file.setframerate(voice_model.config.sample_rate)  # Use model's sample rate
            
            # Generate audio using the correct Piper API
            voice_model.synthesize(text, wav_file)
        
        return wav_buffer.getvalue()
        
    finally:
        wav_buffer.close()


# API Endpoints

@app.post("/tts", response_class=Response)
async def text_to_speech(request: TTSRequest) -> Response:
    """
    Convert text to speech and return WAV audio data.
    
    Returns audio/wav with the synthesized speech.
    """
    try:
        voice_name = request.voice or config.default_voice
        logger.info(f"TTS request: '{request.text[:50]}...' using voice '{voice_name}'")
        
        # Load voice model
        voice_model = await load_voice_model(voice_name)
        
        # Generate audio in executor
        loop = asyncio.get_event_loop()
        audio_data = await loop.run_in_executor(
            None,
            synthesize_audio_sync,
            request.text,
            voice_model
        )
        
        logger.info(f"TTS completed: {len(audio_data)} bytes generated")
        
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "inline; filename=\"speech.wav\"",
                "Content-Length": str(len(audio_data))
            }
        )
        
    except Exception as e:
        logger.error(f"TTS request failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@app.get("/voices", response_model=List[VoiceInfo])
async def list_voices() -> List[VoiceInfo]:
    """
    List all available voice models.
    
    Returns information about voices in the catalog and their availability.
    """
    voices = []
    
    for voice_name, info in VOICE_CATALOG.items():
        model_path = config.models_dir / f"{voice_name}.onnx"
        config_path = config.models_dir / f"{voice_name}.onnx.json"
        
        available = model_path.exists() and config_path.exists()
        file_size_mb = None
        
        if available and model_path.exists():
            file_size_mb = round(model_path.stat().st_size / (1024 * 1024), 1)
        
        voices.append(VoiceInfo(
            name=voice_name,
            language=info["language"],
            speaker=info["speaker"],
            quality=info["quality"],
            sample_rate=info["sample_rate"],
            gender=info["gender"],
            file_size_mb=file_size_mb,
            available=available
        ))
    
    return voices


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Service health check.
    
    Returns service status and loaded model information.
    """
    return HealthResponse(
        status="healthy",
        voice_models_loaded=len(voice_models),
        default_voice=config.default_voice,
        models_directory=str(config.models_dir)
    )


@app.post("/download-voice")
async def download_voice(request: DownloadVoiceRequest, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """
    Download a new voice model.
    
    Downloads the specified voice model in the background.
    """
    voice_name = request.voice_name
    
    if voice_name not in VOICE_CATALOG:
        raise HTTPException(status_code=404, detail=f"Voice '{voice_name}' not found in catalog")
    
    model_path = config.models_dir / f"{voice_name}.onnx"
    config_path = config.models_dir / f"{voice_name}.onnx.json"
    
    if model_path.exists() and config_path.exists():
        return {
            "status": "already_exists",
            "message": f"Voice model '{voice_name}' already exists",
            "voice_name": voice_name
        }
    
    # Download in background
    background_tasks.add_task(download_voice_model, voice_name)
    
    return {
        "status": "downloading",
        "message": f"Voice model '{voice_name}' download started",
        "voice_name": voice_name
    }


@app.on_event("startup")
async def startup_event():
    """Initialize the service on startup."""
    logger.info("Starting Piper TTS Service...")
    logger.info(f"Models directory: {config.models_dir}")
    logger.info(f"Default voice: {config.default_voice}")
    
    # Pre-load default voice model
    try:
        await load_voice_model(config.default_voice)
        logger.info("Default voice model loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to pre-load default voice: {e}")
    
    logger.info("Piper TTS Service started successfully")


@app.on_event("shutdown") 
async def shutdown_event():
    """Cleanup on service shutdown."""
    logger.info("Shutting down Piper TTS Service...")
    
    # Clear loaded models to free memory
    voice_models.clear()
    
    logger.info("Piper TTS Service shut down")


if __name__ == "__main__":
    uvicorn.run(
        "service:app",
        host=config.host,
        port=config.port,
        log_level=config.log_level.lower(),
        reload=False
    )
