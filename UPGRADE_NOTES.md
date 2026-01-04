# Upgrade Notes - Pre-built Docker Images

## Summary of Changes

This version now uses **official pre-built Docker images** for better reliability and faster deployment.

## What Changed

### 1. ✅ RTPEngine - Official Image

**Before**:
```yaml
rtpengine:
  build:
    context: ./rtpengine  # Built from source - prone to errors
```

**After**:
```yaml
rtpengine:
  image: drachtio/rtpengine:latest  # Official pre-built image
  platform: linux/arm64
```

**Benefits**:
- No build errors from missing repositories
- Faster deployment (no compile time)
- Tested and maintained by community
- Multi-architecture support

### 2. ✅ FreeSWITCH - Official MRF Image

**Before**:
```yaml
freeswitch-1:
  build:
    context: ./freeswitch  # Built from SignalWire repo
  platform: linux/arm64
```

**After**:
```yaml
freeswitch-1:
  image: drachtio/drachtio-freeswitch-mrf:latest
  platform: linux/amd64  # Official image uses amd64
```

**Benefits**:
- Pre-configured for media resource function (MRF)
- Includes drachtio-fsmrf integration
- No repository key issues
- Ready-to-use configuration

**New Features**:
- **200 RTP ports** per instance (vs 11 before)
  - FreeSWITCH-1: 16384-16583
  - FreeSWITCH-2: 16584-16783
- Separate volumes for logs and database per instance
- Built-in sound files (SOUNDS_VERSION=1.0.52)

### 3. ✅ All Dockerfiles - netcat-openbsd

**Changed in**:
- kamailio/Dockerfile
- rtpengine/Dockerfile (backup)
- dsiprouter/Dockerfile

**Before**:
```dockerfile
RUN apt-get install -y netcat
```

**After**:
```dockerfile
RUN apt-get install -y netcat-openbsd
```

**Why**: netcat-openbsd is more reliable and consistent across platforms

## Port Changes

### FreeSWITCH RTP Ports

| Instance | Old Range | New Range | Ports |
|----------|-----------|-----------|-------|
| FreeSWITCH-1 | 16384-16394 | 16384-16583 | 200 |
| FreeSWITCH-2 | 16395-16405 | 16584-16783 | 200 |

**Impact**: Can now handle **~100 concurrent calls per FreeSWITCH instance** (2 ports per call)

### Volume Mounts

**New FreeSWITCH volumes**:
```yaml
volumes:
  - ./freeswitch/conf:/usr/local/freeswitch/conf
  - ./freeswitch/recordings:/usr/local/freeswitch/recordings
  - ./freeswitch/storage:/usr/local/freeswitch/storage
  - ./freeswitch/db-1:/usr/local/freeswitch/db        # Per-instance DB
  - ./freeswitch/logs-1:/usr/local/freeswitch/log     # Per-instance logs
```

## Migration Steps

### If Upgrading from Previous Version

```bash
# 1. Stop all services
docker-compose down

# 2. Pull new images
docker-compose pull

# 3. Remove old builds (optional but recommended)
docker system prune -f

# 4. Start services
docker-compose up -d

# 5. Verify everything is running
docker-compose ps
docker-compose logs -f
```

### First Time Setup

```bash
# No special steps - just run
docker-compose up -d
```

## Firewall Configuration

### Update firewall rules for new RTP ports:

```bash
# FreeSWITCH-1
sudo ufw allow 16384:16583/udp

# FreeSWITCH-2
sudo ufw allow 16584:16783/udp

# RTPEngine
sudo ufw allow 22222/udp
sudo ufw allow 30000:30100/udp
```

## Troubleshooting

### RTPEngine Not Starting

**Issue**: Container exits immediately

**Solution**: The official image handles everything automatically
```bash
docker-compose pull rtpengine
docker-compose up -d rtpengine
docker-compose logs rtpengine
```

### FreeSWITCH Platform Mismatch

**Issue**: `exec format error` on ARM systems

**Solution**: The official FreeSWITCH image is amd64 only. If you need ARM64:
```yaml
freeswitch-1:
  platform: linux/amd64  # Will use emulation on ARM (slower but works)
```

For native ARM64, you would need to build from source (not recommended).

### Volume Permission Issues

**Issue**: FreeSWITCH can't write to volumes

**Solution**: 
```bash
# Create directories with proper permissions
mkdir -p freeswitch/{conf,recordings,storage,db-1,db-2,logs-1,logs-2}
sudo chown -R 1000:1000 freeswitch/
```

## Performance Notes

### CPU Usage

- **RTPEngine**: Pre-built binary is optimized
- **FreeSWITCH**: Official image includes performance tuning

### Memory Usage

- FreeSWITCH MRF image: ~150-200MB per instance
- RTPEngine: ~50-100MB depending on call volume

### Concurrent Calls

With new port ranges:
- **Total RTP ports**: 400 (200 per FreeSWITCH)
- **Max concurrent calls**: ~200 (2 ports per call)
- **RTPEngine capacity**: ~5,000 calls (with 10,000 ports)

## Rollback Instructions

If you need to rollback to building from source:

```bash
# 1. Checkout previous version or modify docker-compose.yaml

# For RTPEngine - revert to build:
rtpengine:
  build:
    context: ./rtpengine

# For FreeSWITCH - revert to build:
freeswitch-1:
  build:
    context: ./freeswitch
  platform: linux/arm64
```

## Verification Checklist

After upgrading, verify:

- [ ] All containers are running: `docker-compose ps`
- [ ] RTPEngine listening: `docker-compose exec kamailio nc -zvu rtpengine 22222`
- [ ] FreeSWITCH responsive: `docker-compose exec freeswitch-1 fs_cli -x status`
- [ ] No error logs: `docker-compose logs | grep -i error`
- [ ] Test call works: Make call from browser to extension 6000
- [ ] Audio works: Verify RTPEngine converting media
- [ ] IVR works: Call extension 9999, press digits

## Benefits Summary

✅ **Faster Deployment**: No compilation time
✅ **No Build Errors**: Pre-tested images
✅ **Better Performance**: Optimized binaries
✅ **Easier Maintenance**: Just pull updates
✅ **More Capacity**: 200 RTP ports vs 11 per FreeSWITCH
✅ **Professional Setup**: Industry-standard images

## Questions?

See documentation:
- RTPENGINE_TROUBLESHOOTING.md - RTPEngine specific help
- MEDIA_FLOW_ARCHITECTURE.md - How media flows work
- architecture.md - Complete system architecture
