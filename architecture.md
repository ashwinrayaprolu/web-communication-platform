# VoIP Application Architecture

## System Overview

This is a complete, production-ready VoIP application stack that provides end-to-end call handling capabilities with WebRTC integration, IVR systems, and real-time agent management.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Customer   │  │    Agent     │  │    Admin     │                  │
│  │   Portal     │  │   Portal     │  │  Dashboard   │                  │
│  │ (SIP.js)     │  │ (SIP.js)     │  │  (React)     │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                  │                  │                          │
│         └──────────────────┴──────────────────┘                          │
│                            │                                             │
│                     ┌──────▼───────┐                                     │
│                     │    Nginx     │                                     │
│                     │ (Port 80)    │                                     │
│                     └──────┬───────┘                                     │
│                            │                                             │
└────────────────────────────┼─────────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────────────┐
│                         SIP LAYER                                         │
├────────────────────────────┼─────────────────────────────────────────────┤
│                            │                                             │
│                     ┌──────▼───────┐                                     │
│                     │   Kamailio   │◄────┐                               │
│                     │  SIP Proxy   │     │                               │
│                     │ (Port 5060)  │     │                               │
│                     │   WebSocket  │     │                               │
│                     │ (Port 8080)  │     │                               │
│                     └──────┬───────┘     │                               │
│                            │             │                               │
│              ┌─────────────┴─────────────┴──────────┐                    │
│              │                                       │                    │
│       ┌──────▼───────┐                    ┌─────────▼──────┐            │
│       │  Drachtio-1  │                    │   Drachtio-2   │            │
│       │ SIP Server   │                    │  SIP Server    │            │
│       │ (Port 5080)  │                    │  (Port 5081)   │            │
│       └──────┬───────┘                    └────────┬───────┘            │
│              │                                      │                    │
└──────────────┼──────────────────────────────────────┼──────────────────┘
               │                                      │
┌──────────────┼──────────────────────────────────────┼──────────────────┐
│                      MEDIA LAYER                                         │
├──────────────┼──────────────────────────────────────┼──────────────────┤
│              │                                      │                   │
│              │         ┌────────────────┐           │                   │
│              │         │   RTPEngine    │           │                   │
│              │         │  Media Proxy   │           │                   │
│              │         │ WebRTC ↔ RTP   │           │                   │
│              │         │ (Port 22222)   │           │                   │
│              │         │ RTP: 30000-    │           │                   │
│              │         │      40000     │           │                   │
│              │         └────────┬───────┘           │                   │
│              │                  │                   │                   │
│              │         ┌────────┴────────┐          │                   │
│              │         │                 │          │                   │
│       ┌──────▼───────┐ │  ┌──────────────▼─┐ ┌─────▼───────┐           │
│       │ Drachtio App │ │  │   RTPEngine    │ │ Drachtio    │           │
│       │      1       │ │  │   Controls     │ │   App 2     │           │
│       │ - Call Mgmt  │ │  │   Media Flow   │ │             │           │
│       │ - IVR Logic  │ │  └────────────────┘ │ - Call Mgmt │           │
│       │ - Routing    │ │                     │ - IVR Logic │           │
│       └──────┬───────┘ │                     └──────┬──────┘           │
│              │         │                            │                   │
│              │         │                            │                   │
│       ┌──────▼─────────▼────────┐      ┌───────────▼──────┐            │
│       │    FreeSWITCH-1         │      │  FreeSWITCH-2     │            │
│       │                         │      │                   │            │
│       │  RTP Media Processing   │      │ RTP Media Process │            │
│       │  (Port 5062)            │      │ (Port 5063)       │            │
│       │  ESL (8021)             │      │ ESL (8022)        │            │
│       │  RTP: 16384-16583       │      │ RTP: 16584-16783  │            │
│       └─────────────────────────┘      └───────────────────┘            │
│                                                                          │
│       ┌──────────────────────────────────────────────────┐              │
│       │              LiveKit Server                      │              │
│       │           WebRTC Media Server                    │              │
│       │      (Agent Console - Port 7880)                 │              │
│       │         RTC: 50000-50100/udp                     │              │
│       └──────────────────────────────────────────────────┘              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────────────┐
│                      MANAGEMENT LAYER                                     │
├────────────────────────────┼─────────────────────────────────────────────┤
│                            │                                             │
│       ┌────────────────────▼──────────────┐                              │
│       │      Admin Dashboard              │                              │
│       │  - Agent Management               │                              │
│       │  - Call Monitoring                │                              │
│       │  - Real-time Stats                │                              │
│       │  - LiveKit Integration            │                              │
│       └────────────────┬──────────────────┘                              │
│                        │                                                 │
│       ┌────────────────▼──────────────┐                                  │
│       │       dSIPRouter              │                                  │
│       │  - Kamailio Management        │                                  │
│       │  - System Statistics          │                                  │
│       │  - Extension Management       │                                  │
│       └───────────────────────────────┘                                  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────────────┐
│                         DATA LAYER                                        │
├────────────────────────────┼─────────────────────────────────────────────┤
│                            │                                             │
│         ┌──────────────────┴──────────────┐                              │
│         │                                 │                              │
│  ┌──────▼───────┐              ┌─────────▼──────┐                       │
│  │  PostgreSQL  │              │     Redis      │                       │
│  │              │              │                │                       │
│  │ - Users      │              │ - Sessions     │                       │
│  │ - Call Logs  │              │ - Cache        │                       │
│  │ - Agents     │              │ - State Mgmt   │                       │
│  │ - IVR Config │              │                │                       │
│  └──────────────┘              └────────────────┘                       │
│                                                                           │
│  ┌─────────────────────────────────────────────┐                         │
│  │              PgAdmin                        │                         │
│  │      Database Management UI                │                         │
│  └─────────────────────────────────────────────┘                         │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Component Descriptions

