# Audio Features & Text-to-Speech (TTS)

## Overview

The VoIP application now includes professional audio feedback and text-to-speech capabilities for enhanced IVR experiences.

## Features

### 🔊 Audio Feedback
- **Ringing Tones**: Hear realistic ringing while calls connect
- **Connection Sounds**: Pleasant tones indicate successful connection
- **Hold Music**: Background music while waiting for agents
- **Status Tones**: Different tones for success, error, transfer, etc.

### 🎙️ Text-to-Speech (TTS)
- **Chatterbox-Turbo**: Lightweight, fast TTS engine
- **Dynamic Prompts**: Generate audio on-the-fly from text
- **Caching**: Pre-generated prompts cached for performance
- **Multiple Voices**: Default, male, female voice options
- **Speed Control**: Adjust speech rate (0.5x - 2.0x)

### 📢 IVR Enhancements
- **Welcome Messages**: Professional greetings
- **Menu Prompts**: Clear, synthesized menu options
- **Transfer Notifications**: "Transferring to sales..."
- **Error Messages**: "Invalid option, please try again"
- **Goodbye Messages**: Polite call endings

---

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ SIP/WebRTC
       ▼
┌─────────────┐
│  Kamailio   │
└──────┬──────┘
       │ SIP
       ▼
┌─────────────┐      ┌──────────────┐
│  Drachtio   │─────▶│ TTS Service  │
│             │      │ (Chatterbox) │
└──────┬──────┘      └──────────────┘
       │                     │
       ▼                     │ Audio Files
┌─────────────┐             │
│ FreeSWITCH  │◀────────────┘
│ (Media)     │
└─────────────┘
```

**Call Flow with Audio**:
1. Browser calls → Kamailio → Drachtio
2. Drachtio plays ringing tone
3. Connection sound when call answers
4. TTS service generates IVR prompt
5. FreeSWITCH plays generated audio
6. User hears professional voice prompts

---

## Services

### TTS Service (Port 8000)

**Container**: `voip-tts-service`

**Endpoints**:
- `GET /health` - Health check
- `POST /tts` - Generate speech from text
- `POST /tts/phrase` - Quick phrase synthesis

**Example API Call**:
```bash
curl -X POST http://localhost:8000/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Welcome to our service",
    "voice": "default",
    "speed": 1.0,
    "cache": true
  }'
```

**Response**:
```json
{
  "success": true,
  "file_path": "/app/output/abc123.wav",
  "message": "Speech synthesized successfully"
}
```

---

## Usage in Drachtio Apps

### Import Audio Helper

```javascript
const audioHelper = require('./audioHelper');
```

### Play Welcome Message

```javascript
// Play ringing tone
await audioHelper.playRingingTone(endpoint);

// Play connection sound
await audioHelper.playConnectionSound(endpoint);

// Play welcome with TTS
await audioHelper.playWelcome(endpoint);
```

### Speak Custom Text

```javascript
// Use TTS to speak any text
await audioHelper.speak(
  endpoint,
  'Thank you for calling. An agent will be with you shortly.',
  {
    voice: 'default',
    speed: 1.0,
    fallbackAudio: '/path/to/fallback.wav'
  }
);
```

### Play IVR Menu

```javascript
const menuText = 'Press 1 for sales, press 2 for support, press 3 for billing';
await audioHelper.playMenu(endpoint, menuText);
```

### Transfer Notification

```javascript
await audioHelper.playTransferring(endpoint, 'sales department');
```

### Collect DTMF with Prompt

```javascript
const digits = await audioHelper.collectDigits(
  endpoint,
  'Please enter your account number followed by the pound key',
  {
    minDigits: 1,
    maxDigits: 10,
    timeout: 10000,
    terminators: '#'
  }
);
```

---

## Pre-generated Audio Prompts

### Generate Common Prompts

```bash
cd audio-prompts
./generate_prompts.sh
```

**Generated Files**:
- `welcome.wav` - "Welcome to our voice service..."
- `main_menu.wav` - "For sales press 1, for support press 2..."
- `connecting.wav` - "Please wait while we connect your call"
- `transferring.wav` - "Transferring your call now"
- `invalid_option.wav` - "Invalid option, please try again"
- `timeout.wav` - "We didn't receive your input"
- `goodbye.wav` - "Thank you for calling. Goodbye"

### Use Pre-generated Prompts

```javascript
await endpoint.execute('playback', '/app/prompts/welcome.wav');
```

---

## Audio Feedback Examples

### Example 1: Simple IVR with Feedback

```javascript
async function handleIVR(req, res) {
  const { endpoint, dialog } = await ms.connectCaller(req, res);
  
  try {
    // Play ringing
    await audioHelper.playRingingTone(endpoint);
    
    // Connection sound
    await audioHelper.playConnectionSound(endpoint);
    
    // Welcome
    await audioHelper.playWelcome(endpoint);
    
    // Menu
    await audioHelper.speak(
      endpoint,
      'For sales, press 1. For support, press 2. For billing, press 3.'
    );
    
    // Collect input
    const digits = await audioHelper.collectDigits(endpoint, null, {
      maxDigits: 1,
      timeout: 5000
    });
    
    if (digits === '1') {
      await audioHelper.playTransferring(endpoint, 'sales');
      // Transfer logic...
    }
    
  } catch (err) {
    logger.error('IVR error:', err);
    await audioHelper.playGoodbye(endpoint);
  }
}
```

### Example 2: Agent Queue with Hold Music

```javascript
async function queueForAgent(endpoint, department) {
  // Notify user
  await audioHelper.speak(
    endpoint,
    `You've reached ${department}. An agent will be with you shortly.`
  );
  
  // Play hold music while waiting
  await audioHelper.playHoldMusic(endpoint);
  
  // When agent available
  await audioHelper.playAgentConnecting(endpoint);
  
  // Connect to agent...
}
```

### Example 3: Error Handling

```javascript
async function handleInvalidInput(endpoint) {
  // Error tone + message
  await audioHelper.playInvalidOption(endpoint);
  
  // Replay menu
  await audioHelper.playMenu(endpoint, menuText);
}
```

---

## Configuration

### Environment Variables

**In docker-compose.yaml**:
```yaml
drachtio-app-1:
  environment:
    TTS_SERVICE_URL: http://tts-service:8000
