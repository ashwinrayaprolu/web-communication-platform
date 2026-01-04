# Quick Fixes for Common Errors

## Error 1: "version is obsolete" Warning

### Error Message
```
WARN: the attribute `version` is obsolete, it will be ignored
```

### Cause
Docker Compose v2+ doesn't require the `version` field in docker-compose.yaml

### Fix
✅ **Already Fixed!** The version field has been removed from docker-compose.yaml

### Details
- **Old format**: `version: '3.8'`
- **New format**: Just start with `services:`
- This is a warning, not an error, but it's been removed for cleanliness

---

## Error 2: RTPEngine "Invalid interface specification"

### Error Message
```
CRIT: [core] Fatal error: Invalid interface specification: 'internal'
CRIT: [core] Fatal error: Invalid interface specification: '0.0.0.0'
voip-rtpengine exited with code 255 (restarting)
```

### Cause
RTPEngine requires a valid IP address for the interface parameter, not `0.0.0.0` or named interfaces

### Fix
✅ **Already Fixed!** The interface is now dynamically discovered

### Correct Configuration
```yaml
rtpengine:
  command: >
    sh -c "
    IP=$$(hostname -i | awk '{print $$1}');
    rtpengine
    --interface=$$IP              # Dynamically gets container IP
    --listen-ng=0.0.0.0:22222
    --foreground
    "
```

### What Changed
**Before** (incorrect):
```bash
--interface=internal/0.0.0.0  # ❌ Not recognized
--interface=0.0.0.0           # ❌ Not a valid IP for RTPEngine
```

**After** (correct):
```bash
IP=$(hostname -i | awk '{print $1}')
--interface=$IP               # ✅ Uses actual container IP (e.g., 172.18.0.5)
```

### Why This Works
- `hostname -i` gets the container's actual IP address
- RTPEngine needs a real routable IP, not `0.0.0.0`
- The IP is discovered dynamically at container startup
- Works across different Docker networks and configurations

---

## Error 3: Platform Mismatch

### Error Message
```
exec format error
```

### Cause
Image architecture doesn't match your system

### Configuration
✅ **Already Fixed!** All pre-built images use `linux/amd64`

**Pre-built images** (postgres, redis, rtpengine, freeswitch, livekit, etc.):
```yaml
image: drachtio/rtpengine:latest
platform: linux/amd64  # ✅ Always amd64 for pulled images
```

**Built images** (kamailio, drachtio-apps, dsiprouter, admin, nginx):
```yaml
build:
  context: ./kamailio
  platforms:
    - linux/amd64   # ✅ Builds for both platforms
    - linux/arm64
```

### Why amd64 for Pre-built Images?
- Most official Docker images are optimized for amd64
- Works on both Intel/AMD (native) and ARM (via emulation)
- Emulation on ARM is fast enough for these services
- Avoids platform-specific bugs

### When to Change Platform
**Only if you get errors on ARM systems**, try:
```yaml
platform: linux/arm64  # For native ARM support
```

But the default amd64 should work fine with Docker's emulation.

---

## Error 4: Port Already in Use

### Error Message
```
Error: bind: address already in use
```

### Quick Fix
```bash
# Find what's using the port (example: port 22222)
sudo lsof -i :22222

# Or
sudo netstat -tulpn | grep 22222

# Kill the process
sudo kill -9 [PID]

# Or change the port in docker-compose.yaml
ports:
  - "22223:22222/udp"  # Use different external port
```

### Common Conflicting Ports
- 5060 - SIP (might conflict with other VoIP software)
- 8080 - Web (might conflict with local dev servers)
- 5432 - PostgreSQL (might conflict with local PostgreSQL)

---

## Error 5: Permission Denied

### Error Message
```
Permission denied
Error response from daemon: failed to create shim task
```

### Fix
```bash
# Give Docker proper permissions (on Linux)
sudo usermod -aG docker $USER
newgrp docker

# On Mac - restart Docker Desktop

# Check Docker is running
docker info
```

---

## Error 6: Network Error / Can't Resolve Service Names

### Error Message
```
Could not resolve host: rtpengine
dial tcp: lookup rtpengine: no such host
```

### Cause
Services not on the same network

### Fix
✅ **Already Fixed!** All services are on `voip-network`

