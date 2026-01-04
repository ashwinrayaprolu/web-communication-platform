# Mac Setup Guide (Apple Silicon & Intel)

## Quick Start for Mac

This guide helps you get the VoIP application running on macOS (both Intel and Apple Silicon M1/M2/M3).

---

## Prerequisites

### 1. Install Docker Desktop for Mac

**Download**: https://www.docker.com/products/docker-desktop

**Apple Silicon (M1/M2/M3)**:
- Download the Apple Silicon version
- Enable Rosetta emulation in Docker settings (optional, for Intel images)

**Intel Mac**:
- Download the Intel version

### 2. Configure Docker Resources

Open Docker Desktop → Preferences → Resources:

**Recommended Settings**:
- **CPUs**: 4-6 cores
- **Memory**: 8GB minimum (12GB recommended)
- **Swap**: 2GB
- **Disk**: 20GB minimum

**For best performance on Apple Silicon**:
- Enable "Use Rosetta for x86/amd64 emulation"
- Enable "VirtioFS" for faster file sharing

---

## Installation

### Step 1: Extract Application

```bash
unzip voip-piper-tts.zip
cd voip-application
```

### Step 2: Start the Application

```bash
./start.sh
```

The script will:
1. ✅ Check Docker is running
2. 🔨 Build images for your architecture (ARM64 or AMD64)
3. 🚀 Start services in proper dependency order
4. ⏳ Wait for each service to be healthy
5. ✅ Report when all services are ready

**First-time startup**: 5-10 minutes (downloading images)  
**Subsequent starts**: 1-2 minutes

---

## Architecture-Specific Notes

### Apple Silicon (M1/M2/M3)

The application automatically builds ARM64 versions of services:

**Built for ARM64** (native, fast):
- Kamailio
- Drachtio apps
- dSIPRouter
- Admin Dashboard
- Nginx
- TTS Service ← **Uses ARM64 Piper binary!**

**Run via emulation** (slower but works):
- PostgreSQL
- Redis
- RTPEngine
- FreeSWITCH
- LiveKit
- Drachtio servers

**Performance**: Excellent! ARM64 services run natively, emulated services work fine for VoIP.

### Intel Mac

All services run natively at full speed.

---

## Monitoring Startup

### Watch All Services Start

```bash
# In another terminal
docker-compose logs -f
```

### Watch Specific Service

```bash
# Watch TTS service (important on Mac)
docker-compose logs -f tts-service

# Watch any service
docker-compose logs -f [service-name]
```

---

## Troubleshooting

### Issue: "Rosetta error" in TTS Service

**Symptom**:
```
rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2
```

**Solution**: ✅ **Already fixed!** The Dockerfile now detects your architecture and downloads the correct Piper binary (ARM64 for Apple Silicon, AMD64 for Intel).

**Verify fix**:
```bash
docker-compose logs tts-service | grep "Installing Piper"

# Should see:
# Installing Piper for ARM64 (Mac M1/M2/M3)...
```

### Issue: Services Not Starting

**Check Docker**:
```bash
docker info
```

**Check logs**:
```bash
docker-compose logs [service-name]
```

**Restart specific service**:
```bash
docker-compose restart [service-name]
```

### Issue: Out of Memory

**Symptoms**:
- Services crash randomly
- Docker shows memory warnings

**Solution**:
1. Open Docker Desktop → Preferences → Resources
2. Increase memory to 10-12GB
3. Restart Docker
4. Run `./start.sh` again

### Issue: Slow Performance

**On Apple Silicon**:
1. Enable Rosetta in Docker settings
2. Enable VirtioFS for file sharing
3. Allocate more CPU cores (4-6)

**On Intel**:
1. Allocate more resources
2. Close other applications

---

## Verifying Everything Works

### 1. Check All Services

```bash
docker-compose ps

# All should show "Up" and "healthy"
```

### 2. Test TTS Service

```bash
curl http://localhost:8000/health

# Should return:
{
  "status": "healthy",
  "engine": "piper",
  "voices": ["en_US-lessac-medium"]
}
```

### 3. Test Web Interface

Open browser:
- http://localhost → Main interface
- http://localhost:8000 → TTS service
- http://localhost:3000 → Admin dashboard

