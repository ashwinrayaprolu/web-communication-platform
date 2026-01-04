# DNS-Based Service Discovery Architecture

## Why DNS Names Instead of Static IPs?

### ✅ Benefits of DNS-Based Approach

1. **Portability**: Services work in any Docker network without IP conflicts
2. **Maintainability**: No need to track IP addresses in configurations
3. **Scalability**: Easy to add/remove instances without reconfiguration
4. **Cloud-Ready**: Works seamlessly in cloud environments (AWS, GCP, Azure)
5. **Container Orchestration**: Compatible with Kubernetes, Docker Swarm
6. **Dynamic Discovery**: Docker's internal DNS resolves service names automatically
7. **No Hardcoding**: Configuration files remain clean and readable

### ❌ Problems with Static IPs

1. **IP Conflicts**: Risk of collisions in different environments
2. **Brittle Configuration**: Changes require updating multiple files
3. **Not Cloud-Native**: Doesn't work with auto-scaling
4. **Manual Management**: Need to track IP allocations
5. **Network Dependency**: Tied to specific subnet configurations

## How Docker DNS Works

### Automatic Service Discovery

When you use service names in Docker Compose:

```yaml
services:
  postgres:
    container_name: voip-postgres
    networks:
      - voip-network
  
  kamailio:
    environment:
      DB_HOST: postgres  # ← Docker DNS resolves this
    networks:
      - voip-network
```

**Behind the Scenes**:
1. Docker creates internal DNS server for `voip-network`
2. Service name `postgres` maps to container's IP automatically
3. IP can change, but DNS name stays the same
4. All containers in same network can resolve each other

### DNS Resolution Example

```bash
# Inside kamailio container
ping postgres
# PING postgres (172.20.0.5) - IP assigned dynamically!

# Inside drachtio-app-1 container
nslookup freeswitch-1
# Returns: freeswitch-1 has address 172.20.0.8
```

## Updated Service Communication Map

### Database Connections
```
All Services → postgres:5432
  ✅ drachtio-app-1 uses DB_HOST=postgres
  ✅ admin-dashboard uses DB_HOST=postgres
  ✅ dsiprouter uses DB_HOST=postgres
  
  ❌ OLD: DB_HOST=172.20.0.10 (brittle!)
  ✅ NEW: DB_HOST=postgres (flexible!)
```

### Redis Connections
```
All Services → redis:6379
  ✅ drachtio-app-1 uses REDIS_HOST=redis
  ✅ admin-dashboard uses REDIS_HOST=redis
  ✅ livekit uses REDIS_HOST=redis
```

### SIP Routing
```
Kamailio → Drachtio Servers
  ✅ dispatcher.list:
     sip:drachtio-1:5080
     sip:drachtio-2:5081
  
  ❌ OLD: sip:172.20.0.30:5080 (hardcoded!)
  ✅ NEW: sip:drachtio-1:5080 (portable!)
```

### Media Server Access
```
Drachtio Apps → FreeSWITCH
  ✅ drachtio-app-1:
     FREESWITCH_HOST=freeswitch-1
     FREESWITCH_PORT=8021
  
  ✅ drachtio-app-2:
     FREESWITCH_HOST=freeswitch-2
     FREESWITCH_PORT=8021
```

### RTPEngine Control
```
Kamailio → RTPEngine
  ✅ kamailio.cfg:
     modparam("rtpengine", "rtpengine_sock", "udp:rtpengine:22222")
  
  ❌ OLD: "udp:172.20.0.100:22222" (static IP!)
  ✅ NEW: "udp:rtpengine:22222" (DNS name!)
```

## Service Name Convention

### Standard Format
```
service-name-[instance-number]

Examples:
  ✅ postgres (single instance)
  ✅ redis (single instance)
  ✅ drachtio-1 (instance 1)
  ✅ drachtio-2 (instance 2)
  ✅ freeswitch-1 (instance 1)
  ✅ freeswitch-2 (instance 2)
```

### Container Names vs Service Names

**Service Name** (in docker-compose.yaml):
```yaml
services:
  postgres:  # ← This is the DNS name
```

**Container Name** (optional, for docker commands):
```yaml
services:
  postgres:
    container_name: voip-postgres  # ← This is for docker ps
```

**Both work for DNS resolution!**
```bash
# Inside any container
ping postgres        # ✅ Works
ping voip-postgres   # ✅ Also works (via container_name)
```

## Configuration Updates Summary

### 1. Docker Compose
```yaml
# REMOVED: Static IP assignments
networks:
  voip-network:
    ipam:
      config:
        - subnet: 172.20.0.0/16  # ← REMOVED

# REMOVED: Service-level IPs
services:
  postgres:
    networks:
      voip-network:
        ipv4_address: 172.20.0.10  # ← REMOVED

# NEW: Simple network membership
services:
  postgres:
    networks:
      - voip-network  # ← Just join the network!
```

### 2. Kamailio Dispatcher
```bash
# OLD (dispatcher.list)
1 sip:172.20.0.30:5080 0 0
1 sip:172.20.0.31:5081 0 0

# NEW (dispatcher.list)
1 sip:drachtio-1:5080 0 0
1 sip:drachtio-2:5081 0 0
```

### 3. RTPEngine Configuration
```ini
# OLD (rtpengine.conf)
interface = 172.20.0.100
listen-ng = 172.20.0.100:22222

# NEW (rtpengine.conf)
interface = internal/0.0.0.0
listen-ng = 0.0.0.0:22222
```

