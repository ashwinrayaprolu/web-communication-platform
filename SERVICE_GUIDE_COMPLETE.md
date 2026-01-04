# Complete Service Guide - All 16 Services

## Quick Reference Table

| # | Service | Purpose | Port(s) | Dependencies | CPU | RAM |
|---|---------|---------|---------|--------------|-----|-----|
| 1 | PostgreSQL | Database | 5432 | None | Low | 256MB |
| 2 | Redis | Cache | 6379 | None | Low | 128MB |
| 3 | Kamailio | SIP Proxy | 5060, 8080 | None | Medium | 256MB |
| 4 | Drachtio-1 | SIP Server | 5080, 9022 | None | Medium | 256MB |
| 5 | Drachtio-2 | SIP Server | 5081, 9023 | None | Medium | 256MB |
| 6 | Drachtio-App-1 | Call Logic | 3001 | 1,2,4,8,12 | Medium | 512MB |
| 7 | Drachtio-App-2 | Call Logic | 3002 | 1,2,5,9,12 | Medium | 512MB |
| 8 | FreeSWITCH-1 | Media | 5062, 8021 | None | High | 512MB |
| 9 | FreeSWITCH-2 | Media | 5063, 8021 | None | High | 512MB |
| 10 | RTPEngine | Media Gateway | 22222, 30000+ | None | High | 512MB |
| 11 | TTS Service | Speech | 8000 | None | Medium | 512MB |
| 12 | LiveKit | Video | 7880 | 1,2 | High | 1GB |
| 13 | NGINX | Web Server | 80, 443 | All | Low | 128MB |
| 14 | Admin Dashboard | Monitoring | 3000 | 1,2,12 | Low | 256MB |
| 15 | dSIPRouter | SIP Mgmt | 5000 | 1,2 | Low | 256MB |
| 16 | pgAdmin | DB Admin | 5050 | 1 | Low | 256MB |

**Total Resources**: 4-6 GB RAM, 4-6 CPU cores

---

## Service #12: LiveKit

**Purpose**: WebRTC Selective Forwarding Unit (SFU) for video conferencing

**Container**: `voip-livekit`  
**Image**: `livekit/livekit-server:latest`  
**Ports**:
- `7880` - HTTP API
- `7881` - HTTPS API (optional)
- `7882` - RTC (WebRTC)
- `50000-60000/UDP` - Media

**Responsibilities**:
- 🎥 Multi-party video conferencing
- 🔊 Audio mixing
- 📺 Screen sharing
- 🎙️ Simulcast support
- 📹 Recording
- 📊 Quality adaptation
- 🌐 Low-latency WebRTC

**Architecture**:
```
Browser 1 ──┐
Browser 2 ──┼──→ LiveKit SFU ──┐
Browser 3 ──┘                   ├──→ All Participants
                                └──→ Recording (optional)

SFU (Selective Forwarding Unit):
- Forwards media without transcoding
- Bandwidth efficient
- Low CPU usage compared to MCU
- Each participant receives all streams
```

**Configuration** (`livekit.yaml`):
```yaml
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true

keys:
  API_KEY: <generated_key>
  API_SECRET: <generated_secret>

room:
  auto_create: true
  empty_timeout: 300s
  max_participants: 100

redis:
  address: redis:6379
```

**API Operations**:

**1. Create Room** (via Drachtio App):
```javascript
const roomService = new RoomServiceClient(
  'http://livekit:7880',
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET
);

await roomService.createRoom({
  name: 'call-abc123',
  emptyTimeout: 300,
  maxParticipants: 10
});
```

**2. Generate Access Token**:
```javascript
const token = new AccessToken(API_KEY, API_SECRET, {
  identity: 'user123',
  name: 'John Doe'
});

token.addGrant({
  roomJoin: true,
  room: 'call-abc123',
  canPublish: true,
  canSubscribe: true
});

const jwt = token.toJwt();
```

**3. Client Joins**:
```javascript
// In browser
const room = new Room();
await room.connect('ws://localhost:7880', jwt);

// Publish camera
const track = await createLocalVideoTrack();
await room.localParticipant.publishTrack(track);
```

**Environment Variables**:
```bash
LIVEKIT_API_KEY=<32+ character key>
LIVEKIT_API_SECRET=<32+ character secret>
REDIS_HOST=redis
REDIS_PORT=6379
```

**Health Check**:
```bash
curl http://localhost:7880/
```

**Used By**:
- Drachtio Apps (calls to extensions 555xxxx)
- Admin Dashboard (room monitoring)

