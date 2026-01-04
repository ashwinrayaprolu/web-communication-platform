# How to Play Audio from Piper TTS Service

## 🎯 The Architecture

```
Browser (WebRTC Call)
    ↓
Kamailio (SIP Proxy)
    ↓
Drachtio Server
    ↓
Drachtio App (Node.js) ← You are here
    ↓
    ├──→ TTS Service (Piper) ── Generates WAV file
    └──→ FreeSWITCH (Media) ──── Plays WAV file to caller
```

## 🔧 How It Works

### Step 1: Drachtio App calls TTS Service
```javascript
// POST to http://tts-service:8000/tts
{
  "text": "Welcome to our service",
  "voice": "default",
  "speed": 1.0
}

// Response:
{
  "success": true,
  "file_path": "/app/output/abc123.wav"
}
```

### Step 2: Drachtio App tells FreeSWITCH to play the file
```javascript
await endpoint.play('/app/output/abc123.wav');
```

### Step 3: FreeSWITCH streams audio to caller
```
FreeSWITCH → RTP → Browser
```

---

## 📝 Complete Code Fix

### Add to top of index.js

```javascript
const axios = require('axios');

// TTS Service URL
const ttsServiceUrl = process.env.TTS_SERVICE_URL || 'http://tts-service:8000';
```

### Add TTS Helper Functions

```javascript
// Generate TTS audio file
async function generateTTS(text, voice = 'default', speed = 1.0) {
  try {
    logger.info(`Generating TTS: "${text.substring(0, 50)}..."`);
    
    const response = await axios.post(`${ttsServiceUrl}/tts`, {
      text: text,
      voice: voice,
      speed: speed,
      cache: true
    }, {
      timeout: 10000  // 10 second timeout
    });
    
    if (response.data && response.data.file_path) {
      logger.info(`TTS file generated: ${response.data.file_path}`);
      return response.data.file_path;
    }
    
    throw new Error('TTS service returned invalid response');
  } catch (err) {
    logger.error(`TTS generation failed: ${err.message}`);
    throw err;
  }
}

// Play TTS via FreeSWITCH endpoint
async function playTTS(endpoint, text, voice = 'default', speed = 1.0) {
  try {
    // 1. Generate audio file via TTS service
    const audioFile = await generateTTS(text, voice, speed);
    
    // 2. Play the file via FreeSWITCH
    logger.info(`Playing TTS audio: ${audioFile}`);
    await endpoint.play(audioFile);
    
    logger.info('TTS playback completed');
  } catch (err) {
    logger.error(`TTS playback error: ${err.message}`);
    
    // Fallback: play tone if TTS fails
    logger.info('Playing fallback tone...');
    await endpoint.execute('playback', 'tone_stream://%(200,0,800)');
  }
}
```

### Update playIVRMenu Function

```javascript
async function playIVRMenu(callId, menuId, endpoint) {
  try {
    logger.info(`Playing IVR menu: ${menuId}`);
    
    const result = await pgPool.query(
      'SELECT * FROM ivr_menus WHERE menu_id = $1',
      [menuId]
    );

    if (result.rows.length === 0) {
      logger.error(`Menu not found: ${menuId}`);
      await playTTS(endpoint, 'Menu not found. Goodbye.');
      return;
    }

    const menu = result.rows[0];
    
    // Play welcome message using Piper TTS
    await playTTS(endpoint, menu.welcome_message);

    // Update current menu
    const call = activeCalls.get(callId);
    if (call) {
      call.currentMenu = menuId;
    }
  } catch (err) {
    logger.error('Error playing IVR menu:', err);
  }
}
```

### Update handleDTMF Function

```javascript
async function handleDTMF(callId, digit, endpoint) {
  try {
    const call = activeCalls.get(callId);
    if (!call) return;

    const currentMenu = call.currentMenu;

    const result = await pgPool.query(
      'SELECT * FROM ivr_menu_options WHERE menu_id = $1 AND digit = $2',
      [currentMenu, digit]
    );

    if (result.rows.length === 0) {
      // Invalid option - use TTS
      await playTTS(endpoint, 'Invalid selection. Please try again.');
      await playIVRMenu(callId, currentMenu, endpoint);
      return;
    }

    const option = result.rows[0];

    if (option.action_type === 'menu') {
      await playIVRMenu(callId, option.action_value, endpoint);
    } else if (option.action_type === 'transfer') {
      // Transfer to agent - use TTS
      await playTTS(endpoint, `Transferring you to extension ${option.action_value}`);
      // Implement transfer logic here
    }
  } catch (err) {
    logger.error('Error handling DTMF:', err);
  }
}
```

---

## 🐛 Common Issues

### Issue 1: "Cannot hear audio"

**Cause**: File path mismatch between TTS service and FreeSWITCH

**Solution**: Mount shared volume

