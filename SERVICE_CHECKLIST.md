# Complete Service Inventory & Configuration Checklist

## All Services in the VoIP Application

This document lists **every single service** and where it should be referenced in all configuration files and documentation.

## Service List (15 Services Total)

1. **postgres** - PostgreSQL Database
2. **pgadmin** - Database Management UI
3. **redis** - Cache and State Management
4. **rtpengine** - Media Proxy (WebRTC ↔ RTP)
5. **kamailio** - SIP Proxy and Load Balancer
6. **drachtio-1** - SIP Server Instance 1
7. **drachtio-2** - SIP Server Instance 2
8. **freeswitch-1** - Media Server Instance 1
9. **freeswitch-2** - Media Server Instance 2
10. **drachtio-app-1** - Application Logic Instance 1
11. **drachtio-app-2** - Application Logic Instance 2
12. **livekit** - WebRTC Media Server
13. **dsiprouter** - Management Interface
14. **admin-dashboard** - Admin API
15. **nginx** - Web Server and Reverse Proxy

---

## Configuration File Checklist

### ✅ docker-compose.yaml

**All services defined:**
- [x] postgres
- [x] pgadmin
- [x] redis
- [x] rtpengine
- [x] kamailio
- [x] drachtio-1
- [x] drachtio-2
- [x] freeswitch-1
- [x] freeswitch-2
- [x] drachtio-app-1
- [x] drachtio-app-2
- [x] livekit
- [x] dsiprouter
- [x] admin-dashboard
- [x] nginx

**All services have:**
- [x] Health checks
- [x] Restart policies
- [x] Network membership
- [x] Proper dependencies

---

### ✅ start.sh

**Services in health check list:**
```bash
services=("postgres" "redis" "rtpengine" "kamailio" "drachtio-1" "drachtio-2" "freeswitch-1" "freeswitch-2" "livekit" "admin-dashboard" "dsiprouter" "nginx")
```

**All ports listed in output:**
- [x] Kamailio: 5060, 8080
- [x] RTPEngine: 22222, 30000-30100
- [x] Drachtio-1: 5080, 9022
- [x] Drachtio-2: 5081, 9023
- [x] FreeSWITCH-1: 5062, 8021, 16384-16583
- [x] FreeSWITCH-2: 5063, 8022, 16584-16783
- [x] LiveKit: 7880, 7881, 50000-50100
- [x] PostgreSQL: 5432
- [x] Redis: 6379
- [x] dSIPRouter: 5000
- [x] Admin Dashboard: 3000

**All access points listed:**
- [x] Customer Portal: http://localhost/
- [x] Agent Portal: http://localhost/agent.html
- [x] dSIPRouter: http://localhost/dsiprouter/
- [x] Admin Dashboard: http://localhost/api/admin/
- [x] PgAdmin: http://localhost:5050

---

### ✅ test.sh

**Services with health checks:**
- [x] postgres
- [x] redis
- [x] rtpengine
- [x] nginx
- [x] kamailio

**Services with API tests:**
- [x] admin-dashboard (health, stats)
- [x] dsiprouter (api/stats)
- [x] livekit (http, port)

**Services with port tests:**
- [x] kamailio (5060, 8080)
- [x] rtpengine (22222)
- [x] drachtio-1 (5080)
- [x] drachtio-2 (5081)
- [x] freeswitch-1 (8021)
- [x] freeswitch-2 (8022)

**Services in container status:**
- [x] All services shown in `docker-compose ps`

---

### ✅ architecture.md

**Services in diagram:**
- [x] Nginx (Presentation Layer)
- [x] Kamailio (SIP Layer)
- [x] Drachtio-1, Drachtio-2 (SIP Layer)
- [x] RTPEngine (Media Layer)
- [x] Drachtio Apps 1, 2 (Media Layer)
- [x] FreeSWITCH-1, FreeSWITCH-2 (Media Layer)
- [x] LiveKit (Media Layer)
- [x] Admin Dashboard (Management Layer)
- [x] dSIPRouter (Management Layer)
- [x] PostgreSQL (Data Layer)
- [x] Redis (Data Layer)
- [x] PgAdmin (Data Layer)

**Services in network table:**
- [x] All 15 services listed with DNS names

**Services in port mapping:**
- [x] All services with exposed ports listed

**Services in component descriptions:**
- [x] All services explained

**Services in technology stack:**
- [x] All major components listed

---

### ✅ README.md

**Services mentioned in features:**
- [x] RTPEngine (WebRTC ↔ RTP)
- [x] FreeSWITCH (Media)
- [x] Kamailio (SIP)
- [x] LiveKit (WebRTC)
- [x] PostgreSQL (Database)
- [x] Redis (Cache)

**Services in prerequisites:**
- [x] Docker
- [x] Docker Compose

**Services in Quick Start:**
- [x] All services start with docker-compose up