### Presentation Layer

#### 1. Customer Portal (index.html)
- **Technology**: SIP.js, HTML5, WebSocket
- **Purpose**: Customer-facing interface for making calls
- **Features**:
  - WebRTC-based calling
  - DTMF pad for IVR interaction
  - Call controls (mute, hold, transfer)
  - Real-time call status

#### 2. Agent Portal (agent.html)
- **Technology**: SIP.js, HTML5, WebSocket
- **Purpose**: Agent interface for receiving and managing calls
- **Features**:
  - Incoming call notifications
  - Agent status management (online, busy, away)
  - Active call monitoring
  - Call history
  - Multi-call handling

#### 3. Admin Dashboard
- **Technology**: Node.js, Express, React
- **Purpose**: System administration and monitoring
- **Features**:
  - Real-time call statistics
  - Agent management
  - LiveKit room monitoring
  - Call history and reports

#### 4. Nginx
- **Purpose**: Reverse proxy and static file serving
- **Functions**:
  - WebSocket proxy for SIP.js
  - API gateway
  - Static content delivery
  - SSL termination (when configured)

### SIP Layer

#### 5. Kamailio SIP Server
- **Version**: 5.7
- **Purpose**: SIP registrar, proxy, and load balancer
- **Functions**:
  - SIP registration
  - Call routing
  - Load balancing to Drachtio servers
  - WebSocket transport for WebRTC
  - RTPEngine control for media proxying
  - NAT traversal
  - Security and rate limiting

#### 6. Drachtio Servers (2 instances)
- **Purpose**: Programmable SIP application servers
- **Functions**:
  - SIP call control
  - Media server integration
  - Custom call logic
  - High availability (2 instances)

### Media Layer

#### 7. RTPEngine Media Proxy
- **Purpose**: WebRTC ↔ RTP protocol conversion and media relay
- **Critical Component**: Bridges browser WebRTC with FreeSWITCH RTP
- **Functions**:
  - SRTP ↔ RTP conversion
  - ICE candidate handling
  - DTLS key exchange
  - Media packet relay
  - NAT traversal for media
  - Port management (30000-40000)
- **Why Essential**: Browsers speak WebRTC (SRTP), FreeSWITCH speaks RTP
- **Control**: Managed by Kamailio via NG protocol (port 22222)
- **Media Ports**: UDP 30000-40000 for RTP/SRTP streams

### Application Layer