```yaml
# docker-compose.yaml
tts-service:
  volumes:
    - tts-output:/app/output

freeswitch-1:
  volumes:
    - tts-output:/app/output  # Same volume!

volumes:
  tts-output:
```

### Issue 2: "TTS service unreachable"

**Test**:
```bash
docker-compose exec drachtio-app-2 nc -zv tts-service 8000
```

**Fix**: Ensure TTS service is running
```bash
docker-compose ps tts-service
docker-compose logs tts-service
```

### Issue 3: "endpoint.play() not working"

**Your code has TWO different approaches**:

**Approach A** (connectCaller - Returns endpoint):
```javascript
const { endpoint, dialog } = await ms.connectCaller(req, res);
await endpoint.play('/app/output/file.wav');  // ✅ Works
```

**Approach B** (createUAS - Returns ms):
```javascript
const { endpoint, dialog } = await srf.createUAS(req, res, { localSdp: ms.local.sdp });
await ms.api('playback', '/app/output/file.wav');  // ✅ Different method
```

**Your IVR code uses Approach A**, so use `endpoint.play()`.

---

## ✅ Complete Working Example

```javascript
async function handleIVRCall(req, res, callId, from, to) {
  let ms, endpoint, dialog;
  
  try {
    logger.info(`Starting IVR call: ${callId}`);
    
    // 1. Connect to FreeSWITCH
    ms = await mrf.connect({
      address: 'freeswitch-2',
      port: 8021,
      secret: 'JambonzR0ck$'
    });
    
    // 2. Connect caller (creates endpoint)
    const result = await ms.connectCaller(req, res);
    endpoint = result.endpoint;
    dialog = result.dialog;
    
    logger.info(`Caller connected: ${callId}`);
    
    // 3. Play welcome via TTS
    await playTTS(endpoint, 'Welcome to our service. For sales press 1, for support press 2.');
    
    // 4. Handle DTMF
    endpoint.on('dtmf', async (evt) => {
      const digit = evt.dtmf?.digit || evt.digit;
      logger.info(`Received DTMF: ${digit}`);
      
      if (digit === '1') {
        await playTTS(endpoint, 'You selected sales.');
      } else if (digit === '2') {
        await playTTS(endpoint, 'You selected support.');
      } else {
        await playTTS(endpoint, 'Invalid option.');
      }
    });
    
    // 5. Handle hangup
    dialog.on('destroy', () => {
      logger.info(`Call ended: ${callId}`);
      endpoint.destroy();
      ms.disconnect();
    });
    
  } catch (err) {
    logger.error(`IVR error: ${err.message}`);
    if (endpoint) endpoint.destroy();
    if (ms) ms.disconnect();
    throw err;
  }
}
```

---

## 🧪 Testing

### 1. Test TTS Service

```bash
# Test TTS service directly
curl -X POST http://localhost:8000/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voice": "default", "speed": 1.0}'

# Response should show file path:
{
  "success": true,
  "file_path": "/app/output/abc123.wav"
}
```

### 2. Check Volumes Are Shared

```bash
# Generate file via TTS
docker-compose exec tts-service ls -la /app/output/

# Check FreeSWITCH can see it
docker-compose exec freeswitch-2 ls -la /app/output/

# Should show same files!
```

### 3. Test from Drachtio App

```bash
# Watch logs
docker-compose logs -f drachtio-app-2

# Make call to 9999
# Should see:
# INFO: Generating TTS: "Welcome..."
# INFO: TTS file generated: /app/output/abc123.wav
# INFO: Playing TTS audio: /app/output/abc123.wav
# INFO: TTS playback completed
```

---

## 📦 Required Changes

### 1. Update docker-compose.yaml

```yaml
services:
  tts-service:
    volumes:
      - tts-output:/app/output  # Output directory
      - tts-cache:/app/cache    # Cache directory

  freeswitch-1:
    volumes:
      - tts-output:/app/output  # ← Mount same volume!

  freeswitch-2:
    volumes:
      - tts-output:/app/output  # ← Mount same volume!

volumes:
  tts-output:
  tts-cache:
```

### 2. Ensure axios is installed

```json
// package.json
{
  "dependencies": {
    "axios": "^1.6.0"  // Should already be there
  }
}
```

### 3. Rebuild and restart

```bash
docker-compose build drachtio-app-2
docker-compose up -d drachtio-app-2
```

---

## 🎉 Result

When someone calls 9999:

1. ✅ Drachtio receives call
2. ✅ Connects to FreeSWITCH via `ms.connectCaller()`
3. ✅ Calls TTS service: `POST /tts` with text
4. ✅ TTS generates WAV file: `/app/output/abc123.wav`
5. ✅ Drachtio tells FreeSWITCH: `endpoint.play('/app/output/abc123.wav')`
6. ✅ FreeSWITCH streams audio to caller
7. ✅ Caller hears natural Piper voice! 🎙️

**You should now hear the TTS audio!** 🎉