**Services in testing:**
- [x] Browser portal tests
- [x] Extension tests
- [x] IVR tests
- [x] Database tests

**Services in troubleshooting:**
- [x] RTPEngine
- [x] PostgreSQL
- [x] General service logs

---

### ✅ MEDIA_FLOW_ARCHITECTURE.md

**Services in media flow:**
- [x] Browser
- [x] Nginx
- [x] Kamailio
- [x] RTPEngine (WebRTC ↔ RTP conversion)
- [x] Drachtio
- [x] FreeSWITCH
- [x] LiveKit

**Call flow diagrams include:**
- [x] Direct call: Browser → Nginx → Kamailio → RTPEngine → Drachtio → FreeSWITCH
- [x] IVR call: Same path with DTMF processing
- [x] LiveKit call: Browser → LiveKit (direct WebRTC)

---

### ✅ DNS_ARCHITECTURE.md

**All services in DNS table:**
- [x] postgres
- [x] redis
- [x] rtpengine
- [x] kamailio
- [x] drachtio-1, drachtio-2
- [x] freeswitch-1, freeswitch-2
- [x] livekit
- [x] All other services

**Service name examples:**
- [x] DB_HOST=postgres
- [x] REDIS_HOST=redis
- [x] RTPENGINE_HOST=rtpengine
- [x] etc.

---

### ✅ PROJECT_STRUCTURE.md

**All service directories listed:**
- [x] postgres/
- [x] kamailio/
- [x] rtpengine/
- [x] drachtio-apps/
- [x] freeswitch/
- [x] livekit/
- [x] dsiprouter/
- [x] admin-dashboard/
- [x] nginx/

