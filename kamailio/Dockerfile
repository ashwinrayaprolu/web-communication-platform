FROM debian:bullseye

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install prerequisites
RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    lsb-release \
    ca-certificates \
    apt-transport-https \
    wget \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Add Kamailio repository
RUN echo "deb http://deb.kamailio.org/kamailio57 bullseye main" > /etc/apt/sources.list.d/kamailio.list
RUN wget -O - http://deb.kamailio.org/kamailiodebkey.gpg | apt-key add -

# Update and install ALL Kamailio packages
RUN apt-get update && apt-get install -y \
    kamailio \
    kamailio-* \
    && rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p /var/log/kamailio /var/run/kamailio /etc/kamailio

# Set proper permissions
RUN chown -R kamailio:kamailio /var/log/kamailio /var/run/kamailio

# Expose ports
EXPOSE 5060/udp 5060/tcp 8080/tcp 4443/tcp

# Start Kamailio
CMD ["kamailio", "-DD", "-E", "-e"]
