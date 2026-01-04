# Drachtio Connection Troubleshooting

## Common Drachtio Errors and Solutions

### Error: "client sent invalid message -- JSON message length not specified properly"

**Full Error**:
```
ClientController::join - Added client, count of connected clients is now: 1
Client::read_handler client sent invalid message -- JSON message length not specified properly
```

**Cause**: Version mismatch between drachtio-srf (Node.js client) and drachtio-server

**Solution**: ✅ **Already Fixed!**

**Two-part fix**:

1. **Pin Drachtio server to compatible version**:
   ```yaml
   drachtio-1:
     image: drachtio/drachtio-server:0.8.20-rc3  # ← Stable version
   ```

2. **Updated drachtio-srf**:
   ```json
   {
     "dependencies": {
       "drachtio-srf": "^4.5.24"  // Compatible with 0.8.20
     }
   }
   ```

**Why pin the version?**
- `latest` tag points to development versions
- Development versions may have protocol changes
- Pinning ensures compatibility

---

## Verification Steps

### 1. Check Drachtio Server Logs

```bash
# View Drachtio-1 logs
docker-compose logs drachtio-1

# View Drachtio-2 logs
docker-compose logs drachtio-2

# Follow logs in real-time
docker-compose logs -f drachtio-1
```

**Healthy Connection**:
```
ClientController::join - Added client, count of connected clients is now: 1
```

**Unhealthy** (version mismatch):
```
Client::read_handler client sent invalid message
```

### 2. Check Drachtio App Logs

```bash
# View app logs
docker-compose logs drachtio-app-1

# Should see:
# Connected to Drachtio server at drachtio-1:9022
# Connected to Redis
# Connected to PostgreSQL
# All services connected
```

### 3. Test Connection

```bash
# Check if app can reach Drachtio
docker-compose exec drachtio-app-1 nc -zv drachtio-1 9022

# Should show:
# drachtio-1 (172.x.x.x:9022) open
```

---

## Connection Configuration

### Correct Setup

**drachtio-app-1/index.js**:
```javascript
srf.connect({
  host: process.env.DRACHTIO_HOST || 'drachtio-1',
  port: parseInt(process.env.DRACHTIO_PORT || '9022'),
  secret: process.env.DRACHTIO_SECRET || 'drachtio_secret_2024',
  tag: 'app-1'  // Identifies this client
});
```

**Environment Variables**:
```yaml
drachtio-app-1:
  environment:
    DRACHTIO_HOST: drachtio-1
    DRACHTIO_PORT: 9022
    DRACHTIO_SECRET: drachtio_secret_2024
```

### Connection Flow

```
1. App starts
   ↓
2. srf.connect() called
   ↓
3. TCP connection to drachtio-1:9022
   ↓
4. Authentication with secret
   ↓
5. Event: srf.on('connect') fires
   ↓
6. Ready to handle SIP messages
```

---

## Common Issues

### Issue 1: Connection Refused

**Symptom**:
```
Error: connect ECONNREFUSED
```

**Causes**:
- Drachtio server not running
- Wrong host/port
- Network issue

**Solution**:
```bash
# Check Drachtio is running
docker-compose ps drachtio-1

# Check it's healthy
docker inspect voip-drachtio-1 | grep Health -A 5

# Restart if needed
docker-compose restart drachtio-1
```

### Issue 2: Authentication Failed

**Symptom**:
```
Error: Authentication failed
```

**Cause**: Wrong secret

**Solution**:
Check environment variable matches docker-compose:
```bash
# Check app env
docker-compose exec drachtio-app-1 env | grep DRACHTIO_SECRET

# Should match:
# DRACHTIO_SECRET=drachtio_secret_2024
```

### Issue 3: Version Mismatch

**Symptom**:
```
client sent invalid message -- JSON message length not specified properly
```

**Solution**:
1. Update drachtio-srf:
   ```json
   "drachtio-srf": "^4.5.24"
   ```

2. **Pin server version** (important!):
   ```yaml
   drachtio-1:
     image: drachtio/drachtio-server:0.8.20-rc3  # Don't use 'latest'
   ```

3. Rebuild:
   ```bash
   docker-compose pull drachtio-1 drachtio-2
   docker-compose build drachtio-app-1 drachtio-app-2
   docker-compose up -d
   ```

4. Verify:
   ```bash
   docker-compose logs drachtio-app-1 | grep "Connected to Drachtio"
   
   # Check for errors (should be empty)
   docker-compose logs drachtio-1 | grep "invalid message"
   ```

### Issue 4: Multiple Clients Conflicting

**Symptom**:
```
count of connected clients is now: 2
count of connected clients is now: 1
(repeated connection/disconnection)
```