**All Dockerfiles documented:**
- [x] kamailio/Dockerfile
- [x] rtpengine/Dockerfile (backup)
- [x] freeswitch/Dockerfile (backup)
- [x] drachtio-apps/*/Dockerfile
- [x] dsiprouter/Dockerfile
- [x] admin-dashboard/Dockerfile
- [x] nginx/Dockerfile

---

### ✅ RTPENGINE_TROUBLESHOOTING.md

**RTPEngine specific:**
- [x] Installation methods
- [x] Official image usage
- [x] Configuration
- [x] Testing with Kamailio
- [x] Port verification
- [x] Common issues

**Related services:**
- [x] Kamailio (controls RTPEngine)
- [x] FreeSWITCH (receives RTP from RTPEngine)
- [x] Browser (sends WebRTC to RTPEngine)

---

### ✅ FREESWITCH_DIALPLAN_EXPLAINED.md

**FreeSWITCH architecture:**
- [x] FreeSWITCH role as media processor
- [x] Drachtio App control via ESL
- [x] No XML dialplan needed

**Related services:**
- [x] Drachtio Apps (control FreeSWITCH)
- [x] FreeSWITCH (processes media)
- [x] PostgreSQL (stores IVR config)
- [x] Redis (stores state)

---

### ✅ UPGRADE_NOTES.md

**Services affected by updates:**
- [x] RTPEngine (now official image)
- [x] FreeSWITCH (now official image)
- [x] All Dockerfiles (netcat-openbsd)

**Port changes documented:**
- [x] FreeSWITCH RTP ports increased
- [x] RTPEngine ports listed

---

## Port Mapping Reference

### Complete Port List

| Service | External Port(s) | Internal Port(s) | Protocol | Purpose |
|---------|------------------|------------------|----------|---------|
| **nginx** | 80, 443 | 80, 443 | TCP | Web Interface |
| **kamailio** | 5060 | 5060 | UDP/TCP | SIP |
| **kamailio** | 8080 | 8080 | TCP | WebSocket |
| **rtpengine** | 22222 | 22222 | UDP | Control (NG) |
| **rtpengine** | 30000-30100 | 30000-30100 | UDP | RTP/SRTP Media |
| **drachtio-1** | 5080 | 5080 | UDP/TCP | SIP |
| **drachtio-1** | 9022 | 9022 | TCP | Control |
| **drachtio-2** | 5081 | 5081 | UDP/TCP | SIP |
| **drachtio-2** | 9023 | 9023 | TCP | Control |
| **freeswitch-1** | 5062 | 5060 | UDP/TCP | SIP |
| **freeswitch-1** | 8021 | 8021 | TCP | ESL |
| **freeswitch-1** | 16384-16583 | 16384-16583 | UDP | RTP (200 ports) |
| **freeswitch-2** | 5063 | 5060 | UDP/TCP | SIP |
| **freeswitch-2** | 8022 | 8021 | TCP | ESL |
| **freeswitch-2** | 16584-16783 | 16384-16583 | UDP | RTP (200 ports) |
| **livekit** | 7880 | 7880 | TCP | HTTP |
| **livekit** | 7881 | 7881 | TCP | gRPC |
| **livekit** | 50000-50100 | 50000-50100 | UDP | WebRTC Media |
| **postgres** | 5432 | 5432 | TCP | Database |
| **pgadmin** | 5050 | 80 | TCP | Web UI |
| **redis** | 6379 | 6379 | TCP | Cache |
| **dsiprouter** | 5000 | 5000 | TCP | API |
| **admin-dashboard** | 3000 | 3000 | TCP | API |

**Total Ports Used:**
- TCP: 14 ports
- UDP Ranges: 3 ranges (RTPEngine, FreeSWITCH-1, FreeSWITCH-2, LiveKit)
- Total UDP ports: ~700 ports

---

## Service Dependencies

### Dependency Tree

```
nginx
├── admin-dashboard
│   ├── postgres
│   ├── redis
│   └── livekit
├── dsiprouter
│   ├── postgres
│   └── kamailio
└── kamailio
    ├── postgres
    ├── redis
    └── rtpengine

kamailio
├── drachtio-1
│   └── drachtio-app-1
│       ├── postgres
│       ├── redis
│       ├── freeswitch-1
│       └── livekit
└── drachtio-2
    └── drachtio-app-2
        ├── postgres
        ├── redis
        ├── freeswitch-2
        └── livekit

rtpengine (standalone, controlled by kamailio)

livekit
└── redis

pgadmin
└── postgres
```

---

## Environment Variables Reference

### Services Using Database

- **drachtio-app-1, drachtio-app-2**
  - DB_HOST=postgres
  - DB_PORT=5432
  - DB_NAME=voip_db
  - DB_USER=voip_user
  - DB_PASSWORD=voip_pass_2024

- **admin-dashboard**
  - DB_HOST=postgres
  - (same credentials)

- **dsiprouter**
  - DB_HOST=postgres
  - (same credentials)

### Services Using Redis

- **drachtio-app-1, drachtio-app-2**
  - REDIS_HOST=redis
  - REDIS_PORT=6379
  - REDIS_PASSWORD=redis_pass_2024

- **admin-dashboard**
  - REDIS_HOST=redis
  - (same credentials)

- **livekit**
  - REDIS_HOST=redis
  - (same credentials)

### Services Using Other Services

- **kamailio**
  - RTPENGINE_HOST=rtpengine
  - RTPENGINE_PORT=22222

- **drachtio-app-1**
  - DRACHTIO_HOST=drachtio-1
  - FREESWITCH_HOST=freeswitch-1
  - LIVEKIT_URL=http://livekit:7880

- **drachtio-app-2**
  - DRACHTIO_HOST=drachtio-2
  - FREESWITCH_HOST=freeswitch-2
  - LIVEKIT_URL=http://livekit:7880

---

## Verification Commands

### Check All Services Running

```bash
docker-compose ps
```

Should show all 15 services as "Up" or "Up (healthy)"

### Check All Service Logs

```bash
# Individual service
docker-compose logs [service-name]

# All services
docker-compose logs

# Follow logs
docker-compose logs -f
```

### Test Each Service

```bash
# PostgreSQL
docker-compose exec postgres pg_isready -U voip_user

# Redis
docker-compose exec redis redis-cli -a redis_pass_2024 ping

# RTPEngine (from kamailio)
docker-compose exec kamailio nc -zvu rtpengine 22222

# Kamailio
docker-compose exec kamailio kamctl ping

# Drachtio
nc -zv localhost 5080
nc -zv localhost 5081

# FreeSWITCH
nc -zv localhost 8021
nc -zv localhost 8022

# LiveKit
curl -s http://localhost:7880/

# Nginx
curl -s http://localhost/
```

---

## Missing Service Checklist

Before any release, verify:

- [ ] All 15 services in docker-compose.yaml
- [ ] All services in start.sh health check list
- [ ] All ports in start.sh output
- [ ] All services in test.sh
- [ ] All services in architecture.md diagram
- [ ] All services in architecture.md tables
- [ ] All services in README.md
- [ ] All service directories in PROJECT_STRUCTURE.md
- [ ] RTPEngine in MEDIA_FLOW_ARCHITECTURE.md
- [ ] All services using DNS names (not IPs)
- [ ] All services have health checks
- [ ] All services have restart policies
- [ ] All inter-service communication uses service names

---

## Quick Reference Card

**15 Services:**
1. postgres, pgadmin
2. redis
3. rtpengine
4. kamailio
5. drachtio-1, drachtio-2
6. freeswitch-1, freeswitch-2
7. drachtio-app-1, drachtio-app-2
8. livekit
9. dsiprouter, admin-dashboard
10. nginx

**Every file that should list services:**
- docker-compose.yaml ✓
- start.sh ✓
- test.sh ✓
- architecture.md ✓
- README.md ✓
- All *_ARCHITECTURE.md docs ✓

**Total: 15 services, ~700 ports, 5 volumes, 1 network**

---

*This checklist ensures no service is forgotten in any configuration file or documentation.*
