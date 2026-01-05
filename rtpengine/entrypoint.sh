#!/bin/bash
set -e

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Function to get the public IP
get_public_ip() {
    # Try different methods to get public IP
    local ip=""
    
    # Try AWS metadata service
    if command -v curl &> /dev/null; then
        ip=$(curl -s --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
    fi
    
    # Try Google Cloud metadata
    if [ -z "$ip" ] && command -v curl &> /dev/null; then
        ip=$(curl -s --max-time 2 -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip 2>/dev/null || echo "")
    fi
    
    # Try Azure metadata
    if [ -z "$ip" ] && command -v curl &> /dev/null; then
        ip=$(curl -s --max-time 2 -H "Metadata:true" "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2021-02-01&format=text" 2>/dev/null || echo "")
    fi
    
    # Fallback to external service
    if [ -z "$ip" ] && command -v curl &> /dev/null; then
        ip=$(curl -s --max-time 2 ifconfig.me 2>/dev/null || echo "")
    fi
    
    echo "$ip"
}

# Set default values from environment variables
INTERFACE=${INTERFACE:-""}
LISTEN_NG=${LISTEN_NG:-"0.0.0.0:22222"}
PORT_MIN=${PORT_MIN:-"30000"}
PORT_MAX=${PORT_MAX:-"40000"}
LOG_LEVEL=${LOG_LEVEL:-"6"}
PUBLIC_IP=${PUBLIC_IP:-""}

# Auto-detect public IP if not provided
if [ -z "$PUBLIC_IP" ]; then
    log "Attempting to auto-detect public IP..."
    PUBLIC_IP=$(get_public_ip)
    if [ -n "$PUBLIC_IP" ]; then
        log "Detected public IP: $PUBLIC_IP"
    else
        log "Warning: Could not detect public IP. Using local IP only."
    fi
fi

# Get local IP if not specified
if [ -z "$INTERFACE" ]; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    if [ -n "$PUBLIC_IP" ] && [ "$LOCAL_IP" != "$PUBLIC_IP" ]; then
        INTERFACE="${LOCAL_IP}!${PUBLIC_IP}"
        log "Using interface: $INTERFACE (local!public)"
    else
        INTERFACE="${LOCAL_IP}"
        log "Using interface: $INTERFACE"
    fi
fi

# Build command line arguments
CMD_ARGS=(
    "--interface=$INTERFACE"
    "--listen-ng=$LISTEN_NG"
    "--port-min=$PORT_MIN"
    "--port-max=$PORT_MAX"
    "--log-level=$LOG_LEVEL"
    "--log-stderr"
    "--foreground"
)

# Add optional parameters from environment
[ -n "$TOS" ] && CMD_ARGS+=("--tos=$TOS")
[ -n "$NUM_THREADS" ] && CMD_ARGS+=("--num-threads=$NUM_THREADS")
[ -n "$TIMEOUT" ] && CMD_ARGS+=("--timeout=$TIMEOUT")
[ -n "$SILENT_TIMEOUT" ] && CMD_ARGS+=("--silent-timeout=$SILENT_TIMEOUT")
[ -n "$REDIS" ] && CMD_ARGS+=("--redis=$REDIS")
[ -n "$LISTEN_HTTP" ] && CMD_ARGS+=("--listen-http=$LISTEN_HTTP")
[ -n "$RECORDING_DIR" ] && CMD_ARGS+=("--recording-dir=$RECORDING_DIR")
[ -n "$RECORDING_METHOD" ] && CMD_ARGS+=("--recording-method=$RECORDING_METHOD")

# Allow passing additional arguments
if [ "$#" -gt 0 ]; then
    if [ "$1" = "rtpengine" ]; then
        shift
        CMD_ARGS+=("$@")
    else
        # If not rtpengine command, execute as-is
        exec "$@"
    fi
fi

log "Starting rtpengine with arguments: ${CMD_ARGS[*]}"

# Execute rtpengine
exec /usr/bin/rtpengine "${CMD_ARGS[@]}"