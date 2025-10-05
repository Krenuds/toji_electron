#!/usr/bin/env python3
"""
Startup script for Piper TTS Service.

This script provides a convenient way to start the service with proper
configuration validation and error handling.
"""

import sys
import os
from pathlib import Path

# Add service directory to Python path
service_dir = Path(__file__).parent
sys.path.insert(0, str(service_dir))

def main():
    """Main startup function."""
    try:
        from config import ServiceConfig, setup_logging
        from service import app
        import uvicorn
        
        # Load configuration
        config = ServiceConfig()
        logger = setup_logging(config)
        
        logger.info("Starting Piper TTS Service...")
        logger.info(f"Configuration: {config.to_dict()}")
        
        # Start the server
        uvicorn.run(
            "service:app",
            host=config.host,
            port=config.port,
            log_level=config.log_level.lower(),
            reload=False,
            access_log=True
        )
        
    except Exception as e:
        print(f"Failed to start Piper TTS Service: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
