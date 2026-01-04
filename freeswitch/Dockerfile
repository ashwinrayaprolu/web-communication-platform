FROM debian:bullseye

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    wget \
    lsb-release \
    ca-certificates \
    apt-transport-https \
    git \
    build-essential \
    autoconf \
    automake \
    libtool \
    pkg-config \
    libssl-dev \
    zlib1g-dev \
    libncurses5-dev \
    libedit-dev \
    libsqlite3-dev \
    libcurl4-openssl-dev \
    libpcre3-dev \
    libspeex-dev \
    libspeexdsp-dev \
    libldns-dev \
    && rm -rf /var/lib/apt/lists/*

# Add FreeSWITCH repository
RUN wget --http-user=signalwire --http-password=pat_NUqRmjBbHaFGU9rxW7vpVqKX \
    -O /usr/share/keyrings/signalwire-freeswitch-repo.gpg \
    https://freeswitch.signalwire.com/repo/deb/debian-release/signalwire-freeswitch-repo.gpg

RUN echo "machine freeswitch.signalwire.com login signalwire password pat_NUqRmjBbHaFGU9rxW7vpVqKX" > /etc/apt/auth.conf
RUN chmod 600 /etc/apt/auth.conf

RUN echo "deb [signed-by=/usr/share/keyrings/signalwire-freeswitch-repo.gpg] https://freeswitch.signalwire.com/repo/deb/debian-release/ bullseye main" \
    > /etc/apt/sources.list.d/freeswitch.list

# Install FreeSWITCH
RUN apt-get update && apt-get install -y \
    freeswitch-meta-all \
    && rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p /etc/freeswitch /var/log/freeswitch /var/run/freeswitch

# Expose ports
EXPOSE 5062/udp 8021/tcp 16384-16394/udp

# Start FreeSWITCH
CMD ["freeswitch", "-nonat", "-nf"]
