# Simplified single-architecture Dockerfile for rtpengine
# This version builds only for the host architecture
# Use this if you encounter multi-arch build issues

FROM debian:bookworm AS builder

ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    cmake \
    curl \
    debhelper \
    default-libmysqlclient-dev \
    dh-sequence-dkms \
    discount \
    dpkg-dev \
    git \
    gperf \
    iptables \
    libip4tc-dev \
    libip6tc-dev \
    libiptc-dev \
    libnftnl-dev \
    libavcodec-dev \
    libavfilter-dev \
    libavformat-dev \
    libavutil-dev \
    libbencode-perl \
    libcrypt-openssl-rsa-perl \
    libcrypt-rijndael-perl \
    libcurl4-openssl-dev \
    libdigest-crc-perl \
    libdigest-hmac-perl \
    libevent-dev \
    libglib2.0-dev \
    libhiredis-dev \
    libio-multiplex-perl \
    libio-socket-inet6-perl \
    libjson-glib-dev \
    libjson-perl \
    libjwt-dev \
    libmnl-dev \
    libmosquitto-dev \
    libncurses-dev \
    libnet-interface-perl \
    libopus-dev \
    libpcap0.8-dev \
    libpcap-dev \
    libpcre3-dev \
    libsocket6-perl \
    libspandsp-dev \
    libssl-dev \
    libswresample-dev \
    libsystemd-dev \
    libtest2-suite-perl \
    liburing-dev \
    libwebsockets-dev \
    libwww-perl \
    libxmlrpc-core-c3-dev \
    libxtables-dev \
    make \
    pandoc \
    pkg-config \
    python3-websockets \
    systemd \
    wget \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src

# Optional: Build bcg729 for G.729 support
ARG WITH_BCG729=yes
ARG BCG729_VERSION=1.1.1
RUN if [ "$WITH_BCG729" = "yes" ]; then \
        curl -L https://gitlab.linphone.org/BC/public/bcg729/-/archive/${BCG729_VERSION}/bcg729-${BCG729_VERSION}.tar.gz -o bcg729.tar.gz && \
        tar xzf bcg729.tar.gz && \
        cd bcg729-${BCG729_VERSION} && \
        cmake . -DCMAKE_INSTALL_PREFIX=/usr -DENABLE_STATIC=YES && \
        make && \
        make install && \
        ldconfig && \
        cd /usr/src && \
        mkdir -p libbcg729-0/DEBIAN libbcg729-0/usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH) && \
        cp /usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH)/libbcg729.so.0* libbcg729-0/usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH)/ && \
        echo "Package: libbcg729-0" > libbcg729-0/DEBIAN/control && \
        echo "Version: ${BCG729_VERSION}" >> libbcg729-0/DEBIAN/control && \
        echo "Architecture: $(dpkg --print-architecture)" >> libbcg729-0/DEBIAN/control && \
        echo "Maintainer: Docker Build <docker@localhost>" >> libbcg729-0/DEBIAN/control && \
        echo "Description: BCG729 runtime library" >> libbcg729-0/DEBIAN/control && \
        echo "libbcg729 0 libbcg729-0" > libbcg729-0/DEBIAN/shlibs && \
        dpkg-deb --build libbcg729-0 && \
        dpkg -i libbcg729-0.deb && \
        mkdir -p libbcg729-dev/DEBIAN libbcg729-dev/usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH)/pkgconfig libbcg729-dev/usr/include/bcg729 && \
        cp /usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH)/libbcg729.so libbcg729-dev/usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH)/ && \
        cp /usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH)/libbcg729.a libbcg729-dev/usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH)/ 2>/dev/null || true && \
        cp /usr/include/bcg729/*.h libbcg729-dev/usr/include/bcg729/ 2>/dev/null || true && \
        cp /usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH)/pkgconfig/libbcg729.pc libbcg729-dev/usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH)/pkgconfig/ 2>/dev/null || true && \
        echo "Package: libbcg729-dev" > libbcg729-dev/DEBIAN/control && \
        echo "Version: ${BCG729_VERSION}" >> libbcg729-dev/DEBIAN/control && \
        echo "Architecture: $(dpkg --print-architecture)" >> libbcg729-dev/DEBIAN/control && \
        echo "Depends: libbcg729-0 (= ${BCG729_VERSION})" >> libbcg729-dev/DEBIAN/control && \
        echo "Maintainer: Docker Build <docker@localhost>" >> libbcg729-dev/DEBIAN/control && \
        echo "Description: BCG729 development files" >> libbcg729-dev/DEBIAN/control && \
        dpkg-deb --build libbcg729-dev && \
        dpkg -i libbcg729-dev.deb && \
        rm -rf bcg729* libbcg729-0 libbcg729-dev; \
    fi

# Clone and build rtpengine
ARG RTPENGINE_VERSION=mr13.5.1.3
RUN git clone --depth 1 --branch ${RTPENGINE_VERSION} https://github.com/sipwise/rtpengine.git /usr/src/rtpengine

WORKDIR /usr/src/rtpengine
# Disable LTO to avoid jobserver issues and limit parallel jobs
ENV DEB_BUILD_OPTIONS="parallel=4 noopt"
ENV DEB_CFLAGS_APPEND="-O2"
ENV DEB_CXXFLAGS_APPEND="-O2"
RUN dpkg-buildpackage -b -us -uc -j4

# Runtime stage
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install only required runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    iptables \
    netcat-openbsd \
    procps \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/*.deb /tmp/

# Install packages with automatic dependency resolution
# apt-get install -f will pull in all required dependencies
RUN apt-get update && \
    dpkg -i /tmp/ngcp-rtpengine-daemon_*.deb || true && \
    apt-get install -f -y && \
    dpkg -i /tmp/ngcp-rtpengine-iptables_*.deb || true && \
    apt-get install -f -y && \
    dpkg -i /tmp/ngcp-rtpengine-utils_*.deb || true && \
    apt-get install -f -y && \
    rm -rf /tmp/*.deb /var/lib/apt/lists/*

RUN mkdir -p /var/run/rtpengine /var/log/rtpengine

COPY rtpengine.conf /etc/rtpengine/rtpengine.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 22222/udp
EXPOSE 30000-40000/udp
EXPOSE 8080/tcp

ENTRYPOINT ["/entrypoint.sh"]
CMD ["rtpengine"]