### 4. Application Environment Variables
```yaml
# OLD
environment:
  DB_HOST: 172.20.0.10
  REDIS_HOST: 172.20.0.12
  DRACHTIO_HOST: 172.20.0.30

# NEW
environment:
  DB_HOST: postgres
  REDIS_HOST: redis
  DRACHTIO_HOST: drachtio-1
```

## Testing DNS Resolution

### From Host Machine
```bash
# Not available - DNS is internal to Docker network
```

### From Inside Containers
```bash
# Check if service is resolvable
docker-compose exec kamailio ping -c 1 postgres
docker-compose exec kamailio nslookup drachtio-1

# Check RTPEngine resolution
docker-compose exec kamailio getent hosts rtpengine

# Test database connection by name
docker-compose exec drachtio-app-1 nc -zv postgres 5432
```

### Verify All Services Can Resolve Each Other
```bash
# Run from project directory
docker-compose exec kamailio sh -c "
  for service in postgres redis rtpengine drachtio-1 drachtio-2 freeswitch-1 freeswitch-2 livekit; do
    echo -n \"Testing \$service: \"
    if nslookup \$service > /dev/null 2>&1; then
      echo '✅ Resolved'
    else
      echo '❌ Failed'
    fi
  done
"
```

## Multi-Environment Support

### Development
```yaml
# docker-compose.yaml (same everywhere!)
environment:
  DB_HOST: postgres
```

### Staging
```yaml
# Same config works!
environment:
  DB_HOST: postgres  # Resolves to staging container
```

### Production
```yaml
# Still the same!
environment:
  DB_HOST: postgres  # Resolves to production container
```

### Kubernetes Migration
```yaml
# Minimal changes needed
apiVersion: v1
kind: Service
metadata:
  name: postgres  # ← Same name!
---
# App config stays identical
env:
  - name: DB_HOST
    value: postgres  # ← No changes needed!
```

## Debugging DNS Issues

### Check Docker DNS Server
```bash
# View Docker's internal DNS configuration
docker network inspect voip-network | grep -A 5 "DNS"
```

### Verify Container Can Resolve
```bash
# From inside container
cat /etc/resolv.conf
# Should show: nameserver 127.0.0.11 (Docker's DNS)

# Test resolution
nslookup postgres
dig postgres
getent hosts postgres
```

### Check Network Connectivity
```bash
# Ping by DNS name
docker-compose exec kamailio ping postgres

# Check port connectivity
docker-compose exec kamailio nc -zv postgres 5432
docker-compose exec kamailio telnet postgres 5432
```

### DNS Not Working?
```bash
# 1. Check both containers in same network
docker network inspect voip-network | grep Name

# 2. Restart Docker DNS
docker-compose down
docker-compose up -d

# 3. Check container networking
docker-compose exec kamailio ip addr
docker-compose exec kamailio ip route
```

## Performance Considerations

### DNS Caching
- Docker DNS caches results
- TTL is typically very short (for dynamic updates)
- No performance penalty vs static IPs

### Load Balancing
```yaml
# For load balancing, use external tools
# Docker DNS round-robins by default for scaled services

# Scale a service
docker-compose up -d --scale drachtio-app-1=3

# DNS will round-robin between instances
# drachtio-app-1 → 172.20.0.50, 172.20.0.51, 172.20.0.52
```

## Best Practices

### 1. Always Use Service Names
```yaml
✅ GOOD:
  REDIS_HOST: redis
  DB_HOST: postgres
  LIVEKIT_URL: http://livekit:7880

❌ BAD:
  REDIS_HOST: 172.20.0.12
  DB_HOST: 172.20.0.10
  LIVEKIT_URL: http://172.20.0.60:7880
```

### 2. Consistent Naming
```yaml
✅ GOOD:
  service: drachtio-1
  service: drachtio-2
  
❌ BAD:
  service: drachtio_server_one
  service: drachtio-2
```

### 3. Use Depends On
```yaml
✅ GOOD:
  depends_on:
    postgres:
      condition: service_healthy
  # Ensures postgres is up and DNS-resolvable

❌ BAD:
  # No depends_on - might try to connect before DNS ready
```

### 4. Document Dependencies
```yaml
# In docker-compose.yaml
services:
  kamailio:
    # Connects to: postgres, redis, rtpengine
    # Routes to: drachtio-1, drachtio-2
```

## Migration Checklist

- [x] Remove static IP assignments from docker-compose.yaml
- [x] Update all service references to use DNS names
- [x] Update Kamailio dispatcher.list
- [x] Update RTPEngine configuration
- [x] Update application environment variables
- [x] Test DNS resolution between all services
- [x] Verify all API endpoints work
- [x] Test call flow end-to-end
- [x] Update documentation

## Summary

**Before (Static IPs)**:
```
postgres: 172.20.0.10
redis: 172.20.0.12
rtpengine: 172.20.0.100
kamailio: 172.20.0.20
drachtio-1: 172.20.0.30
```

**After (DNS Names)**:
```
postgres → Resolved dynamically by Docker DNS
redis → Resolved dynamically by Docker DNS
rtpengine → Resolved dynamically by Docker DNS
kamailio → Resolved dynamically by Docker DNS
drachtio-1 → Resolved dynamically by Docker DNS
```

**Result**: 
- ✅ More portable
- ✅ Easier to maintain
- ✅ Cloud-ready
- ✅ Scalable
- ✅ Professional

The system now uses modern, cloud-native service discovery! 🎉