### 4. Make a Test Call

1. Open http://localhost
2. Click "Make Call"
3. Call extension 9999 (IVR)
4. You should hear:
   - 🔔 Ringing tone
   - 🔊 Connection beep
   - 🎙️ Natural voice: "Welcome to our service..."

---

## Performance Tips for Mac

### Best Practices

1. **Use Docker Desktop 4.x+**: Latest version has best Mac support
2. **Enable VirtioFS**: Faster file access on Apple Silicon
3. **Allocate enough memory**: 8GB minimum, 12GB ideal
4. **Use SSD**: Much faster than HDD
5. **Close other apps**: More resources for Docker

### Expected Performance

**Apple Silicon (M1/M2/M3)**:
- ARM64 services: Native speed (excellent)
- Emulated services: 70-90% native speed (good)
- TTS generation: 1-2 seconds (native ARM64 Piper)

**Intel Mac**:
- All services: Native speed
- TTS generation: 1-2 seconds

---

## Common Mac-Specific Commands

### View Docker Resource Usage

```bash
docker stats
```

### Clean Up Space

```bash
# Remove unused containers
docker system prune -a

# Remove volumes (CAUTION: deletes data)
docker volume prune
```

### Restart Everything

```bash
docker-compose down
./start.sh
```

### Check Architecture

```bash
# Check what architecture Docker is using
docker info | grep -i arch

# Check TTS service architecture
docker-compose exec tts-service uname -m

# arm64 = Apple Silicon (ARM)
# x86_64 = Intel (AMD64)
```

---

## Network Configuration

### Ports Used

Make sure these ports are available:

| Port | Service | Protocol |
|------|---------|----------|
| 80 | Nginx | HTTP |
| 443 | Nginx | HTTPS |
| 3000 | Admin Dashboard | HTTP |
| 5000 | dSIPRouter | HTTP |
| 5050 | PgAdmin | HTTP |
| 5060 | Kamailio | SIP/UDP |
| 5080-5081 | Drachtio | SIP/UDP |
| 5062-5063 | FreeSWITCH | SIP/UDP |
| 7880-7881 | LiveKit | HTTP/gRPC |
| 8000 | TTS Service | HTTP |
| 8080 | Kamailio WebSocket | WS |
| 22222 | RTPEngine | UDP |
| 30000-30100 | RTPEngine Media | UDP |
| 50000-50100 | LiveKit Media | UDP |

### Firewall

On macOS:
```bash
# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# If needed, allow Docker
System Preferences → Security & Privacy → Firewall → Firewall Options
→ Add Docker
```

---

## Development on Mac

### Live Code Editing

Volumes are mounted for live development:

```bash
# Edit Drachtio app
nano drachtio-apps/app-1/index.js

# Restart to apply changes
docker-compose restart drachtio-app-1
```

### Accessing Containers

```bash
# Shell into container
docker-compose exec tts-service bash

# Run commands
docker-compose exec postgres psql -U voip_user voip_db
```

---

## Uninstalling

### Stop and Remove Everything

```bash
# Stop all services
docker-compose down

# Remove with volumes (deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Full cleanup
docker system prune -a --volumes
```

---

## Getting Help

### Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs tts-service

# Follow logs
docker-compose logs -f tts-service

# Last N lines
docker-compose logs --tail=50 tts-service
```

### Check Service Health

```bash
# View health status
docker-compose ps

# Inspect specific service
docker inspect voip-tts-service | grep -i health -A 10
```

### Report Issues

When reporting issues, include:

1. Mac model (Intel or Apple Silicon)
2. macOS version
3. Docker Desktop version
4. Output of `docker-compose logs [service]`
5. Output of `docker info`

---

## Summary

✅ **Mac Support**: Full support for both Intel and Apple Silicon  
✅ **Auto-Detection**: Builds correct architecture automatically  
✅ **TTS Fixed**: ARM64 Piper binary for Apple Silicon  
✅ **Smart Startup**: Dependency-aware service ordering  
✅ **Performance**: Native speed on ARM64, good on emulation  

**Your VoIP system works great on Mac!** 🍎🎉
