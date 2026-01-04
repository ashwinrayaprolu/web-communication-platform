FROM python:3.10-slim

WORKDIR /app

# Detect architecture and set variables
ARG TARGETARCH
ENV TARGETARCH=${TARGETARCH}

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    sox \
    libsox-fmt-all \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Download and install Piper TTS (architecture-specific)
# Piper needs to be extracted to a specific location with all its libraries
RUN mkdir -p /opt/piper && \
    cd /opt/piper && \
    if [ "$TARGETARCH" = "arm64" ]; then \
        echo "Installing Piper for ARM64 (Mac M1/M2/M3)..." && \
        wget -q https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_arm64.tar.gz && \
        tar -xzf piper_arm64.tar.gz && \
        rm piper_arm64.tar.gz; \
    else \
        echo "Installing Piper for AMD64 (Intel/AMD)..." && \
        wget -q https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz && \
        tar -xzf piper_amd64.tar.gz && \
        rm piper_amd64.tar.gz; \
    fi && \
    chmod +x piper/piper

# Add Piper to PATH and set library path
ENV PATH="/opt/piper/piper:${PATH}"
ENV LD_LIBRARY_PATH="/opt/piper/piper/lib:${LD_LIBRARY_PATH}"

# Download a good quality voice model (US English, medium quality)
RUN mkdir -p /app/voices && \
    cd /app/voices && \
    wget -q https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx && \
    wget -q https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

# Install minimal Python dependencies
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    pydantic==2.5.0

# Copy our API wrapper
COPY tts_server.py /app/

# Create directories
RUN mkdir -p /app/output /app/cache /app/prompts

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD nc -zv localhost 8000 || exit 1

# Start server
CMD ["uvicorn", "tts_server:app", "--host", "0.0.0.0", "--port", "8000"]