### Verify
```bash
# Check all services are on same network
docker network inspect voip-network

# Should show all 15 services
```

---

## Error 7: Health Check Failing

### Error Message
```
unhealthy
```

### Debug Steps
```bash
# 1. Check logs
docker-compose logs rtpengine

# 2. Check if service is actually running
docker-compose exec rtpengine ps aux

# 3. Manually test health check
docker-compose exec rtpengine nc -zvu localhost 22222

# 4. Check listening ports
docker-compose exec rtpengine netstat -tulpn
```

### Common Causes
- Service not fully started yet (wait 30s)
- Port not listening
- Health check command incorrect
- Container networking issue

---

## Error 8: Image Pull Failed

### Error Message
```
Error response from daemon: manifest for drachtio/rtpengine:latest not found
```

### Fix
```bash
# Pull images manually with specific tags
docker pull drachtio/rtpengine:latest

# Or use a specific version
docker pull drachtio/rtpengine:mr11.5.1.5

# Update docker-compose.yaml if needed
rtpengine:
  image: drachtio/rtpengine:mr11.5.1.5  # Specific version
```

---

## Error 9: Volume Mount Issues

### Error Message
```
Error response from daemon: invalid mount config
```

### Fix
```bash
# Create directories first
mkdir -p freeswitch/conf
mkdir -p freeswitch/recordings
mkdir -p postgres

# Fix permissions (Linux)
sudo chown -R $USER:$USER freeswitch/
sudo chown -R $USER:$USER postgres/

# On Mac, permissions are usually fine
```

---

## Error 10: Out of Memory

### Error Message
```
Cannot allocate memory
OOMKilled
```

### Fix
```bash
# Increase Docker memory limit (Docker Desktop)
# Settings → Resources → Memory → 4GB+

# Or in docker-compose.yaml add limits:
rtpengine:
  deploy:
    resources:
      limits:
        memory: 512M
      reservations:
        memory: 256M
```

---

## Quick Recovery Commands

### Complete Reset
```bash
# Stop everything
docker-compose down

# Remove all containers and volumes
docker-compose down -v

# Clean up Docker system
docker system prune -af

# Start fresh
docker-compose pull
docker-compose up -d
```

### Rebuild Single Service
```bash
# Rebuild and restart just RTPEngine
docker-compose up -d --build --force-recreate rtpengine

# View logs
docker-compose logs -f rtpengine
```

### Check System Health
```bash
# All services status
docker-compose ps

# Test suite
./test.sh

# Individual service logs
docker-compose logs [service-name]
```

---

## Platform-Specific Issues

### macOS (M1/M2/M3)

**Issue**: Some images don't support ARM64
```yaml
# Force emulation (slower but works)
platform: linux/amd64
```

**Issue**: Port forwarding doesn't work
```bash
# Use host networking might help
network_mode: host  # Only on Linux/Mac
```

### Linux

**Issue**: Docker needs sudo
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Windows (WSL2)

**Issue**: Path issues
```bash
# Use WSL2 paths, not Windows paths
# ✅ /home/user/voip-application
# ❌ C:\Users\user\voip-application
```

---

## Testing After Fixes

```bash
# 1. Start everything
docker-compose up -d

# 2. Wait for services
sleep 30

# 3. Run tests
./test.sh

# 4. Check specific service
docker-compose logs rtpengine | tail -20

# 5. Verify RTPEngine
docker-compose exec kamailio nc -zvu rtpengine 22222
# Should show: succeeded!
```

---

## Summary of Fixes Applied

✅ Removed obsolete `version` from docker-compose.yaml
✅ Fixed RTPEngine interface: `internal/0.0.0.0` → `0.0.0.0`
✅ Added `--foreground` flag to RTPEngine
✅ Updated health checks for reliability
✅ All services use netcat-openbsd
✅ Platform specifications added
✅ Complete documentation

**The system should now start without errors!** 🎉

---

## Still Having Issues?

1. **Check SERVICE_CHECKLIST.md** - Complete service reference
2. **Check RTPENGINE_TROUBLESHOOTING.md** - RTPEngine specific help
3. **Run test suite**: `./test.sh`
4. **View logs**: `docker-compose logs -f`
5. **Complete reset**: `docker-compose down -v && docker-compose up -d`