#### 8. Drachtio Node.js Applications (2 instances)
- **Technology**: Node.js, drachtio-srf, drachtio-fsmrf
- **Purpose**: Business logic and call handling
- **Features**:
  - Extension routing (6000, 9999, 555-XXXX)
  - IVR menu systems
  - FreeSWITCH integration via ESL
  - LiveKit integration for WebRTC
  - DTMF collection and processing
  - Call transfer capabilities
  - Multi-level menu navigation

#### 9. FreeSWITCH Servers (2 instances)
- **Purpose**: Media processing and RTP handling
- **Functions**:
  - Audio/video media processing
  - Recording
  - Transcoding
  - Conference bridges
  - IVR audio playback
  - TTS (Text-to-Speech)
- **Receives**: Plain RTP from RTPEngine
- **Sends**: Plain RTP back to RTPEngine

#### 10. LiveKit Server
- **Purpose**: WebRTC media server for agent console
- **Functions**:
  - WebRTC media handling
  - Room-based conferencing
  - Low-latency audio/video
  - Agent-customer WebRTC calls

### Management Layer

#### 10. Admin Dashboard Backend
- **Technology**: Node.js, Express
- **Purpose**: REST API for administration
- **Endpoints**:
  - `/api/health` - Health check
  - `/api/dashboard/stats` - System statistics
  - `/api/agents` - Agent management
  - `/api/calls/active` - Active calls
  - `/api/calls/history` - Call history
  - `/api/livekit/rooms` - LiveKit room list
  - `/api/livekit/token` - Generate access tokens
  - `/api/ivr/menus` - IVR menu configuration

#### 11. dSIPRouter
- **Technology**: Python, Flask
- **Purpose**: Kamailio management interface
- **Features**:
  - System statistics
  - Extension management
  - Call monitoring
  - Configuration management

### Data Layer

#### 12. PostgreSQL Database
- **Version**: 15-alpine
- **Purpose**: Primary data store
- **Schema**:
  - `extensions` - User extensions and credentials
  - `call_logs` - Call history and records
  - `agents` - Agent information and statistics
  - `active_calls` - Current call state
  - `ivr_menus` - IVR menu definitions
  - `ivr_menu_options` - IVR menu options

#### 13. Redis
- **Version**: 7-alpine
- **Purpose**: Caching and state management
- **Uses**:
  - Session management
  - Call state caching
  - LiveKit room information
  - Rate limiting data
  - Real-time statistics

#### 14. PgAdmin
- **Purpose**: Database management interface
- **Access**: http://localhost:5050
- **Credentials**: admin@voip.local / admin123

## Call Flow Examples

### Direct Call Flow (Extension 6000)

```
Customer Browser (WebRTC)
    ↓ SIP INVITE (WebSocket)
Nginx (WebSocket Proxy)
    ↓ Forward WebSocket
Kamailio (SIP Proxy)
    ↓ Call rtpengine_offer() - Convert WebRTC SDP → RTP SDP
    ↓ Route to Drachtio
Drachtio-1 (SIP Server)
    ↓ Forward to Application
Drachtio App 1 (Business Logic)
    ↓ Connect to FreeSWITCH via ESL
FreeSWITCH-1 (Media Server)
    ↓ Send 200 OK with RTP SDP
Kamailio
    ↓ Call rtpengine_answer() - Convert RTP SDP → WebRTC SDP
Customer Browser receives WebRTC SDP

MEDIA PATH:
Customer Browser (SRTP)
    ↓
RTPEngine (Protocol Conversion)
    ↓ SRTP → RTP
FreeSWITCH-1 (RTP)
    ↓ Process Audio
    ↓ RTP → SRTP
RTPEngine (Protocol Conversion)
    ↓
Customer Browser (SRTP)
```

### IVR Call Flow (Extension 9999)

