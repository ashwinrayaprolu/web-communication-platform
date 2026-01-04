"""
Piper TTS Server
Natural-sounding, lightweight text-to-speech API for VoIP applications
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib
from pathlib import Path
import logging
import subprocess
import os

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Piper TTS Server", version="1.0.0")

# Directories
OUTPUT_DIR = Path("/app/output")
OUTPUT_DIR.mkdir(exist_ok=True)

CACHE_DIR = Path("/app/cache")
CACHE_DIR.mkdir(exist_ok=True)

VOICE_DIR = Path("/app/voices")

# Available voice models
VOICES = {
    "default": "en_US-lessac-medium",
    "female": "en_US-lessac-medium",
    "male": "en_US-lessac-medium"  # You can add more models here
}

class TTSRequest(BaseModel):
    text: str
    voice: str = "default"
    speed: float = 1.0
    cache: bool = True

class TTSResponse(BaseModel):
    success: bool
    file_path: str
    message: str = ""

def text_to_hash(text: str, voice: str, speed: float) -> str:
    """Generate cache key from text parameters"""
    key = f"{text}_{voice}_{speed}"
    return hashlib.md5(key.encode()).hexdigest()

def synthesize_speech(text: str, voice: str = "default", speed: float = 1.0) -> str:
    """
    Synthesize speech from text using Piper
    Returns path to generated WAV file
    """
    # Check cache first
    cache_key = text_to_hash(text, voice, speed)
    cache_file = CACHE_DIR / f"{cache_key}.wav"
    
    if cache_file.exists():
        logger.info(f"Using cached audio: {cache_key}")
        return str(cache_file)
    
    # Generate filename
    output_file = OUTPUT_DIR / f"{cache_key}.wav"
    raw_output = OUTPUT_DIR / f"{cache_key}_raw.wav"
    
    try:
        logger.info(f"Synthesizing with Piper: {text[:50]}...")
        
        # Get voice model
        voice_model = VOICES.get(voice, VOICES["default"])
        model_path = VOICE_DIR / f"{voice_model}.onnx"
        
        if not model_path.exists():
            raise Exception(f"Voice model not found: {model_path}")
        
        # Use Piper to generate speech
        # Piper reads from stdin and outputs to stdout
        cmd = [
            '/opt/piper/piper/piper',  # Full path to piper binary
            '--model', str(model_path),
            '--output_file', str(raw_output)
        ]
        
        # Add length scale for speed adjustment (inverse of speed)
        length_scale = 1.0 / speed
        cmd.extend(['--length_scale', str(length_scale)])
        
        # Run Piper
        result = subprocess.run(
            cmd,
            input=text.encode('utf-8'),
            capture_output=True,
            check=True
        )
        
        if result.returncode != 0:
            raise Exception(f"Piper failed: {result.stderr.decode()}")
        
        # Convert to telephony format (8kHz, mono) using sox
        if raw_output.exists():
            sox_cmd = [
                'sox',
                str(raw_output),
                '-r', '8000',      # 8kHz sample rate for telephony
                '-c', '1',         # Mono
                '-b', '16',        # 16-bit
                str(output_file)
            ]
            
            subprocess.run(sox_cmd, check=True, capture_output=True)
            
            # Remove raw file
            raw_output.unlink()
        else:
            raise Exception("Piper did not generate output file")
        
        # Copy to cache
        import shutil
        shutil.copy(output_file, cache_file)
        
        logger.info(f"Generated audio: {output_file}")
        return str(output_file)
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Error synthesizing speech: {e}")
        logger.error(f"stderr: {e.stderr.decode() if e.stderr else 'No stderr'}")
        raise Exception(f"TTS generation failed: {e}")
    except Exception as e:
        logger.error(f"Error synthesizing speech: {e}")
        raise

@app.on_event("startup")
async def startup():
    """Warmup on startup"""
    logger.info("Starting Piper TTS server...")
    try:
        # Test Piper
        result = subprocess.run(
            ['/opt/piper/piper/piper', '--version'],
            capture_output=True,
            text=True
        )
        logger.info(f"Piper version: {result.stdout.strip()}")
        
        # List available voices
        voices_available = list(VOICE_DIR.glob("*.onnx"))
        logger.info(f"Available voice models: {[v.stem for v in voices_available]}")
        
        # Warm up with test
        synthesize_speech("Welcome to our voice service.", voice="default", speed=1.0)
        logger.info("Piper TTS server ready")
    except Exception as e:
        logger.warning(f"Warmup failed (will retry on first request): {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    voices_available = list(VOICE_DIR.glob("*.onnx"))
    return {
        "status": "healthy",
        "engine": "piper",
        "voices": [v.stem for v in voices_available],
        "cache_dir": str(CACHE_DIR),
        "output_dir": str(OUTPUT_DIR)
    }

@app.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech
    
    Args:
        text: Text to synthesize
        voice: Voice model to use (default, male, female)
        speed: Speech speed (0.5 - 2.0)
        cache: Whether to cache the result
    
    Returns:
        Path to generated WAV file
    """
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        if len(request.text) > 1000:
            raise HTTPException(status_code=400, detail="Text too long (max 1000 characters)")
        
        if request.speed < 0.5 or request.speed > 2.0:
            raise HTTPException(status_code=400, detail="Speed must be between 0.5 and 2.0")
        
        # Generate speech
        file_path = synthesize_speech(
            request.text,
            request.voice,
            request.speed
        )
        
        return TTSResponse(
            success=True,
            file_path=file_path,
            message="Speech synthesized successfully"
        )
        
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tts/phrase")
async def synthesize_phrase(text: str, voice: str = "default"):
    """Quick TTS for common phrases (simplified endpoint)"""
    try:
        if len(text) > 1000:
            raise HTTPException(status_code=400, detail="Text too long")
            
        file_path = synthesize_speech(text, voice, 1.0)
        return {"success": True, "file_path": file_path}
    except Exception as e:
        logger.error(f"Phrase synthesis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/voices")
async def list_voices():
    """List available voice models"""
    voices_available = list(VOICE_DIR.glob("*.onnx"))
    return {
        "voices": {
            name: model for name, model in VOICES.items()
        },
        "available_models": [v.stem for v in voices_available]
    }

@app.get("/cache/clear")
async def clear_cache():
    """Clear the audio cache"""
    try:
        import shutil
        count = len(list(CACHE_DIR.glob("*.wav")))
        shutil.rmtree(CACHE_DIR)
        CACHE_DIR.mkdir(exist_ok=True)
        return {"success": True, "message": f"Cleared {count} cached files"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Piper TTS Server",
        "engine": "Piper (Neural TTS)",
        "version": "1.0.0",
        "status": "running",
        "quality": "Natural-sounding voice",
        "endpoints": {
            "/tts": "POST - Text to speech synthesis",
            "/tts/phrase": "POST - Quick phrase synthesis",
            "/voices": "GET - List available voices",
            "/health": "GET - Health check",
            "/cache/clear": "GET - Clear cache"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)