"""
Configuration management for Whisper service
Simplified version for standalone operation
"""

import os
from typing import Dict, Any
from pydantic import BaseModel


class WhisperConfig(BaseModel):
    """Whisper transcription configuration"""
    beam_size: int = 5
    temperature: float = 0.0
    no_speech_threshold: float = 0.6
    condition_on_previous_text: bool = True


class Settings:
    """Application settings"""
    
    def __init__(self):
        self.whisper_config = WhisperConfig()
    
    def get_whisper_config(self) -> Dict[str, Any]:
        """Get Whisper configuration as dictionary"""
        return self.whisper_config.model_dump()


def get_settings() -> Settings:
    """Get application settings instance"""
    return Settings()