**Key Features**:
- ✅ Simulcast (multiple quality levels)
- ✅ Adaptive bitrate
- ✅ E2E encryption support
- ✅ Recording to S3/file
- ✅ Data channels
- ✅ Screen sharing
- ✅ Mobile SDK support

---

## Service #13: NGINX

**Purpose**: Reverse proxy, load balancer, and static file server

**Container**: `voip-nginx`  
**Image**: `nginx:alpine`  
**Ports**:
- `80` - HTTP
- `443` - HTTPS (when configured)

**Responsibilities**:
- 🌐 Serve static websites
- 🔀 Reverse proxy to backend services
- 🔒 SSL/TLS termination (optional)
- 🚦 Load balancing
- 📊 Access logging
- 🗜️ Compression (gzip)
- 🔐 CORS handling

**Architecture**:
```
Internet
    ↓
NGINX (Port 80)
    ├─→ /              → Static HTML (WebRTC client)
    ├─→ /admin         → Admin Dashboard:3000
    ├─→ /api/admin/    → Admin Dashboard API
    ├─→ /dsiprouter/   → dSIPRouter:5000
    ├─→ /livekit/      → LiveKit:7880
    └─→ /ws            → Kamailio:8080 (WebSocket)
```

**Configuration** (`nginx.conf`):
```nginx
server {
    listen 80;
    server_name localhost;

    # Static files
    root /usr/share/nginx/html;
    index index.html;

    # WebRTC Client
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Admin Dashboard
    location /admin {
        proxy_pass http://admin-dashboard:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # WebSocket for SIP
    location /ws {
        proxy_pass http://kamailio:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

**Static Files**:
```
/usr/share/nginx/html/
├── index.html       # WebRTC client
├── agent.html       # Agent portal
├── style.css
└── app.js
```

**Proxy Rules**:
- WebSocket connections: Keep-alive for 24 hours
- API requests: Standard HTTP/1.1
- Static files: Cached with proper headers
- Compression: Enabled for text/JSON

**Environment Variables**: None (configured via nginx.conf)

**Health Check**:
```bash
curl http://localhost/
```

**Volumes**:
```yaml
volumes:
  - ./nginx/html:/usr/share/nginx/html
  - ./nginx/nginx.conf:/etc/nginx/nginx.conf
```

**Used By**:
- All web clients
- External API consumers

---

## Service #14: Admin Dashboard

**Purpose**: Real-time monitoring and management web interface

**Container**: `voip-admin-dashboard`  
**Technology**: Node.js + Express + Static HTML  
**Port**: `3000`

**Responsibilities**:
- 📊 Real-time call statistics
- 👥 Agent management
- 📞 Active call monitoring
- 📋 Call history viewing
- 🎙️ IVR menu configuration viewer
- 🎥 LiveKit room monitoring
- 📈 Analytics dashboard

**Architecture**:
```
Admin Dashboard (Port 3000)
    ├── Backend (Express)
    │   ├── GET /api/dashboard/stats
    │   ├── GET /api/agents
    │   ├── GET /api/calls/active
    │   ├── GET /api/calls/history
    │   ├── GET /api/ivr/menus
    │   └── GET /api/livekit/rooms
    │
    └── Frontend (Static HTML)
        ├── index.html (Dashboard UI)
        ├── Auto-refresh (30s)
        ├── Tabbed interface
        └── Real-time stats
```

**API Endpoints**:

**1. Dashboard Stats**:
```bash
GET /api/dashboard/stats

Response:
{
  "total_calls": 1234,
  "active_calls": 5,
  "online_agents": 12,
  "calls_today": 87
}
```

**2. Active Calls**:
```bash
GET /api/calls/active

Response:
[
  {
    "call_id": "abc123...",
    "from_number": "+15551234567",
    "to_number": "9999",
    "agent_name": "John Doe",
    "status": "active",
    "started_at": "2026-01-04T01:00:00Z"
  }
]
```

**3. IVR Menus**:
```bash
GET /api/ivr/menus

