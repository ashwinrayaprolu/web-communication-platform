# VoIP Application Project Structure

```
voip-application/
├── docker-compose.yaml              # Main orchestration file
├── start.sh                         # Start script
├── stop.sh                          # Stop script
├── test.sh                          # Automated test suite
├── README.md                        # Complete documentation
├── architecture.md                  # Architecture diagram and explanation
├── MEDIA_FLOW_ARCHITECTURE.md       # Detailed media flow with RTPEngine
├── DNS_ARCHITECTURE.md              # DNS-based service discovery
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore rules
│
├── postgres/
│   └── init.sql                     # Database initialization script
│
├── kamailio/
│   ├── Dockerfile                   # Kamailio container build
│   ├── kamailio.cfg                 # SIP proxy configuration
│   └── dispatcher.list              # Load balancer configuration
│
├── rtpengine/
│   ├── Dockerfile                   # RTPEngine container build
│   └── rtpengine.conf               # Media proxy configuration
│
├── drachtio-apps/
│   ├── app-1/
│   │   ├── Dockerfile               # Application 1 container
│   │   ├── package.json             # Node.js dependencies
│   │   └── index.js                 # Main application logic
│   └── app-2/
│       ├── Dockerfile               # Application 2 container
│       ├── package.json             # Node.js dependencies
│       └── index.js                 # Main application logic
│
├── freeswitch/
│   ├── Dockerfile                   # FreeSWITCH container build
│   └── conf/
│       └── sip_profiles/
│           └── external.xml         # SIP profile configuration
│
├── livekit/
│   └── livekit.yaml                 # LiveKit server configuration
│
├── dsiprouter/
│   ├── Dockerfile                   # dSIPRouter container
│   ├── requirements.txt             # Python dependencies
│   ├── app.py                       # Flask application
│   └── templates/
│       └── index.html               # Web interface
│
├── admin-dashboard/
│   ├── Dockerfile                   # Admin dashboard container
│   ├── package.json                 # Node.js dependencies
│   └── server.js                    # Express API server
│
└── nginx/
    ├── Dockerfile                   # Nginx container
    ├── nginx.conf                   # Nginx configuration
    └── html/
        ├── index.html               # Customer SIP client
        └── agent.html               # Agent portal interface
```

## File Descriptions

### Root Level

- **docker-compose.yaml**: Orchestrates all 15+ services with health checks, networks, and volumes
- **start.sh**: Automated startup script with health check monitoring
- **stop.sh**: Graceful shutdown script with data preservation option
- **test.sh**: Comprehensive automated test suite
- **README.md**: Complete end-to-end testing guide and documentation
- **architecture.md**: Detailed system architecture with diagrams
- **.env.example**: Template for environment variables
- **.gitignore**: Exclude logs, data, and temporary files

### PostgreSQL (postgres/)

- **init.sql**: 
  - Creates all database tables
  - Inserts default extensions (6000, 6001, 6002, 9999)
  - Configures IVR menus and options
  - Sets up agents and call logging
  - Creates indexes for performance

### Kamailio (kamailio/)

- **Dockerfile**: 
  - Debian Bullseye base
  - Installs Kamailio 5.7 from official repository
  - Includes ALL kamailio modules
  - Multi-architecture support (amd64/arm64)

- **kamailio.cfg**: 
  - SIP registration and routing
  - WebSocket transport
  - Load balancing to Drachtio servers
  - RTPEngine integration for media proxying
  - NAT traversal
  - Security and rate limiting

- **dispatcher.list**: 
  - Drachtio server endpoints (using DNS names)
  - Load balancing configuration

### RTPEngine (rtpengine/)

- **Dockerfile**:
  - Debian Bullseye base
  - Installs RTPEngine from dfx.at repository
  - Includes kernel module for performance
  - Privileged container with NET_ADMIN capability

- **rtpengine.conf**:
  - Media proxy configuration
  - WebRTC ↔ RTP conversion settings
  - Port range: 30000-40000 for media
  - Control port: 22222 (NG protocol)
  - Performance tuning (4 threads)
  - Optional Redis integration for HA

### Drachtio Applications (drachtio-apps/)

