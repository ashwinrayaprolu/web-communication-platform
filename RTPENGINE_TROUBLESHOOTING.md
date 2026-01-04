# RTPEngine Installation & Troubleshooting Guide

## Quick Fix: Using Official Docker Image

The easiest and most reliable way to run RTPEngine is to use the **official Docker image** instead of building from source.

### Updated Configuration (Already Applied)

```yaml
rtpengine:
  image: drachtio/rtpengine:latest
  # No build needed - uses official image!
```

This avoids all repository and GPG key issues.

## Alternative Installation Methods

### Method 1: Official Docker Image (RECOMMENDED ✅)

```yaml
services:
  rtpengine:
    image: drachtio/rtpengine:latest
    command: >
      rtpengine
      --interface=internal/0.0.0.0
      --listen-ng=0.0.0.0:22222
      --port-min=30000
      --port-max=30100
      --log-level=6
```

**Pros**:
- No build required
- Pre-compiled and tested
- Multi-architecture support
- Regular updates

**Cons**:
- Less customization

### Method 2: Sipwise Official Repository

```dockerfile
FROM debian:bullseye

# Add Sipwise repository
RUN echo "deb https://deb.sipwise.com/spce/mr11.5/ bullseye main" > /etc/apt/sources.list.d/sipwise.list
RUN wget -O /usr/share/keyrings/sipwise.gpg https://deb.sipwise.com/spce/keyring.gpg
RUN echo "deb [signed-by=/usr/share/keyrings/sipwise.gpg] https://deb.sipwise.com/spce/mr11.5/ bullseye main" > /etc/apt/sources.list.d/sipwise-signed.list

RUN apt-get update && apt-get install -y ngcp-rtpengine-daemon
```

### Method 3: Build from Source

```dockerfile
FROM debian:bullseye

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    cmake \
    libglib2.0-dev \
    libpcre3-dev \
    libssl-dev \
    libevent-dev \
    libhiredis-dev \
    libjson-glib-dev \
    libxmlrpc-core-c3-dev \
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libswresample-dev \
    libavfilter-dev \
    libcurl4-openssl-dev \
    libwebsockets-dev \
    libmysqlclient-dev \
    libspandsp-dev \
    libiptc-dev

RUN git clone https://github.com/sipwise/rtpengine.git /usr/src/rtpengine
WORKDIR /usr/src/rtpengine

RUN make && make install

CMD ["rtpengine", "--foreground"]
```

### Method 4: Pre-built Debian Package

```dockerfile
FROM debian:bullseye

RUN apt-get update && apt-get install -y wget

# Download from GitHub releases
RUN wget https://github.com/sipwise/rtpengine/releases/download/mr11.5.1.5/ngcp-rtpengine-daemon_11.5.1.5+0~mr11.5.1.5_amd64.deb
RUN dpkg -i ngcp-rtpengine-daemon_*.deb || apt-get install -f -y
```

## Current Issue: Repository GPG Key Error

### Problem
```
ERROR 404: Not Found
gpg: no valid OpenPGP data found
```

### Root Cause
The dfx.at repository is no longer available or has moved.

### Solution Applied
✅ Switched to **official drachtio/rtpengine Docker image**

## Verifying RTPEngine is Working

### 1. Check Container Status

```bash
docker-compose ps rtpengine

# Should show: Up (healthy)
```

### 2. Check Logs

```bash
docker-compose logs rtpengine

# Should see:
# INFO: rtpengine Starting
# INFO: Listening on 0.0.0.0:22222
```

### 3. Test Control Port

```bash
# From host
nc -zvu localhost 22222

# From inside container
docker-compose exec rtpengine nc -zvu localhost 22222
```

### 4. Test from Kamailio

```bash
docker-compose exec kamailio sh -c "echo 'ping' | nc -u rtpengine 22222"

# Should get response (not timeout)
```

### 5. Check Active Sessions (During Call)

```bash
# View RTPEngine stats
docker-compose exec rtpengine rtpengine-ctl list totals

# Or from Kamailio
docker-compose exec kamailio kamctl fifo rtpengine.show all
```

## Common Issues & Solutions

### Issue 1: Port Already in Use

**Error**: `address already in use`

**Solution**:
```bash
# Check what's using port 22222
sudo lsof -i :22222
sudo netstat -tulpn | grep 22222

# Kill the process or change port
```

### Issue 2: No Audio in Calls

**Symptoms**: Call connects but no audio

**Debugging**:
```bash
# 1. Check RTPEngine logs during call
docker-compose logs -f rtpengine

# Should see:
# Creating new session
# Got valid request

# 2. Check if RTP packets flowing
sudo tcpdump -i any -n udp port 30000-30100

# 3. Verify Kamailio calling rtpengine_manage()
docker-compose logs kamailio | grep rtpengine
```

