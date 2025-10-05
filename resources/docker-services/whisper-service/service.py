"""
Standalone Whisper Service with GPU Acceleration
Production-ready FastAPI service for speech recognition
"""

import os
import tempfile
from typing import Optional, Literal, Dict, Any, List
import torch
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from faster_whisper import WhisperModel
import uvicorn
from dotenv import load_dotenv

# Import local modules
from config import get_settings
from logger import get_logger

# Load environment variables
load_dotenv()

# Ensure logs directory exists
os.makedirs("logs", exist_ok=True)

# Initialize logger
logger = get_logger('whisper-service')


class WhisperService:
    """High-performance Whisper transcription service with GPU acceleration"""

    def __init__(self) -> None:
        """Initialize WhisperService with automatic GPU detection and model settings."""
        self.model = None
        self.model_size = os.getenv("WHISPER_MODEL_SIZE", "small")
        
        if torch.cuda.is_available():
            try:
                # Test CUDA functionality
                test_tensor = torch.tensor([1.0], device="cuda")
                del test_tensor
                self.device = "cuda"
                self.compute_type = "float16"
                logger.info(f"CUDA available - using GPU")
                logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
                logger.info(
                    f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB"
                )
            except Exception as e:
                logger.warning(f"CUDA test failed: {e}, falling back to CPU")
                self.device = "cpu"
                self.compute_type = "float32"
        else:
            self.device = "cpu"
            self.compute_type = "float32"
            
        logger.info(f"Initializing Whisper service on {self.device}")
        self._load_model()

    def _load_model(self) -> None:
        """Load the Whisper model with optimal settings"""
        try:
            logger.info(
                f"Loading {self.model_size} model on {self.device} with {self.compute_type}"
            )
            self.model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
                cpu_threads=4 if self.device == "cpu" else 1,
                num_workers=1,
            )
            logger.info("Model loaded successfully")
            
            if self.device == "cuda":
                logger.info("Testing GPU model functionality...")
                
        except Exception as e:
            logger.error(f"Failed to load model with {self.device}: {e}")
            if self.device == "cuda":
                logger.warning("GPU model failed, falling back to CPU")
                try:
                    self.device = "cpu"
                    self.compute_type = "float32"
                    self.model = WhisperModel(
                        self.model_size,
                        device="cpu",
                        compute_type="float32",
                        cpu_threads=4,
                    )
                    logger.info("CPU fallback model loaded successfully")
                except Exception as cpu_error:
                    logger.error(f"CPU fallback also failed: {cpu_error}")
                    raise RuntimeError(
                        "Could not load Whisper model on either GPU or CPU"
                    )
            else:
                raise

    def cleanup_cuda_memory(self) -> None:
        """Cleanup CUDA memory and model resources"""
        try:
            if self.model is not None:
                # Clear the model
                del self.model
                self.model = None
                logger.info("Whisper model cleared from memory")
                
            # Force CUDA memory cleanup if available
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
                logger.info("CUDA memory cache cleared")
                
        except Exception as e:
            logger.error(f"Error during CUDA cleanup: {e}")

    async def transcribe_audio(
        self,
        audio_file: UploadFile,
        task: str = "transcribe",
        language: Optional[str] = None,
        initial_prompt: Optional[str] = None,
        output_format: str = "txt",
    ) -> Dict[str, Any]:
        """Transcribe audio file using faster-whisper"""
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_path = temp_file.name
            
        try:
            settings = get_settings()
            whisper_config = settings.get_whisper_config()
            
            segments, info = self.model.transcribe(
                temp_path,
                task=task,
                language=language,
                initial_prompt=initial_prompt,
                beam_size=whisper_config["beam_size"],
                best_of=5,
                temperature=whisper_config["temperature"],
                compression_ratio_threshold=2.4,
                log_prob_threshold=-1.0,
                no_speech_threshold=whisper_config["no_speech_threshold"],
                condition_on_previous_text=whisper_config["condition_on_previous_text"],
                word_timestamps=True if output_format == "json" else False,
            )
            
            if output_format == "json":
                return self._format_json_output(segments, info)
            elif output_format == "txt":
                return {"text": " ".join(segment.text for segment in segments)}
            elif output_format == "vtt":
                return {"vtt": self._format_vtt_output(segments)}
            elif output_format == "srt":
                return {"srt": self._format_srt_output(segments)}
            else:
                return {"text": " ".join(segment.text for segment in segments)}
                
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise HTTPException(
                status_code=500, detail=f"Transcription failed: {str(e)}"
            )
        finally:
            try:
                os.unlink(temp_path)
            except OSError as e:
                logger.debug(f"Failed to delete temporary file: {e}")

    def _format_json_output(self, segments: List[Any], info: Any) -> Dict[str, Any]:
        """Format output as JSON with detailed segment information"""
        return {
            "text": " ".join(segment.text for segment in segments),
            "language": info.language,
            "language_probability": info.language_probability,
            "duration": info.duration,
            "segments": [
                {
                    "id": i,
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text,
                    "words": (
                        [
                            {
                                "word": word.word,
                                "start": word.start,
                                "end": word.end,
                                "probability": word.probability,
                            }
                            for word in (segment.words or [])
                        ]
                        if segment.words
                        else []
                    ),
                }
                for i, segment in enumerate(segments)
            ],
        }

    def _format_vtt_output(self, segments: List[Any]) -> str:
        """Format output as WebVTT"""
        vtt_lines = ["WEBVTT", ""]
        for segment in segments:
            start_time = self._seconds_to_vtt_time(segment.start)
            end_time = self._seconds_to_vtt_time(segment.end)
            vtt_lines.append(f"{start_time} --> {end_time}")
            vtt_lines.append(segment.text)
            vtt_lines.append("")
        return "\n".join(vtt_lines)

    def _format_srt_output(self, segments: List[Any]) -> str:
        """Format output as SRT"""
        srt_lines = []
        for i, segment in enumerate(segments, 1):
            start_time = self._seconds_to_srt_time(segment.start)
            end_time = self._seconds_to_srt_time(segment.end)
            srt_lines.append(str(i))
            srt_lines.append(f"{start_time} --> {end_time}")
            srt_lines.append(segment.text)
            srt_lines.append("")
        return "\n".join(srt_lines)

    def _seconds_to_vtt_time(self, seconds: float) -> str:
        """Convert seconds to VTT time format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:06.3f}"

    def _seconds_to_srt_time(self, seconds: float) -> str:
        """Convert seconds to SRT time format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds = seconds % 60
        milliseconds = int((seconds % 1) * 1000)
        seconds = int(seconds)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

    async def detect_language(self, audio_file: UploadFile) -> Dict[str, Any]:
        """Detect the language of the audio file"""
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_path = temp_file.name
            
        try:
            segments, info = self.model.transcribe(temp_path, beam_size=1, best_of=1)
            return {
                "detected_language": info.language,
                "language_probability": info.language_probability,
            }
        except Exception as e:
            logger.error(f"Language detection failed: {e}")
            raise HTTPException(
                status_code=500, detail=f"Language detection failed: {str(e)}"
            )
        finally:
            try:
                os.unlink(temp_path)
            except OSError as e:
                logger.debug(f"Failed to delete temporary file: {e}")


