# Quick Start After Drachtio Version Fix

## 🚨 Important: Apply This Fix First!

If you're seeing this error:
```
Client::read_handler client sent invalid message -- JSON message length not specified properly
```

**Follow these exact steps:**

---

## Step 1: Stop Everything

```bash
cd voip-application
docker-compose down
```

---

## Step 2: Pull New Drachtio Server Image

The fix uses a stable version instead of `latest`:

```bash
# Pull the stable 0.8.20-rc3 version
docker-compose pull drachtio-1 drachtio-2

# Verify versions
docker-compose config | grep drachtio-server

# Should show:
# image: drachtio/drachtio-server:0.8.20-rc3
```

---

## Step 3: Rebuild Apps

The apps now use compatible drachtio-srf version:

```bash
# Rebuild with new drachtio-srf 4.5.24
docker-compose build --no-cache drachtio-app-1 drachtio-app-2
```

---

## Step 4: Start Everything

```bash
./start.sh
```

Or manually:
```bash
docker-compose up -d
```

---

## Step 5: Verify the Fix

### Check Apps Connected

```bash
# App 1
docker-compose logs drachtio-app-1 | grep "Connected to Drachtio"

# App 2  
docker-compose logs drachtio-app-2 | grep "Connected to Drachtio"

# Should see:
# Connected to Drachtio server at drachtio-1:9022 ✅
# Connected to Drachtio server at drachtio-2:9023 ✅
```

### Check NO Errors

```bash
# This should return NOTHING
docker-compose logs drachtio-1 drachtio-2 | grep "invalid message"

# If empty output = GOOD! ✅
```

### Check Connection Status

```bash
# See how many clients connected
docker-compose logs drachtio-1 | grep "count of connected clients"

# Should see:
# count of connected clients is now: 1
# (And it should STAY connected, not disconnect)
```

---

## What Was Changed

### docker-compose.yaml

**Before** (broken):
```yaml
drachtio-1:
  image: drachtio/drachtio-server:latest  # ❌ Unstable
```

**After** (working):
```yaml
drachtio-1:
  image: drachtio/drachtio-server:0.8.20-rc3  # ✅ Stable
```

### package.json

**Before** (broken):
```json
"drachtio-srf": "^4.5.0"  // ❌ Too old
```

**After** (working):
```json
"drachtio-srf": "^4.5.24"  // ✅ Compatible with 0.8.20
```

---

## Still Having Issues?

### Issue: Apps keep disconnecting

```bash
# Check logs in real-time
docker-compose logs -f drachtio-app-1

# Look for:
# "Connected to Drachtio server at..." (good)
# "Drachtio connection error" (bad)
```

### Issue: Server shows "invalid message"

This means version mismatch. Verify:

```bash
# Check server version
docker-compose exec drachtio-1 drachtio --version

# Should show: 0.8.20-rc3

# Check client version in container
docker-compose exec drachtio-app-1 npm list drachtio-srf

# Should show: drachtio-srf@4.5.24
```

### Issue: "Error connecting to Drachtio"

```bash
# Test network connectivity
docker-compose exec drachtio-app-1 nc -zv drachtio-1 9022

# Should show:
# drachtio-1 (172.x.x.x:9022) open
```

---

## Complete Reset (Nuclear Option)

If nothing works, do a complete reset:

```bash
# 1. Stop and remove everything
docker-compose down -v

# 2. Remove images
docker-compose down --rmi all

# 3. Clean Docker
docker system prune -a

# 4. Start fresh
docker-compose build --no-cache
docker-compose up -d

# 5. Watch startup
docker-compose logs -f
```

---

## Expected Output After Fix

### Drachtio Server Logs (Good)

```
2026-01-03 03:30:00 drachtio-server[1]: listening for TCP admin connections on 0.0.0.0:9022
2026-01-03 03:30:15 ClientController::join - Added client, count of connected clients is now: 1
```

**No "invalid message" errors!** ✅

### Drachtio App Logs (Good)

```
INFO: Connected to Drachtio server at drachtio-1:9022
INFO: Connected to Redis
INFO: Connected to PostgreSQL
INFO: All services connected
```

---

## Test the System

Once connected, test a call:

```bash
# 1. Open browser
open http://localhost

# 2. Make call to extension 9999 (IVR)

# 3. Watch app logs
docker-compose logs -f drachtio-app-1

# Should see:
# INFO: Incoming call: sip:user@... -> sip:9999@...
```

---

## Version Reference

### Working Combination

| Component | Version | Why |
|-----------|---------|-----|
| drachtio-server | 0.8.20-rc3 | Stable, tested |
| drachtio-srf | 4.5.24 | Compatible protocol |
| Node.js | 18+ | LTS version |

### Don't Use

| Component | Version | Problem |
|-----------|---------|---------|
| drachtio-server | latest | Unstable dev version |
| drachtio-srf | <4.5.20 | Old protocol |

---

## Summary

✅ **Server**: Use pinned version `0.8.20-rc3`  
✅ **Client**: Use `drachtio-srf@4.5.24`  
✅ **Result**: Stable connection, no protocol errors  

**The fix is already applied in the package!** Just rebuild and restart. 🎉