- **Dockerfile**: Node.js 18 Alpine base
- **package.json**: 
  - drachtio-srf (SIP routing framework)
  - drachtio-fsmrf (FreeSWITCH media resource framework)
  - livekit-server-sdk
  - PostgreSQL and Redis clients

- **index.js**: 
  - SIP call handling
  - IVR menu logic
  - DTMF processing
  - FreeSWITCH integration via ESL
  - LiveKit room management
  - Call logging and state management

### FreeSWITCH (freeswitch/)

- **Dockerfile**: 
  - Debian Bullseye base
  - FreeSWITCH from SignalWire repository
  - Complete meta-all package

- **conf/sip_profiles/external.xml**: 
  - SIP profile configuration
  - Codec preferences (OPUS, PCMU, PCMA)
  - RTP settings
  - Authentication settings

### LiveKit (livekit/)

- **livekit.yaml**: 
  - Server configuration
  - API keys
  - Redis integration
  - RTC port ranges
  - Room settings

### dSIPRouter (dsiprouter/)

- **Dockerfile**: Python 3.9 slim base
- **requirements.txt**: Flask, PostgreSQL, Redis clients
- **app.py**: 
  - Flask REST API
  - Kamailio management
  - Statistics endpoints
  - Agent management

- **templates/index.html**: 
  - Web dashboard
  - Real-time statistics
  - Call monitoring
  - Agent status

### Admin Dashboard (admin-dashboard/)

- **Dockerfile**: Node.js 18 Alpine
- **package.json**: Express, PostgreSQL, Redis, LiveKit SDK
- **server.js**: 
  - REST API endpoints
  - LiveKit integration
  - Call monitoring
  - Agent management
  - Real-time statistics

### Nginx (nginx/)

- **Dockerfile**: Nginx Alpine base
- **nginx.conf**: 
  - Reverse proxy configuration
  - WebSocket proxying
  - Static file serving
  - API routing

- **html/index.html**: 
  - SIP.js WebRTC client
  - Customer interface
  - DTMF pad
  - Call controls

- **html/agent.html**: 
  - Agent portal
  - Call management
  - Status control
  - Real-time monitoring

## Service Dependencies

```
Nginx
  ├── Depends on: Admin Dashboard, dSIPRouter
  └── Proxies to: Kamailio (WebSocket), LiveKit

Kamailio
  ├── Depends on: PostgreSQL, Redis
  └── Routes to: Drachtio-1, Drachtio-2

Drachtio-1/2
  └── Standalone SIP servers

Drachtio App 1/2
  ├── Depends on: Drachtio-1/2, FreeSWITCH-1/2, Redis
  └── Integrates with: LiveKit, PostgreSQL

FreeSWITCH-1/2
  └── Media processing servers

LiveKit
  ├── Depends on: Redis
  └── WebRTC media server

Admin Dashboard
  ├── Depends on: PostgreSQL, Redis, LiveKit
  └── REST API server

dSIPRouter
  ├── Depends on: PostgreSQL, Kamailio
  └── Management interface

PostgreSQL
  └── Primary database (no dependencies)

Redis
  └── Cache and state (no dependencies)

PgAdmin
  ├── Depends on: PostgreSQL
  └── Database management UI
```

## Network Topology

All services communicate on `voip-network` (172.20.0.0/16):

- Services use container names for DNS resolution
- Fixed IP addresses for critical services
- Bridge network for inter-service communication
- External ports exposed selectively

## Data Flow

1. **Customer Call**:
   Browser → Nginx (WebSocket) → Kamailio → Drachtio → Drachtio App → FreeSWITCH

2. **Agent Console**:
   Browser → Nginx → Admin Dashboard → LiveKit

3. **Call Logging**:
   Drachtio App → PostgreSQL

4. **State Management**:
   Drachtio App → Redis

5. **IVR Processing**:
   Drachtio App → PostgreSQL (menu config) → FreeSWITCH (audio) → Customer

## Key Features

- **Multi-platform**: Works on amd64 and arm64
- **High Availability**: Redundant Drachtio and FreeSWITCH servers
- **Load Balancing**: Kamailio distributes calls
- **Real-time**: WebSocket for instant updates
- **Scalable**: Add more servers easily
- **Monitored**: Health checks on all services
- **Persistent**: Data stored in volumes
- **Documented**: Complete testing guide included
