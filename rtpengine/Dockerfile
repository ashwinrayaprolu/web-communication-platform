FROM debian:bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    iptables \
    netcat-openbsd \
    iproute2 \
    procps \
    libglib2.0-0 \
    libpcre3 \
    libssl1.1 \
    libevent-2.1-7 \
    libhiredis0.14 \
    libjson-glib-1.0-0 \
    libxmlrpc-core-c3 \
    libavcodec58 \
    libavformat58 \
    libavutil56 \
    libswresample3 \
    libavfilter7 \
    libcurl4 \
    libwebsockets16 \
    libmysqlclient21 \
    libspandsp2 \
    libiptc0 \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install RTPEngine from GitHub releases
RUN wget -O rtpengine.deb https://github.com/sipwise/rtpengine/releases/download/mr11.5.1.5/ngcp-rtpengine-daemon_11.5.1.5+0~mr11.5.1.5_amd64.deb \
    && dpkg -i rtpengine.deb || apt-get install -f -y \
    && rm rtpengine.deb

# Create directories
RUN mkdir -p /etc/rtpengine /var/run/rtpengine /var/spool/rtpengine

# Copy configuration
COPY rtpengine.conf /etc/rtpengine/rtpengine.conf

# Expose ports
EXPOSE 22222/udp
EXPOSE 30000-40000/udp

# Health check
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD nc -zvu localhost 22222 || exit 1

# Start RTPEngine
CMD ["rtpengine", "--config-file=/etc/rtpengine/rtpengine.conf", "--foreground", "--log-stderr"]