**Common Causes**:
- Firewall blocking UDP 30000-30100
- Kamailio not calling rtpengine_manage()
- NAT issues
- Wrong interface configuration

### Issue 3: RTPEngine Not Starting

**Error**: `Container exits immediately`

**Common Error Messages**:
```
CRIT: [core] Fatal error: Invalid interface specification: 'internal'
```

**Solution**:

The interface specification should be simple:
```yaml
rtpengine:
  command: >
    rtpengine
    --interface=0.0.0.0           # ✅ Correct - simple IP
    --listen-ng=0.0.0.0:22222
    --foreground
```

**WRONG configurations**:
```bash
--interface=internal/0.0.0.0     # ❌ 'internal' not recognized
--interface=eth0                 # ❌ Interface name may not exist
```

**Check**:
```bash
# View full error
docker-compose logs rtpengine

# Common issues:
# - Invalid interface syntax (use 0.0.0.0)
# - Port permission issues
# - Missing capabilities
```

**Solution**:
```yaml
# Ensure privileged mode and caps
privileged: true
cap_add:
  - NET_ADMIN
  - SYS_ADMIN
```

### Issue 4: Health Check Failing

**Error**: `unhealthy` status

**Debug**:
```bash
# Manually run health check
docker-compose exec rtpengine nc -zvu localhost 22222

# Check if rtpengine process running
docker-compose exec rtpengine ps aux | grep rtpengine
```

### Issue 5: Platform Mismatch

**Error**: `exec format error`

**Solution**:
```yaml
# For ARM (M1/M2 Mac, Raspberry Pi)
platform: linux/arm64

# For Intel/AMD
platform: linux/amd64
```

## Testing RTPEngine Integration

### Test 1: Kamailio Connection

```bash
# Inside Kamailio container
kamcmd rtpengine.show all

# Should show RTPEngine endpoint
```

### Test 2: Make Test Call

```bash
# 1. Start call from browser
# 2. Watch RTPEngine logs
docker-compose logs -f rtpengine

# Should see:
# [PORT] Got valid request
# [PORT] Creating new session
# [PORT] Command: offer
# [PORT] Command: answer
```

### Test 3: Packet Capture

```bash
# Capture SRTP from browser side
sudo tcpdump -i any -n -w /tmp/srtp.pcap udp port 30000-30100

# Capture RTP to FreeSWITCH side  
sudo tcpdump -i any -n -w /tmp/rtp.pcap host freeswitch-1
```

## Performance Tuning

### Increase Port Range

```yaml
command: >
  rtpengine
  --port-min=30000
  --port-max=40000  # Increased from 30100
```

**Calculation**: Each call uses 2 ports (audio + video)
- 10,000 ports = ~5,000 concurrent calls

### Enable Kernel Module

For better performance, use kernel-space forwarding:

```yaml
rtpengine:
  volumes:
    - /lib/modules:/lib/modules:ro
  command: >
    rtpengine
    --table=0
    --kernel-table=0
```

### Thread Configuration

```yaml
command: >
  rtpengine
  --num-threads=8  # Increase for high load
```

## Monitoring RTPEngine

### Real-time Stats

```bash
# Via rtpengine-ctl
docker-compose exec rtpengine rtpengine-ctl list totals

# Via Kamailio
docker-compose exec kamailio kamctl fifo rtpengine.show all
```

### Prometheus Metrics

```yaml
rtpengine:
  ports:
    - "9101:9101"  # Prometheus metrics
  command: >
    rtpengine
    --prometheus=0.0.0.0:9101
```

### Log Levels

```bash
# Debug (lots of output)
--log-level=7

# Info (recommended)
--log-level=6

# Warning only
--log-level=4
```

## Troubleshooting Checklist

- [ ] Container is running (`docker-compose ps`)
- [ ] Health check passing
- [ ] Port 22222/udp accessible
- [ ] Ports 30000-30100/udp open in firewall
- [ ] Kamailio can reach rtpengine:22222
- [ ] Logs show "Listening on 0.0.0.0:22222"
- [ ] During call: logs show "Creating new session"
- [ ] RTP packets visible in tcpdump
- [ ] No "table full" or "port exhaustion" errors

## Quick Recovery

If RTPEngine is completely broken:

```bash
# 1. Stop everything
docker-compose down

# 2. Remove RTPEngine container and volumes
docker-compose rm -f rtpengine
docker volume prune

# 3. Pull fresh image
docker-compose pull rtpengine

# 4. Restart
docker-compose up -d rtpengine

# 5. Verify
docker-compose logs rtpengine
docker-compose exec kamailio nc -zvu rtpengine 22222
```

## Summary

**Current Configuration**: ✅ Using `drachtio/rtpengine:latest` official image

This avoids:
- Repository configuration issues
- GPG key problems
- Build dependencies
- Architecture mismatches

The official Docker image is the **recommended production approach**! 🚀
