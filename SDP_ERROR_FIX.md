# Cannot Read Properties of Undefined (reading 'sdp')

## Error Message

```
TypeError: Cannot read properties of undefined (reading 'sdp')
    at handleIVRCall (/app/index.js:171:26)
```

---

## What This Means

The Drachtio app successfully received a call, but **failed to create the media endpoint**. This happens when:

1. ❌ FreeSWITCH is not reachable
2. ❌ FreeSWITCH ESL (Event Socket Layer) is not listening
3. ❌ Wrong FreeSWITCH password
4. ❌ Network issue between drachtio-app and freeswitch

---

## Quick Fix

### Step 1: Check FreeSWITCH is Running

```bash
docker-compose ps freeswitch-1 freeswitch-2

# Both should show "Up" and "healthy"
```

### Step 2: Test ESL Connection

```bash
# Run the test script
./test_freeswitch.sh

# Or manually test:
docker-compose exec drachtio-app-1 nc -zv freeswitch-1 8021

# Should show:
# freeswitch-1 (172.x.x.x:8021) open
```

### Step 3: Check FreeSWITCH ESL Password

```bash
# Check environment variable
docker-compose exec drachtio-app-1 env | grep FREESWITCH_PASSWORD

# Should match docker-compose.yaml:
# FREESWITCH_PASSWORD=ClueCon
```

### Step 4: Restart Services

```bash
# Restart FreeSWITCH
docker-compose restart freeswitch-1 freeswitch-2

# Restart Drachtio apps
docker-compose restart drachtio-app-1 drachtio-app-2

# Check logs
docker-compose logs -f drachtio-app-1
```

---

## Root Cause Analysis

### The Error Chain

```
1. Browser calls extension 9999
   ↓
2. Drachtio app receives INVITE
   ↓
3. App tries to connect to FreeSWITCH ESL
   ↓
4. Connection FAILS ❌
   ↓
5. mrf.connect() returns undefined or invalid ms object
   ↓
6. srf.createUAS() fails because no valid SDP
   ↓
7. Result is undefined
   ↓
8. Accessing result.endpoint.sdp throws error
```

### Why FreeSWITCH Connection Fails