```
Customer Browser (WebRTC)
    ↓ SIP INVITE to 9999
Nginx → Kamailio
    ↓ rtpengine_offer() - WebRTC → RTP conversion
    ↓ Route to Drachtio-2
Drachtio-2 → Drachtio App 2
    ↓ Detect extension 9999
    ↓ Load IVR menu from PostgreSQL
    ↓ Connect to FreeSWITCH-2 via ESL
FreeSWITCH-2
    ↓ Play welcome menu audio
    
MEDIA PATH (Audio Playback):
FreeSWITCH-2 plays audio → RTP packets
    ↓
RTPEngine (RTP → SRTP conversion)
    ↓
Customer Browser receives audio (SRTP)

DTMF Input:
Customer presses digit → DTMF in SRTP
    ↓
RTPEngine (SRTP → RTP conversion)
    ↓
FreeSWITCH-2 detects DTMF
    ↓
Drachtio App 2 processes input
    ↓ Query PostgreSQL for menu option
    ↓ Transfer to agent OR play submenu
```

### LiveKit WebRTC Call Flow (Extension 555-XXXX)

```
Customer Browser (WebRTC)
    ↓ SIP INVITE to 555-1234
Nginx → Kamailio
    ↓ rtpengine_offer() - WebRTC → RTP
    ↓ Route to Drachtio-1
Drachtio-1 → Drachtio App 1
    ↓ Detect 555- pattern
    ↓ Create LiveKit room
    ↓ Generate access token
    ↓ Store in Redis
LiveKit Server
    ↓ Room ready for WebRTC
Agent Console
    ↓ Join same LiveKit room
    
MEDIA PATH (Direct WebRTC):
Customer Browser ←→ LiveKit Server ←→ Agent Browser
(No RTPEngine needed - both ends are WebRTC)
```

## Network Architecture

### Network Configuration
- **Network Name**: voip-network
- **Driver**: bridge
- **DNS**: Docker's built-in DNS server (127.0.0.11)
- **Service Discovery**: Automatic via service names

### Service Communication

All services communicate using DNS names instead of static IPs:

| Service | DNS Name | Purpose |
|---------|----------|---------|
| PostgreSQL | postgres | Database |
| PgAdmin | pgadmin | DB Management |
| Redis | redis | Cache/State |
| RTPEngine | rtpengine | Media Proxy |
| Kamailio | kamailio | SIP Proxy |
| Drachtio-1 | drachtio-1 | SIP Server 1 |
| Drachtio-2 | drachtio-2 | SIP Server 2 |
| FreeSWITCH-1 | freeswitch-1 | Media Server 1 |
| FreeSWITCH-2 | freeswitch-2 | Media Server 2 |
| Drachtio App 1 | drachtio-app-1 | Application 1 |
| Drachtio App 2 | drachtio-app-2 | Application 2 |
| LiveKit | livekit | WebRTC Server |
| dSIPRouter | dsiprouter | Management |
| Admin Dashboard | admin-dashboard | Admin API |
| Nginx | nginx | Reverse Proxy |

**Benefits**:
- No IP address management needed
- Portable across environments
- Cloud-ready architecture
- Easy horizontal scaling
- Docker handles DNS resolution automatically

## Port Mapping

### External Ports (Host → Container)

| Service | External Port | Internal Port | Protocol | Purpose |
|---------|--------------|---------------|----------|---------|
| Nginx | 80 | 80 | HTTP | Web Interface |
| Nginx | 443 | 443 | HTTPS | Secure Web |
| Kamailio | 5060 | 5060 | UDP/TCP | SIP |
| Kamailio | 8080 | 8080 | TCP | WebSocket |
| RTPEngine | 22222 | 22222 | UDP | Control (NG protocol) |
| RTPEngine | 30000-30100 | 30000-30100 | UDP | RTP/SRTP Media |
| Drachtio-1 | 5080 | 5080 | UDP/TCP | SIP |
| Drachtio-1 | 9022 | 9022 | TCP | Control |
| Drachtio-2 | 5081 | 5081 | UDP/TCP | SIP |
| Drachtio-2 | 9023 | 9023 | TCP | Control |
| FreeSWITCH-1 | 5062 | 5060 | UDP/TCP | SIP |
| FreeSWITCH-1 | 8021 | 8021 | TCP | ESL |
| FreeSWITCH-1 | 16384-16583 | 16384-16583 | UDP | RTP (200 ports) |
| FreeSWITCH-2 | 5063 | 5060 | UDP/TCP | SIP |
| FreeSWITCH-2 | 8022 | 8021 | TCP | ESL |
| FreeSWITCH-2 | 16584-16783 | 16384-16583 | UDP | RTP (200 ports) |
| LiveKit | 7880 | 7880 | TCP | HTTP |
| LiveKit | 7881 | 7881 | TCP | gRPC |
| LiveKit | 50000-50100 | 50000-50100 | UDP | RTC |
| PostgreSQL | 5432 | 5432 | TCP | Database |
| PgAdmin | 5050 | 80 | HTTP | Web UI |
| Redis | 6379 | 6379 | TCP | Cache |
| dSIPRouter | 5000 | 5000 | HTTP | API |
| Admin Dashboard | 3000 | 3000 | HTTP | API |