# Initialize service and FastAPI app
whisper_service = WhisperService()
app = FastAPI(
    title="Whisper ASR Service",
    description="High-performance speech recognition service with GPU acceleration",
    version="2.0.0",
)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Cleanup CUDA memory on service shutdown"""
    logger.info("Shutting down Whisper service, cleaning up CUDA memory...")
    whisper_service.cleanup_cuda_memory()


@app.post("/asr")
async def transcribe(
    audio_file: UploadFile = File(...),
    task: Literal["transcribe", "translate"] = Query("transcribe"),
    language: Optional[str] = Query(None),
    initial_prompt: Optional[str] = Query(None),
    output: Literal["txt", "vtt", "srt", "tsv", "json"] = Query("txt"),
    encode: bool = Query(True),
) -> Dict[str, Any]:
    """
    Transcribe audio file to text
    Compatible with the Docker whisper-asr-webservice API
    """
    if not audio_file.content_type.startswith("audio/"):
        allowed_extensions = [".wav", ".mp3", ".mp4", ".m4a", ".flac", ".ogg"]
        if not any(
            audio_file.filename.lower().endswith(ext) for ext in allowed_extensions
        ):
            raise HTTPException(status_code=400, detail="Invalid audio file format")
    
    try:
        result = await whisper_service.transcribe_audio(
            audio_file=audio_file,
            task=task,
            language=language,
            initial_prompt=initial_prompt,
            output_format=output,
        )
        return result
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect-language")
async def detect_language(
    audio_file: UploadFile = File(...), encode: bool = Query(True)
) -> Dict[str, Any]:
    """Detect the language of an audio file"""
    try:
        result = await whisper_service.detect_language(audio_file)
        return result
    except Exception as e:
        logger.error(f"Language detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "device": whisper_service.device,
        "model_size": whisper_service.model_size,
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": (
            torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
        ),
    }


@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint with service information"""
    return {
        "service": "Whisper ASR Service",
        "version": "2.0.0",
        "device": whisper_service.device,
        "model": whisper_service.model_size,
        "gpu_acceleration": torch.cuda.is_available(),
        "endpoints": {
            "transcribe": "/asr",
            "detect_language": "/detect-language",
            "health": "/health",
            "docs": "/docs",
        },
    }


if __name__ == "__main__":
    port = int(os.getenv("WHISPER_PORT", 9000))
    host = os.getenv("WHISPER_HOST", "0.0.0.0")
    logger.info(f"Starting Whisper service on {host}:{port}")
    logger.info(f"Device: {whisper_service.device}")
    logger.info(f"Model: {whisper_service.model_size}")
    uvicorn.run(app, host=host, port=port, log_level="info", access_log=True)