**Common Causes**:
1. FreeSWITCH not started yet
2. ESL module not loaded
3. Wrong password (default: ClueCon)
4. Network isolation (containers can't reach each other)
5. Port 8021 not exposed internally

---

## Detailed Diagnosis

### 1. Check FreeSWITCH ESL is Listening

```bash
# Inside FreeSWITCH container
docker-compose exec freeswitch-1 netstat -tuln | grep 8021

# Should show:
# tcp        0      0 0.0.0.0:8021            0.0.0.0:*               LISTEN
```

**If not listening**: FreeSWITCH ESL module didn't load

**Fix**:
```bash
# Check FreeSWITCH logs
docker-compose logs freeswitch-1 | grep -i "event socket"

# Should see:
# mod_event_socket.c:3249 Socket up listening on 0.0.0.0:8021
```

### 2. Test ESL Authentication

```bash
# Try to connect manually
docker-compose exec drachtio-app-1 sh -c '
  (echo "auth ClueCon"; sleep 1) | nc freeswitch-1 8021
'

# Should respond with:
# Content-Type: auth/request
# Content-Type: command/reply
# Reply-Text: +OK accepted
```

**If authentication fails**: Wrong password

**Fix**:
```yaml
# docker-compose.yaml
drachtio-app-1:
  environment:
    FREESWITCH_PASSWORD: ClueCon  # Must match FreeSWITCH config
```

### 3. Check Network Connectivity

```bash
# Can app reach FreeSWITCH?
docker-compose exec drachtio-app-1 ping -c 3 freeswitch-1

# Can resolve hostname?
docker-compose exec drachtio-app-1 nslookup freeswitch-1

# Can connect to port?
docker-compose exec drachtio-app-1 telnet freeswitch-1 8021
```

### 4. Check App Logs for Connection Errors

```bash
docker-compose logs drachtio-app-1 | grep -i freeswitch

# Look for:
# "Connecting to FreeSWITCH..." (trying)
# "FreeSWITCH connected" (success)
# "ECONNREFUSED" (can't connect)
# "ETIMEDOUT" (network issue)
# "Authentication failed" (wrong password)
```

---

## Solution: Improved Error Handling

### Before (Broken)

```javascript
const ms = await mrf.connect({ ... });

const { endpoint, dialog } = await srf.createUAS(req, res, {
  localSdp: ms.local.sdp  // Crashes if ms is invalid
});

activeCalls.set(callId, { dialog, endpoint, ms });
// endpoint is undefined, but code continues...
```

### After (Fixed)

```javascript
const ms = await mrf.connect({ ... });

const result = await srf.createUAS(req, res, {
  localSdp: ms.local.sdp
});

// Check result before using it
if (!result || !result.endpoint || !result.dialog) {
  throw new Error('Failed to create UAS');
}

const { endpoint, dialog } = result;
// Now safe to use
```

---

## Prevention

### 1. Wait for FreeSWITCH Before Starting Apps

Update `docker-compose.yaml`:

```yaml
drachtio-app-1:
  depends_on:
    freeswitch-1:
      condition: service_healthy  # Wait until healthy
```

### 2. Add Retry Logic

```javascript
async function connectWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const ms = await mrf.connect({ ... });
      return ms;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

### 3. Health Check FreeSWITCH ESL

Add to docker-compose.yaml:

```yaml
freeswitch-1:
  healthcheck:
    test: ["CMD", "nc", "-z", "localhost", "8021"]
    interval: 10s
    timeout: 5s
    retries: 3
```

---

## Expected Behavior After Fix

### Successful Call Flow

```
1. Browser calls 9999
   ↓
2. Drachtio app receives INVITE
   ↓
3. Log: "Connecting to FreeSWITCH for IVR call abc123"
   ↓
4. mrf.connect() succeeds
   ↓
5. Log: "FreeSWITCH connected, creating UAS for abc123"
   ↓
6. srf.createUAS() succeeds
   ↓
7. Log: "IVR call established for abc123"
   ↓
8. TTS plays: "Welcome to our service..."
```

### App Logs (Good)

```
INFO: Connecting to FreeSWITCH for IVR call 6a8f2c...
INFO: FreeSWITCH connected, creating UAS for 6a8f2c...
INFO: IVR call established for 6a8f2c...
INFO: Playing IVR menu: main
```

### App Logs (Bad - Connection Failed)

```
ERROR: Error in handleIVRCall for 6a8f2c: Error: connect ECONNREFUSED 172.20.0.5:8021
```

### App Logs (Bad - Authentication Failed)

```
ERROR: Error in handleIVRCall for 6a8f2c: Error: ESL authentication failed
```

---

## Verification Steps

### 1. Check All Services Healthy

```bash
docker-compose ps

# All should show "Up" and "healthy"
```

### 2. Test FreeSWITCH Connection

```bash
./test_freeswitch.sh

# All tests should pass
```

### 3. Make Test Call

```bash
# Open http://localhost
# Call extension 9999
# Should hear prompts (not error)
```

### 4. Watch Logs

```bash
docker-compose logs -f drachtio-app-1

# Should see successful connection messages
```

---

## Common Scenarios

### Scenario 1: FreeSWITCH Not Started Yet

**Symptoms**:
- `ECONNREFUSED` errors
- Apps start before FreeSWITCH

**Fix**: Use `start.sh` which starts services in order

### Scenario 2: Wrong Password

**Symptoms**:
- Connection succeeds but authentication fails
- `auth failed` in logs

**Fix**: Check `FREESWITCH_PASSWORD` matches `ClueCon`

### Scenario 3: Network Isolation

**Symptoms**:
- `EHOSTUNREACH` or `ETIMEDOUT`
- Ping fails between containers

**Fix**: Ensure all containers on same Docker network

### Scenario 4: Port Not Open

**Symptoms**:
- ESL not listening
- `netstat` doesn't show 8021

**Fix**: Check FreeSWITCH `event_socket.conf.xml`

---

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| endpoint undefined | FreeSWITCH unreachable | Check connectivity |
| ECONNREFUSED | FreeSWITCH not running | Start FreeSWITCH first |
| Auth failed | Wrong password | Use `ClueCon` |
| ETIMEDOUT | Network issue | Check Docker network |

**The fix is already applied** - rebuild and restart to apply it! ✅

---

## Quick Commands

```bash
# Rebuild with fix
docker-compose build drachtio-app-1 drachtio-app-2

# Restart
docker-compose restart drachtio-app-1 drachtio-app-2 freeswitch-1 freeswitch-2

# Test
./test_freeswitch.sh

# Make call
# Open http://localhost, call 9999
```

The improved error handling will now show exactly what failed! 🎉
