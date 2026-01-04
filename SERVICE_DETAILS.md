# Service Details - Complete Reference

## 📋 Table of Contents

1. [Core Infrastructure](#1-core-infrastructure)
2. [SIP Signaling Services](#2-sip-signaling-services)
3. [Media Processing Services](#3-media-processing-services)
4. [Video & Conferencing](#4-video--conferencing)
5. [Management & Web Services](#5-management--web-services)

---

## 1. Core Infrastructure

### 🗄️ PostgreSQL (Service #1)

**Purpose**: Primary relational database for persistent data storage

**Container**: `voip-postgres`  
**Image**: `postgres:16-alpine`  
**Port**: `5432`  
**Network**: Internal only

**Responsibilities**:
- 📊 Call Detail Records (CDR) storage
- 🎙️ IVR menu configuration
- 👥 Agent management and status
- 📈 Analytics and reporting data
- 🔍 Call history and search
- ⚙️ System configuration

**Database Schema**:
```sql
voip_db
├── call_logs
│   ├── call_id VARCHAR(255) PRIMARY KEY
│   ├── from_number VARCHAR(50)
│   ├── to_number VARCHAR(50)
│   ├── status VARCHAR(20)
│   ├── start_time TIMESTAMP
│   ├── end_time TIMESTAMP
│   ├── duration DECIMAL
│   └── recording_url TEXT
│
├── ivr_menus
│   ├── id SERIAL PRIMARY KEY
│   ├── menu_id VARCHAR(50) UNIQUE
│   ├── name VARCHAR(100)
│   └── welcome_message TEXT
│
├── ivr_menu_options
│   ├── id SERIAL PRIMARY KEY
│   ├── menu_id VARCHAR(50) REFERENCES ivr_menus(menu_id)
│   ├── digit VARCHAR(1)
│   ├── action_type VARCHAR(20)
│   └── action_value TEXT
│
├── agents
│   ├── id SERIAL PRIMARY KEY
│   ├── extension VARCHAR(20) UNIQUE
│   ├── name VARCHAR(100)
│   ├── email VARCHAR(100)
│   ├── status VARCHAR(20)
│   ├── current_calls INTEGER
│   └── total_calls INTEGER
│
└── active_calls
    ├── id SERIAL PRIMARY KEY
    ├── call_id VARCHAR(255)
    ├── from_number VARCHAR(50)
    ├── to_number VARCHAR(50)
    ├── agent_extension VARCHAR(20)
    ├── status VARCHAR(20)
    └── started_at TIMESTAMP
```

**Environment Variables**:
```bash
POSTGRES_DB=voip_db
POSTGRES_USER=voip_user
POSTGRES_PASSWORD=<secure_password>
```

**Health Check**:
```bash
pg_isready -U voip_user -d voip_db
```

**Volumes**:
- `postgres-data:/var/lib/postgresql/data` (persistent storage)

**Used By**:
- Drachtio Apps (call logging, IVR config)
- Admin Dashboard (monitoring, analytics)
- dSIPRouter (configuration)

---

### 🔴 Redis (Service #2)

**Purpose**: In-memory data store for caching and real-time state

**Container**: `voip-redis`  
**Image**: `redis:7-alpine`  
**Port**: `6379`  
**Network**: Internal only

**Responsibilities**:
- ⚡ Session caching
- 🔄 Real-time call state
- 🎥 LiveKit room information
- 🚦 Rate limiting
- 📢 Pub/Sub messaging
- 🔐 Token storage

**Data Structures**:
```
Redis Keys:

STRING: room:{call_id}
  → JSON object with LiveKit room details
  → TTL: 3600 seconds (1 hour)

HASH: session:{session_id}
  → call_id, state, agent, timestamp
  → TTL: 1800 seconds (30 minutes)

STRING: tts_cache:{text_hash}
  → File path to cached TTS audio
  → TTL: 86400 seconds (24 hours)

SET: active_calls
  → Set of currently active call IDs

SORTED SET: call_queue
  → Calls waiting for agents (scored by time)

PUBSUB: call_events
  → Real-time call events broadcast
```

**Common Operations**:
```bash
# Store LiveKit room
SET room:abc123 '{"roomName":"call-123","token":"xyz"}'

# Get session state
HGETALL session:def456

# Check active calls
SMEMBERS active_calls

# Publish call event
PUBLISH call_events '{"event":"new_call","callId":"abc123"}'
```

**Environment Variables**:
```bash
REDIS_PASSWORD=<secure_password>
```

**Health Check**:
```bash
redis-cli ping  # Returns: PONG
```

**Persistence**:
- RDB snapshots (optional)
- AOF (Append-Only File) for durability

**Used By**:
- Drachtio Apps (session management)
- Admin Dashboard (real-time stats)
- LiveKit integration (room tokens)

---

## 2. SIP Signaling Services

### 🔀 Kamailio (Service #3)

**Purpose**: SIP proxy, load balancer, and WebRTC gateway

**Container**: `voip-kamailio`  
**Image**: `kamailio/kamailio:5.7-alpine`  
**Ports**:
- `5060/UDP` - SIP
- `5060/TCP` - SIP
- `8080/TCP` - WebSocket (for WebRTC)

**Responsibilities**:
- 🔀 Load balance between Drachtio servers
- 🌐 WebRTC to SIP gateway
- 🛡️ SIP request routing and filtering
- 🔒 NAT traversal handling
- 📊 SIP message logging
- 🚦 Traffic management

**Architecture Role**:
```
Browser (WebRTC)
    ↓
WebSocket → Kamailio:8080
    ↓
Kamailio load balances to:
    ├─→ Drachtio-1:5080
    └─→ Drachtio-2:5081
```

**Configuration**:
```
/etc/kamailio/
├── kamailio.cfg          # Main configuration
├── dispatcher.list       # Load balancer targets
└── tls.cfg              # TLS settings (optional)

Dispatcher List:
1 sip:drachtio-1:5080 0 0
1 sip:drachtio-2:5081 0 0
```

**Key Features**:
- **Dispatcher Module**: Round-robin load balancing
- **WebSocket Module**: WebRTC support
- **NAT Traversal**: Fix Contact headers
- **SIP Routing**: Forward to appropriate backend

**Environment Variables**:
```bash
SIP_DOMAIN=localhost
EXTERNAL_IP=<your_public_ip>
```

**Health Check**:
```bash
# Check if Kamailio is listening
kamctl fifo get_statistics all

# Check dispatcher status
kamcmd dispatcher.list
```

**Used By**:
- WebRTC clients (browsers)
- SIP phones
- External SIP trunks

---

### 📞 Drachtio Server (Services #4 & #5)

**Purpose**: SIP server providing programmable call control

**Instances**:
- **Drachtio-1**: `voip-drachtio-1`, Port 5080, Control 9022
- **Drachtio-2**: `voip-drachtio-2`, Port 5081, Control 9023

**Image**: `drachtio/drachtio-server:0.8.20-rc3`

**Responsibilities**:
- 📞 SIP call processing
- 🎛️ Programmable call control (via Node.js apps)
- 🔄 High availability (2 instances)
- 📡 Event-driven architecture
- 🔌 ESL-like control protocol
- 🎯 Call routing decisions

**Architecture**:
```
Kamailio → Drachtio Server ← Drachtio App (Node.js)
             │                      │
         SIP Messages          Control Protocol
         (Port 5080)           (Port 9022)
```

**Control Protocol**:
- Apps connect to port 9022/9023
- JSON-based messaging
- Event-driven (INVITE, ACK, BYE, etc.)
- Request/response model

**Key Features**:
- **Full SIP B2BUA**: Back-to-back user agent
- **Media Anchoring**: Control media flow
- **Dialog Management**: Track call state
- **SDP Negotiation**: Handle media parameters

**Configuration**:
```xml
<!-- drachtio.conf.xml -->
<drachtio>
  <admin port="9022" secret="drachtio_secret_2024"/>
  <sip>
    <contacts>
      <contact>sip:*:5060;transport=udp</contact>
      <contact>sip:*:5060;transport=tcp</contact>
    </contacts>
  </sip>
</drachtio>
```

**Environment Variables**:
```bash
DRACHTIO_SECRET=drachtio_secret_2024
SOFIA_LOGLEVEL=3
```

**Health Check**:
```bash
# Check if listening
drachtio --version

# Check connections
netstat -an | grep 9022
```

**Used By**:
- Drachtio App 1
- Drachtio App 2

---

### 🎯 Drachtio Applications (Services #6 & #7)

**Purpose**: Business logic for call handling, IVR, and routing

**Instances**:
- **App-1**: `voip-drachtio-app-1`, connects to drachtio-1:9022
- **App-2**: `voip-drachtio-app-2`, connects to drachtio-2:9023

**Technology**: Node.js + Express  
**Port**: 3001/3002 (HTTP API)

**Responsibilities**:
- 🎙️ IVR menu handling
- ⌨️ DTMF processing
- 📞 Call routing logic
- 🗣️ TTS integration
- 💾 Database interactions
- 📊 Call logging
- 🎥 LiveKit integration

**Architecture**:
```
Drachtio App
    ├── SIP Control → Drachtio Server (via drachtio-srf)
    ├── Media Control → FreeSWITCH (via drachtio-fsmrf)
    ├── TTS API → TTS Service (via axios)
    ├── Database → PostgreSQL (via pg)
    ├── Cache → Redis (via redis)
    └── Video → LiveKit (via livekit-sdk)
```

**Key Modules**:
```javascript
// Dependencies
drachtio-srf    // SIP control
drachtio-fsmrf  // FreeSWITCH media control
pg              // PostgreSQL client
redis           // Redis client
axios           // HTTP client (TTS)
livekit-server-sdk  // LiveKit integration
winston         // Logging
uuid            // ID generation
```

**Call Handlers**:
```javascript
// Extension routing
9999        → handleIVRCall()      // IVR with TTS
6000        → handleDirectCall()   // Direct connection
555xxxx     → handleLiveKitCall()  // Video conference
default     → 404 Not Found
```

**IVR Flow**:
```
1. INVITE received for ext 9999
   ↓
2. ms = await mrf.connect(freeswitch)
   ↓
3. endpoint = await ms.connectCaller()
   ↓
4. await playTTS(endpoint, "Welcome...")
   ↓
5. endpoint.on('dtmf', handleDTMF)
   ↓
6. User presses digit
   ↓
7. Query database for action
   ↓
8. Execute action (transfer/menu/hangup)
```

**TTS Integration**:
```javascript
async function playTTS(endpoint, text) {
  // 1. Generate audio via TTS service
  const response = await axios.post('http://tts-service:8000/tts', {
    text: text,
    voice: 'default',
    cache: true
  });
  
  // 2. Play the generated file
  await endpoint.play(response.data.file_path);
}
```

**Environment Variables**:
```bash
DRACHTIO_HOST=drachtio-1
DRACHTIO_PORT=9022
DRACHTIO_SECRET=drachtio_secret_2024
FREESWITCH_HOST=freeswitch-1
FREESWITCH_PORT=8021
FREESWITCH_PASSWORD=ClueCon
TTS_SERVICE_URL=http://tts-service:8000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=voip_db
DB_USER=voip_user
DB_PASSWORD=<password>
REDIS_HOST=redis
REDIS_PORT=6379
LIVEKIT_URL=http://livekit:7880
LIVEKIT_API_KEY=<api_key>
LIVEKIT_API_SECRET=<api_secret>
```

**Health Check**:
```bash
curl http://localhost:3001/health
```

**Logging**:
```bash
# View app logs
docker-compose logs -f drachtio-app-1

# Key events logged:
- Incoming calls
- DTMF digits
- TTS generation
- Database queries
- Errors and exceptions
```

---

## 3. Media Processing Services

### 🎙️ FreeSWITCH (Services #8 & #9)

**Purpose**: Media server for RTP handling, audio processing, and DTMF

**Instances**:
- **FreeSWITCH-1**: `voip-freeswitch-1`, SIP 5062, ESL 8021, RTP 16384-16583
- **FreeSWITCH-2**: `voip-freeswitch-2`, SIP 5063, ESL 8021, RTP 16584-16783

**Image**: `drachtio/drachtio-freeswitch-mrf:latest`

**Responsibilities**:
- 🎵 RTP media streaming
- 📞 Audio transcoding
- ⌨️ DTMF detection and generation
- 🎼 Tone generation (ringing, busy, etc.)
- 🔊 Audio file playback
- 📊 Media statistics
- 🎚️ Volume control and mixing

**Architecture Role**:
```
Drachtio App controls FreeSWITCH via ESL (Event Socket Layer)

App → FreeSWITCH ESL (port 8021)
       ├── Create endpoint
       ├── Play audio
       ├── Detect DTMF
       ├── Generate tones
       └── Bridge calls

FreeSWITCH ↔ RTP ↔ User/Phone
```

**Key Modules**:
```
mod_sofia       # SIP endpoint
mod_event_socket # ESL for control (port 8021)
mod_dptools     # Dialplan tools
mod_sndfile     # Audio file playback
mod_tone_stream # Tone generation
mod_local_stream # Hold music (optional)
```

**Control via drachtio-fsmrf**:
```javascript
// Connect to FreeSWITCH
const ms = await mrf.connect({
  address: 'freeswitch-1',
  port: 8021,
  secret: 'ClueCon'
});

// Create endpoint for caller
const { endpoint, dialog } = await ms.connectCaller(req, res);

// Play audio file
await endpoint.play('/app/output/welcome.wav');

// Generate tone
await endpoint.execute('playback', 'tone_stream://%(2000,4000,440,480)');

// Detect DTMF
endpoint.on('dtmf', (evt) => {
  console.log('Digit pressed:', evt.dtmf);
});
```

**Tone Patterns**:
```
US Ringback:  tone_stream://%(2000,4000,440,480)
  → 2s on, 4s off, 440Hz + 480Hz

Busy:         tone_stream://%(500,500,480,620)
  → 500ms on, 500ms off, 480Hz + 620Hz

Beep:         tone_stream://%(300,0,800)
  → 300ms, 800Hz
```

**Environment Variables**:
```bash
ESL_PASSWORD=ClueCon
SOUNDS_VERSION=1.0.52
SERVER_ID=1  # or 2 for instance 2
```

**Health Check**:
```bash
fs_cli -x 'status'
```

**Volumes**:
```yaml
volumes:
  - ./freeswitch/conf:/usr/local/freeswitch/conf
  - ./freeswitch/recordings:/usr/local/freeswitch/recordings
  - tts-output:/app/output:ro  # Shared with TTS service
```

**Used By**:
- Drachtio Apps (media control)
- RTPEngine (media relay)

---

### 🌉 RTPEngine (Service #10)

**Purpose**: WebRTC↔RTP media gateway and NAT traversal

**Container**: `voip-rtpengine`  
**Image**: `drachtio/rtpengine:latest`  
**Ports**:
- `22222/UDP` - Control (from Kamailio)
- `30000-30100/UDP` - RTP media

**Responsibilities**:
- 🌐 WebRTC ↔ SIP media bridging
- 🔄 Media transcoding (codec conversion)
- 🧭 NAT traversal (ICE/STUN/TURN)
- 🎥 Video support
- 📊 Media statistics
- 🔐 SRTP ↔ RTP conversion

**Architecture**:
```
Browser (WebRTC/SRTP)
    ↓
    ↓ DTLS-SRTP
    ↓
RTPEngine (Media Proxy)
    ↓
    ↓ RTP
    ↓
FreeSWITCH/SIP Phone
```

**Key Features**:
- **ICE Support**: NAT traversal
- **DTLS**: WebRTC encryption
- **Codec Transcoding**: Opus ↔ G.711
- **Recording**: Media recording capability
- **Load Balancing**: Multiple instances support

**Configuration**:
```ini
# rtpengine.conf
[rtpengine]
interface = eth0
listen-ng = 22222
port-min = 30000
port-max = 30100
log-level = 6
delete-delay = 30
timeout = 60
```

**Control Protocol** (from Kamailio):
```
# Kamailio sends commands via UDP:22222

offer:
  - Create media session
  - Allocate ports
  - Return SDP

answer:
  - Complete session setup
  - Start media relay

delete:
  - Tear down session
  - Free resources
```

**Environment Variables**:
```bash
INTERFACE=eth0
LISTEN_NG=22222
PORT_MIN=30000
PORT_MAX=30100
```

**Health Check**:
```bash
# Check if listening
netstat -an | grep 22222

# Query status (requires rtpengine-ctl)
echo "ping" | nc -u localhost 22222
```

**Used By**:
- Kamailio (WebRTC gateway)
- FreeSWITCH (media relay)

---

### 🗣️ TTS Service - Piper (Service #11)

**Purpose**: Neural text-to-speech with natural voice quality

**Container**: `voip-tts-service`  
**Technology**: Python + FastAPI + Piper  
**Port**: `8000` (HTTP API)

**Responsibilities**:
- 🎙️ Text-to-speech generation
- 🧠 Neural TTS (Piper ONNX models)
- 💾 Audio file caching
- 📁 WAV file output
- 🎚️ Voice and speed control
- 🔄 Multi-voice support

**Architecture**:
```
Drachtio App
    ↓
POST http://tts-service:8000/tts
    ↓
TTS Service (Piper)
    ├── Generate audio
    ├── Cache result
    └── Return file path
    ↓
/app/output/abc123.wav ← Shared volume
    ↓
FreeSWITCH plays file
```

**API Endpoints**:

**1. Generate TTS**
```http
POST /tts
Content-Type: application/json

{
  "text": "Welcome to our service",
  "voice": "default",
  "speed": 1.0,
  "cache": true
}

Response:
{
  "success": true,
  "file_path": "/app/output/abc123.wav",
  "cached": false,
  "duration": 1.23
}
```

**2. Quick Phrase**
```http
POST /tts/phrase
Content-Type: application/x-www-form-urlencoded

text=Hello&voice=default

Response: (same as above)
```

**3. List Voices**
```http
GET /voices

Response:
{
  "voices": [
    {
      "name": "default",
      "language": "en_US",
      "quality": "medium",
      "model": "lessac"
    }
  ]
}
```

**4. Health Check**
```http
GET /health

Response:
{
  "status": "healthy",
  "engine": "piper",
  "version": "1.0.0"
}
```

**5. Clear Cache**
```http
GET /cache/clear

Response:
{
  "cleared": true,
  "files_deleted": 42
}
```

**Piper Configuration**:
```python
# Voice model
MODEL = "en_US-lessac-medium.onnx"

# Output settings
SAMPLE_RATE = 22050
OUTPUT_FORMAT = "wav"

# Caching
CACHE_DIR = "/app/cache"
OUTPUT_DIR = "/app/output"
```

**Performance**:
- First request: ~1-2 seconds (model loading)
- Subsequent: <1 second (model cached)
- Cached phrases: <50ms (file reuse)
- Concurrent: 20+ requests

**Voice Quality**:
- Engine: Piper (neural TTS)
- Model: en_US-lessac-medium
- Quality: Natural, human-like
- Size: ~63MB model

**Environment Variables**:
```bash
PIPER_MODEL=en_US-lessac-medium
CACHE_ENABLED=true
MAX_CACHE_SIZE=1000
```

**Volumes**:
```yaml
volumes:
  - tts-output:/app/output    # Shared with FreeSWITCH
  - tts-cache:/app/cache      # Model cache
```

**Dependencies**:
```
Python 3.11
FastAPI         # Web framework
uvicorn         # ASGI server
piper-tts       # TTS engine (binary)
```

**Caching Strategy**:
```python
# Cache key = SHA256(text + voice + speed)
cache_key = hashlib.sha256(f"{text}_{voice}_{speed}".encode()).hexdigest()

# Cache hit
if exists(f"/app/cache/{cache_key}.wav"):
    return cached_file

# Cache miss
generate_audio()
save_to_cache()
```

**Health Check**:
```bash
curl http://localhost:8000/health
```

**Used By**:
- Drachtio App 1
- Drachtio App 2

Continuing in next part...