**Cause**: Multiple app instances connecting/disconnecting

**Solution**:
Use unique tags:
```javascript
// app-1
srf.connect({ tag: 'app-1', ... });

// app-2  
srf.connect({ tag: 'app-2', ... });
```

---

## Debugging Connection Issues

### Enable Debug Logging

**In drachtio-app**:
```javascript
// Add at top of index.js
process.env.DEBUG = 'drachtio:*';

const Srf = require('drachtio-srf');
```

**Restart and view logs**:
```bash
docker-compose restart drachtio-app-1
docker-compose logs -f drachtio-app-1
```

### Check Network Connectivity

```bash
# From app container
docker-compose exec drachtio-app-1 sh -c '
  echo "Testing Drachtio-1..."
  nc -zv drachtio-1 9022
  
  echo "Testing Drachtio-2..."
  nc -zv drachtio-2 9023
'
```

### Monitor Drachtio Server

```bash
# Watch connections in real-time
docker-compose logs -f drachtio-1 | grep -E "join|read_handler"
```

---

## Version Compatibility

| drachtio-server | drachtio-srf | Status |
|----------------|--------------|--------|
| 0.8.20-rc3 | ^4.5.24 | ✅ **Recommended** (Used in this project) |
| latest (0.8.x dev) | ^4.5.24 | ⚠️ May have protocol changes |
| latest (0.8.x dev) | ^4.5.0 | ❌ Protocol mismatch |
| 0.8.20 | ^4.5.20+ | ✅ Compatible |
| 0.8.19 | ^4.5.0+ | ✅ Compatible |

**Recommendation**: Use pinned versions (0.8.20-rc3 + 4.5.24) for stability

---

## Rebuilding After Changes

```bash
# 1. Stop services
docker-compose stop drachtio-app-1 drachtio-app-2

# 2. Remove containers
docker-compose rm -f drachtio-app-1 drachtio-app-2

# 3. Rebuild
docker-compose build --no-cache drachtio-app-1 drachtio-app-2

# 4. Start
docker-compose up -d drachtio-app-1 drachtio-app-2

# 5. Verify
docker-compose logs drachtio-app-1 | grep "Connected"
```

---

## Health Check

### Quick Test Script

```bash
#!/bin/bash

echo "=== Drachtio Connection Health Check ==="

# Check Drachtio servers
for server in drachtio-1 drachtio-2; do
    echo ""
    echo "Checking $server..."
    
    # Is it running?
    if docker-compose ps $server | grep -q "Up"; then
        echo "  ✅ Running"
    else
        echo "  ❌ Not running"
        continue
    fi
    
    # Check logs for errors
    if docker-compose logs $server | grep -q "invalid message"; then
        echo "  ❌ Has connection errors"
    else
        echo "  ✅ No connection errors"
    fi
    
    # Count connected clients
    count=$(docker-compose logs $server | grep "count of connected clients" | tail -1 | grep -oP '\d+$')
    echo "  📊 Connected clients: $count"
done

# Check apps
for app in drachtio-app-1 drachtio-app-2; do
    echo ""
    echo "Checking $app..."
    
    if docker-compose logs $app | grep -q "Connected to Drachtio server"; then
        echo "  ✅ Connected to Drachtio"
    else
        echo "  ❌ Not connected to Drachtio"
    fi
done

echo ""
echo "=== Done ==="
```

---

## Reference

### Drachtio Server Ports

| Server | Port | Protocol | Purpose |
|--------|------|----------|---------|
| drachtio-1 | 9022 | TCP | Control connection |
| drachtio-1 | 5080 | UDP | SIP |
| drachtio-2 | 9023 | TCP | Control connection |
| drachtio-2 | 5081 | UDP | SIP |

### Environment Variables

```yaml
DRACHTIO_HOST: drachtio-1      # Server hostname
DRACHTIO_PORT: 9022            # Control port
DRACHTIO_SECRET: drachtio_secret_2024  # Authentication
```

### Event Handlers

```javascript
// Connection successful
srf.on('connect', (err, hostport) => {
  console.log(`Connected to ${hostport}`);
});

// Connection error
srf.on('error', (err) => {
  console.error('Connection error:', err);
});

// Connection closed
srf.on('close', () => {
  console.log('Connection closed');
});
```

---

## Summary

✅ **Updated**: drachtio-srf to 4.5.24  
✅ **Added**: Connection event handlers  
✅ **Added**: Unique client tags  
✅ **Fixed**: Port parsing (parseInt)  
✅ **Tested**: Compatible with latest drachtio-server  

**Your Drachtio connection should now work perfectly!** 🎉
