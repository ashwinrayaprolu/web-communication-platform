# ⚠️ URGENT: Fix Drachtio "Invalid Message" Error

## You're Seeing This Error:

```
Client::read_handler client sent invalid message -- JSON message length not specified properly
ClientController::leave - Removed client, connection duration 10 seconds
```

**This is a REAL error** - your app is connecting and disconnecting every 10 seconds.

---

## 🚨 Run This ONE Command to Fix It:

```bash
cd voip-application
./fix_drachtio_now.sh
```

The script will:
1. ✅ Stop all services
2. ✅ Remove old Drachtio images
3. ✅ Pull stable version (0.8.20-rc3)
4. ✅ Rebuild apps with compatible client
5. ✅ Start everything
6. ✅ Verify it worked

**Time**: ~5 minutes

---

## Manual Fix (If Script Doesn't Work)

### Step 1: Stop Everything
```bash
docker-compose down
```

### Step 2: Remove Old Images
```bash
# Remove the 'latest' image
docker rmi drachtio/drachtio-server:latest

# List images to verify
docker images | grep drachtio
```

### Step 3: Pull Stable Version
```bash
# Pull 0.8.20-rc3 (NOT latest!)
docker pull drachtio/drachtio-server:0.8.20-rc3

# Verify
docker images | grep drachtio-server
# Should show: 0.8.20-rc3
```

### Step 4: Rebuild Apps
```bash
# Rebuild with --no-cache to ensure fresh install
docker-compose build --no-cache drachtio-app-1 drachtio-app-2
```

### Step 5: Start
```bash
docker-compose up -d
```

### Step 6: Verify Fix Worked

**Check for errors** (should be EMPTY):
```bash
docker-compose logs drachtio-1 | grep "invalid message"
# Nothing = GOOD! ✅
```

**Check connection** (should see this):
```bash
docker-compose logs drachtio-app-1 | grep "Connected to Drachtio"
# Output: Connected to Drachtio server at drachtio-1:9022 ✅
```

**Watch real-time**:
```bash
docker-compose logs -f drachtio-1
# Should NOT see "invalid message" repeating
```

---

## Why This Happens

### The Problem

Your containers are still using the **old** `drachtio-server:latest` image from Docker Hub cache.

Even though `docker-compose.yaml` says `0.8.20-rc3`, Docker uses the cached `latest` image until you explicitly pull the new one.

### The Fix

Force Docker to download the correct version:
```bash
docker-compose pull drachtio-1 drachtio-2
```

This downloads `0.8.20-rc3` and overwrites the cached `latest`.

---

## Verify You're Running the Right Version

### Check What's Configured

```bash
grep "drachtio-server" docker-compose.yaml
# Should show: image: drachtio/drachtio-server:0.8.20-rc3
```

### Check What's Actually Running

```bash
docker-compose ps --format "{{.Image}}" | grep drachtio
# Should show: drachtio/drachtio-server:0.8.20-rc3
# NOT: drachtio/drachtio-server:latest
```

### Check Server Version Inside Container

```bash
docker-compose exec drachtio-1 drachtio --version
# Should show: 0.8.20-something
```

---

## Common Mistakes

### ❌ Mistake 1: Not Pulling New Image

```bash
# This is NOT enough:
docker-compose up -d

# You MUST do this first:
docker-compose pull
```

### ❌ Mistake 2: Not Rebuilding Apps

```bash
# After changing package.json, you MUST rebuild:
docker-compose build --no-cache drachtio-app-1 drachtio-app-2
```

### ❌ Mistake 3: Using Cached Image

Docker caches images. Even if docker-compose.yaml says `0.8.20-rc3`, it might use cached `latest`.

**Solution**: Remove old image first:
```bash
docker rmi drachtio/drachtio-server:latest
```

---

## Still Seeing Errors?

### Option 1: Nuclear Reset

```bash
# Stop everything
docker-compose down

# Remove ALL Drachtio images
docker images | grep drachtio | awk '{print $3}' | xargs docker rmi -f

# Remove ALL containers
docker-compose rm -f

# Pull fresh
docker-compose pull

# Build fresh
docker-compose build --no-cache

# Start
docker-compose up -d
```

### Option 2: Check What's Actually Running

```bash
# Run the version check script
./check_versions.sh

# This shows:
# - What's in docker-compose.yaml
# - What's actually running
# - Version inside containers
```

### Option 3: Watch Startup

```bash
# Start with logs visible
docker-compose up drachtio-1 drachtio-app-1

# Watch for:
# ✅ "listening for TCP admin connections"  (server ready)
# ✅ "Connected to Drachtio server"         (client connected)
# ❌ "client sent invalid message"          (still broken)
```

---

## Expected Output After Fix

### Drachtio Server (Good)

```
2026-01-03 03:30:00 drachtio-server[1]: drachtio_server/0.8.20-rc3 starting
2026-01-03 03:30:00 drachtio-server[1]: listening for TCP admin connections on 0.0.0.0:9022
2026-01-03 03:30:15 ClientController::join - Added client, count of connected clients is now: 1
```

**No "invalid message" errors** ✅  
**Connection stays stable** ✅

### Drachtio App (Good)

```
INFO: Connected to Drachtio server at drachtio-1:9022
INFO: Connected to Redis
INFO: Connected to PostgreSQL  
INFO: All services connected
```

**No reconnections every 10 seconds** ✅

---

## Quick Test

After running the fix:

```bash
# 1. Open browser
open http://localhost

# 2. Make call to 9999

# 3. Watch logs
docker-compose logs -f drachtio-app-1

# Should see:
# INFO: Incoming call: ...
# (No connection errors!)
```

---

## Summary

✅ **Problem**: Using cached `drachtio-server:latest` (unstable dev version)  
✅ **Solution**: Pull and use `drachtio-server:0.8.20-rc3` (stable version)  
✅ **How**: Run `./fix_drachtio_now.sh`  
✅ **Time**: ~5 minutes  
✅ **Result**: Stable connections, no more errors  

**Just run the fix script and it will work!** 🎉