```

### TTS Service Settings

**Resource Limits**:
```yaml
tts-service:
  deploy:
    resources:
      limits:
        memory: 2G      # Maximum memory
      reservations:
        memory: 512M    # Minimum memory
```

**Cache Settings**:
- **Location**: `/app/cache` (persistent volume)
- **Size**: Configurable via `CACHE_SIZE` env var
- **Auto-cleanup**: Oldest entries removed when full

---

## Testing

### Test TTS Service

```bash
# Check health
curl http://localhost:8000/health

# Generate test audio
curl -X POST http://localhost:8000/tts/phrase \
  -d "text=This is a test&voice=default"

# Response shows file path
```

### Test in IVR

1. Call extension `9999` (IVR)
2. Listen for:
   - ✅ Ringing tone before connection
   - ✅ Connection beep
   - ✅ Welcome message (TTS)
   - ✅ Menu options (TTS)
3. Press a digit
4. Listen for:
   - ✅ Transfer message (TTS)
   - ✅ Transfer tone

---

## Troubleshooting

### TTS Service Not Available

**Symptom**: Calls have no audio prompts

**Check**:
```bash
# Is service running?
docker-compose ps tts-service

# Check logs
docker-compose logs tts-service

# Test connectivity from drachtio app
docker-compose exec drachtio-app-1 nc -zv tts-service 8000
```

**Solution**: The app falls back to FreeSWITCH built-in sounds if TTS unavailable

### No Audio During Calls

**Symptom**: Silence instead of prompts

**Check**:
```bash
# Test FreeSWITCH audio
docker-compose exec freeswitch-1 fs_cli -x \
  "originate user/1000 &playback(/usr/local/freeswitch/sounds/en/us/callie/ivr/8000/ivr-welcome.wav)"

# Check audio files exist
docker-compose exec freeswitch-1 ls -la /usr/local/freeswitch/sounds/
```

### Robotic/Distorted Audio

**Symptom**: TTS sounds garbled

**Possible causes**:
- Wrong sample rate (should be 8kHz for telephony)
- Audio format mismatch
- Network issues causing packet loss

**Fix**: Check TTS service logs, verify 8kHz output

---

## Performance

### TTS Generation Speed
- **First request**: 1-3 seconds (model loading)
- **Cached**: <100ms (file retrieval)
- **Concurrent requests**: 10+ simultaneous

### Memory Usage
- **Base**: ~512MB (model loaded)
- **Per request**: ~10-50MB (temporary)
- **Cache**: ~1MB per audio file

### Best Practices
1. ✅ Pre-generate common prompts
2. ✅ Enable caching for repeated phrases
3. ✅ Use fallback audio for critical messages
4. ✅ Keep TTS text under 100 words per request

---

## Customization

### Add Custom Voices

Edit `tts/tts_server.py`:
```python
# Add voice models
VOICES = {
    'default': 'path/to/model1',
    'male': 'path/to/model2',
    'female': 'path/to/model3'
}
```

### Custom Audio Prompts

Add your own WAV files:
```bash
# Place files in audio-prompts/
cp my-greeting.wav audio-prompts/custom/

# Use in code
await endpoint.execute('playback', '/app/prompts/custom/my-greeting.wav');
```

### Adjust TTS Quality

```python
# In tts_server.py
SAMPLE_RATE = 22050  # Higher = better quality, slower
TELEPHONY_RATE = 8000  # Standard for VoIP
```

---

## Future Enhancements

Planned features:
- [ ] Multiple language support
- [ ] Voice cloning capabilities
- [ ] Real-time emotion detection
- [ ] Background noise suppression
- [ ] SSML support for prosody control
- [ ] Voice activity detection (VAD)

---

## Resources

- **Chatterbox-Turbo**: https://github.com/resemble-ai/chatterbox
- **FreeSWITCH Sounds**: https://freeswitch.org/confluence/display/FREESWITCH/Sound+Packages
- **Audio Format Standards**: ITU-T G.711 (8kHz, 16-bit PCM)

---

## Summary

✅ **Professional IVR**: Realistic audio feedback  
✅ **Dynamic TTS**: Generate prompts on-the-fly  
✅ **Performance**: Cached audio for speed  
✅ **Fallback**: Works even if TTS unavailable  
✅ **Easy Integration**: Simple API for drachtio apps  

Your callers now get a professional audio experience! 🎉