## High Availability Features

### Load Balancing
- Kamailio dispatches calls between 2 Drachtio servers
- Round-robin and failover capabilities

### Redundancy
- 2 Drachtio servers for call handling
- 2 FreeSWITCH servers for media processing
- 2 Drachtio applications for business logic

### Health Checks
All services include health checks:
- Interval: 10 seconds
- Timeout: 3 seconds
- Retries: 5
- Start period: 30 seconds
- Start interval: 5 seconds

### Data Persistence
- PostgreSQL data volume
- Redis data volume
- Kamailio log volume

## Security Features

1. **Authentication**:
   - SIP digest authentication
   - Password-protected extensions
   - Redis password protection
   - Database password protection

2. **Rate Limiting**:
   - Pike module in Kamailio for flood detection
   - Hash table for IP-based rate limiting

3. **Network Security**:
   - Isolated Docker network
   - Internal service communication
   - Nginx reverse proxy for external access

4. **Access Control**:
   - PgAdmin login required
   - Agent authentication
   - LiveKit API key/secret

## Scalability Considerations

### Horizontal Scaling
- Add more Drachtio servers to Kamailio dispatcher
- Add more FreeSWITCH instances for media processing
- Load balance Drachtio applications

### Vertical Scaling
- Increase Docker resource limits
- Adjust PostgreSQL connection pools
- Configure Redis memory limits

### Performance Optimization
- Redis for session caching
- PostgreSQL connection pooling
- Nginx request caching
- CDN for static assets (production)

## Monitoring and Logging

### Logging Strategy
- All services log to stdout/stderr
- Centralized via Docker logging
- Access via `docker-compose logs`

### Metrics
- Admin Dashboard provides real-time statistics
- dSIPRouter shows system health
- Database stores historical data

### Health Monitoring
- Built-in health checks for all services
- Automatic restart on failure
- Status visible via `docker-compose ps`

## Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| SIP Proxy | Kamailio | 5.7 |
| Media Proxy | RTPEngine | Latest |
| SIP Server | Drachtio | Latest |
| Media Server | FreeSWITCH | Latest |
| WebRTC | LiveKit | Latest |
| Database | PostgreSQL | 15-alpine |
| Cache | Redis | 7-alpine |
| Web Server | Nginx | Alpine |
| Client | SIP.js | 0.21.2 |
| Backend | Node.js | 18-alpine |
| Management | Python/Flask | 3.9 |
| Container | Docker | Latest |
| Orchestration | Docker Compose | 3.8 |

## Deployment Architecture

### Development
- All services on single host
- Shared network bridge
- Local volumes

### Production (Recommended)
- Separate database server
- Load balancer in front of Nginx
- External Redis cluster
- SSL/TLS certificates
- CDN for static assets
- Monitoring (Prometheus/Grafana)
- Log aggregation (ELK stack)

## Maintenance and Operations

### Backup Strategy
```bash
# Database backup
docker-compose exec postgres pg_dump -U voip_user voip_db > backup.sql

# Redis backup
docker-compose exec redis redis-cli --rdb /data/dump.rdb
```

### Updates
```bash
# Pull latest images
docker-compose pull

# Rebuild custom images
docker-compose build

# Restart services
docker-compose up -d
```

### Troubleshooting
```bash
# View service logs
docker-compose logs -f [service_name]

# Check service status
docker-compose ps

# Restart specific service
docker-compose restart [service_name]

# Access service shell
docker-compose exec [service_name] sh
```

This architecture provides a robust, scalable, and feature-rich VoIP platform suitable for production deployments with proper configuration and security hardening.