Response:
[
  {
    "menu_id": "main",
    "welcome_message": "For sales press 1...",
    "options": [
      {"digit": "1", "action_type": "transfer", "action_value": "1001"},
      {"digit": "2", "action_type": "menu", "action_value": "support"}
    ]
  }
]
```

**Frontend Features**:
- 🎨 Modern gradient UI (purple theme)
- 📱 Responsive design
- 🔄 Auto-refresh every 30s
- 📊 Real-time charts
- 🎯 Tabbed interface
- 🎨 Color-coded status
- 📊 Data tables

**Environment Variables**:
```bash
DB_HOST=postgres
DB_PORT=5432
DB_NAME=voip_db
DB_USER=voip_user
DB_PASSWORD=<password>
REDIS_HOST=redis
REDIS_PORT=6379
LIVEKIT_URL=http://livekit:7880
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
```

**Health Check**:
```bash
curl http://localhost:3000/api/health
```

**Access**: http://localhost/admin

**Used By**:
- System administrators
- Call center managers
- Operations team

---

## Service #15: dSIPRouter

**Purpose**: SIP routing configuration and management

**Container**: `voip-dsiprouter`  
**Technology**: Python + Flask  
**Port**: `5000`

**Responsibilities**:
- 📋 SIP endpoint configuration
- 🔀 Routing table management
- 🌐 Carrier/trunk management
- 📊 SIP statistics
- ⚙️ Kamailio configuration
- 🔧 Dial plan management

**Features**:
- Web-based GUI
- Database-backed configuration
- Integration with Kamailio
- Carrier management
- Least-cost routing
- Failover rules

**Environment Variables**:
```bash
DB_HOST=postgres
DB_PORT=5432
DB_NAME=voip_db
DB_USER=voip_user
DB_PASSWORD=<password>
KAMAILIO_HOST=kamailio
```

**Access**: http://localhost/dsiprouter

**Used By**:
- System administrators
- VoIP engineers

---

## Service #16: pgAdmin

**Purpose**: PostgreSQL database administration

**Container**: `voip-pgadmin`  
**Image**: `dpage/pgadmin4:latest`  
**Port**: `5050`

**Responsibilities**:
- 🗄️ Database management
- 📊 Query execution
- 🔍 Schema browsing
- 📈 Performance monitoring
- 🔧 Database maintenance
- 📥 Backup/restore

**Environment Variables**:
```bash
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=<admin_password>
```

**Access**: http://localhost:5050

**Server Connection**:
```
Host: postgres
Port: 5432
Database: voip_db
Username: voip_user
Password: <password>
```

**Used By**:
- Database administrators
- Developers

---

## Service Interaction Matrix

```
Service Calls:
Drachtio App    →  PostgreSQL (queries)
Drachtio App    →  Redis (caching)
Drachtio App    →  Drachtio Server (SIP control)
Drachtio App    →  FreeSWITCH (media control)
Drachtio App    →  TTS Service (audio generation)
Drachtio App    →  LiveKit (video rooms)
Admin Dashboard →  PostgreSQL (stats)
Admin Dashboard →  Redis (real-time data)
Admin Dashboard →  LiveKit (room list)
Kamailio        →  Drachtio Servers (SIP routing)
Kamailio        →  RTPEngine (media control)
NGINX           →  All HTTP services
dSIPRouter      →  PostgreSQL (config)
dSIPRouter      →  Kamailio (via API)
pgAdmin         →  PostgreSQL (management)
```

---

## Startup Sequence

```
1. PostgreSQL & Redis start first (no dependencies)
2. pgAdmin & TTS Service start (depend on layer 1)
3. RTPEngine, FreeSWITCH-1, FreeSWITCH-2 start (media layer)
4. Drachtio-1, Drachtio-2 start (SIP servers)
5. Kamailio starts (depends on Drachtio servers)
6. Drachtio-App-1, Drachtio-App-2, LiveKit start (app layer)
7. dSIPRouter, Admin Dashboard start (management)
8. NGINX starts last (reverse proxy for all)
```

---

## Resource Requirements

**Minimum**:
- CPU: 4 cores
- RAM: 4 GB
- Disk: 20 GB

**Recommended**:
- CPU: 6-8 cores
- RAM: 8-12 GB
- Disk: 50 GB SSD

**Production**:
- CPU: 8-16 cores
- RAM: 16-32 GB
- Disk: 100+ GB SSD
- Network: 1 Gbps+

---

## Monitoring Endpoints

```
Service Health Checks:

PostgreSQL:     SELECT 1;
Redis:          PING
Kamailio:       kamctl fifo get_statistics
Drachtio:       netstat -an | grep 9022
FreeSWITCH:     fs_cli -x 'status'
RTPEngine:      netstat -an | grep 22222
TTS Service:    curl http://localhost:8000/health
LiveKit:        curl http://localhost:7880/
Admin Dashboard: curl http://localhost:3000/api/health
NGINX:          curl http://localhost/
```

---

## Complete System Health Check Script

See `check_versions.sh` and `test_freeswitch.sh` for detailed health checks.

