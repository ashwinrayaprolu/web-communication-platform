# Environment Variables Reference

## Overview

This document lists all environment variables used across all services in the VoIP application.

## Quick Reference Table

| Variable | Service | Value | Purpose |
|----------|---------|-------|---------|
| **Database (PostgreSQL)** | | | |
| POSTGRES_DB | postgres | voip_db | Database name |
| POSTGRES_USER | postgres | voip_user | Database user |
| POSTGRES_PASSWORD | postgres | voip_pass_2024 | Database password |
| PGDATA | postgres | /var/lib/postgresql/data/pgdata | Data directory |
| DB_HOST | multiple | postgres | PostgreSQL hostname |
| DB_PORT | multiple | 5432 | PostgreSQL port |
| DB_NAME | multiple | voip_db | Database name |
| DB_USER | multiple | voip_user | Database user |
| DB_PASSWORD | multiple | voip_pass_2024 | Database password |
| **Redis** | | | |
| REDIS_HOST | multiple | redis | Redis hostname |
| REDIS_PORT | multiple | 6379 or "6379" | Redis port |
| REDIS_PASSWORD | multiple | redis_pass_2024 | Redis password |
| REDIS_ADDRESS | livekit | redis:6379 | Complete Redis address |
| **RTPEngine** | | | |
| LISTEN_NG | rtpengine | 22222 | Control port |
| PORT_MIN | rtpengine | 30000 | RTP port range start |
| PORT_MAX | rtpengine | 30100 | RTP port range end |
| LOG_LEVEL | rtpengine | 6 | Log verbosity |
| RTPENGINE_HOST | kamailio | rtpengine | RTPEngine hostname |
| RTPENGINE_PORT | kamailio | 22222 | RTPEngine control port |
| **Kamailio** | | | |
| DB_HOST | kamailio | postgres | Database host |
| DB_PORT | kamailio | 5432 | Database port |
| DB_NAME | kamailio | voip_db | Database name |
| DB_USER | kamailio | voip_user | Database user |
| DB_PASSWORD | kamailio | voip_pass_2024 | Database password |
| RTPENGINE_HOST | kamailio | rtpengine | RTPEngine host |
| RTPENGINE_PORT | kamailio | 22222 | RTPEngine port |
| **Drachtio** | | | |
| DRACHTIO_HOST | drachtio-app-1 | drachtio-1 | Drachtio server host |
| DRACHTIO_PORT | drachtio-app-1 | 9022 | Drachtio control port |
| DRACHTIO_SECRET | drachtio-app-1 | drachtio_secret_2024 | Drachtio secret |
| FREESWITCH_HOST | drachtio-app-1 | freeswitch-1 | FreeSWITCH host |
| FREESWITCH_PORT | drachtio-app-1 | 8021 | FreeSWITCH ESL port |
| FREESWITCH_PASSWORD | drachtio-app-1 | ClueCon | FreeSWITCH ESL password |
| **FreeSWITCH** | | | |
| SOUNDS_VERSION | freeswitch-1/2 | 1.0.52 | Sound files version |
| SERVER_ID | freeswitch-1/2 | 1 or 2 | Server identifier |
| ESL_PASSWORD | freeswitch-1/2 | ClueCon | Event Socket password |
| **LiveKit** | | | |
| LIVEKIT_URL | multiple | http://livekit:7880 | LiveKit server URL |
| LIVEKIT_API_KEY | multiple | APIjqJzKvMmrEWU9x7pL2nK8fG4hT5s | API key (32+ chars) |
| LIVEKIT_API_SECRET | multiple | secret... | API secret (32+ chars) |
| *(No Redis env vars - uses config file only)* | | | |
| **PgAdmin** | | | |
| PGADMIN_DEFAULT_EMAIL | pgadmin | admin@voip.local | Login email |
| PGADMIN_DEFAULT_PASSWORD | pgadmin | admin123 | Login password |
| PGADMIN_LISTEN_PORT | pgadmin | 80 | Internal port |

---

## Service-by-Service Breakdown

### PostgreSQL
```yaml
postgres:
  environment:
    POSTGRES_DB: voip_db
    POSTGRES_USER: voip_user
    POSTGRES_PASSWORD: voip_pass_2024
    PGDATA: /var/lib/postgresql/data/pgdata
```

### PgAdmin
```yaml
pgadmin:
  environment:
    PGADMIN_DEFAULT_EMAIL: admin@voip.local
    PGADMIN_DEFAULT_PASSWORD: admin123
    PGADMIN_LISTEN_PORT: 80
```

### Redis
```yaml
redis:
  command: >
    redis-server
    --requirepass redis_pass_2024
    --appendonly yes
```

### RTPEngine
```yaml
rtpengine:
  environment:
    LISTEN_NG: 22222
    PORT_MIN: 30000
    PORT_MAX: 30100
    LOG_LEVEL: 6
```

### Kamailio
```yaml
kamailio:
  environment:
    DB_HOST: postgres
    DB_PORT: 5432
    DB_NAME: voip_db
    DB_USER: voip_user
    DB_PASSWORD: voip_pass_2024
    RTPENGINE_HOST: rtpengine
    RTPENGINE_PORT: 22222
```

### Drachtio App 1
```yaml
drachtio-app-1:
  environment:
    DRACHTIO_HOST: drachtio-1
    DRACHTIO_PORT: 9022
    DRACHTIO_SECRET: drachtio_secret_2024
    FREESWITCH_HOST: freeswitch-1
    FREESWITCH_PORT: 8021
    FREESWITCH_PASSWORD: ClueCon
    DB_HOST: postgres
    DB_PORT: 5432
    DB_NAME: voip_db
    DB_USER: voip_user
    DB_PASSWORD: voip_pass_2024
    REDIS_HOST: redis
    REDIS_PORT: 6379
    REDIS_PASSWORD: redis_pass_2024
    LIVEKIT_URL: http://livekit:7880
    LIVEKIT_API_KEY: APIjqJzKvMmrEWU9x7pL2nK8fG4hT5s
    LIVEKIT_API_SECRET: secretABCDEF123456789GHIJKL0987654321MNOPQRuvwxyz
```

### Drachtio App 2
```yaml
drachtio-app-2:
  environment:
    DRACHTIO_HOST: drachtio-2
    DRACHTIO_PORT: 9023
    DRACHTIO_SECRET: drachtio_secret_2024
    FREESWITCH_HOST: freeswitch-2
    FREESWITCH_PORT: 8021
    FREESWITCH_PASSWORD: ClueCon
    # ... same DB, Redis, LiveKit config as app-1
```

### FreeSWITCH 1
```yaml
freeswitch-1:
  environment:
    SOUNDS_VERSION: 1.0.52
    SERVER_ID: 1
    ESL_PASSWORD: ClueCon
```

### FreeSWITCH 2
```yaml
freeswitch-2:
  environment:
    SOUNDS_VERSION: 1.0.52
    SERVER_ID: 2
    ESL_PASSWORD: ClueCon
```

### LiveKit

**IMPORTANT**: LiveKit does NOT use environment variables for Redis. It reads from the config file only.

```yaml
livekit:
  command: --config /etc/livekit.yaml
  # NO Redis environment variables!
  # Everything configured in livekit.yaml
  volumes:
    - ./livekit/livekit.yaml:/etc/livekit.yaml
```

**Configuration in livekit/livekit.yaml**:
```yaml
port: 7880

redis:
  address: redis:6379           # ✅ Complete address
  password: redis_pass_2024
  db: 0

keys:
  APIjqJzKvMmrEWU9x7pL2nK8fG4hT5s: secretABCDEF123456789GHIJKL0987654321MNOPQRuvwxyz
  # ↑ 32+ characters required

logging:
  level: info

room:
  auto_create: true
  empty_timeout: 300
  max_participants: 100
```

**Why no environment variables?**
- Environment variables override config file
- Setting `REDIS_HOST` without proper format breaks connection
- Config file is clearer and more maintainable
- Avoids string vs integer port issues

### dSIPRouter
```yaml
dsiprouter:
  environment:
    DB_HOST: postgres
    DB_PORT: 5432
    DB_NAME: voip_db
    DB_USER: voip_user
    DB_PASSWORD: voip_pass_2024
```

### Admin Dashboard
```yaml
admin-dashboard:
  environment:
    DB_HOST: postgres
    DB_PORT: 5432
    DB_NAME: voip_db
    DB_USER: voip_user
    DB_PASSWORD: voip_pass_2024
    REDIS_HOST: redis
    REDIS_PORT: 6379
    REDIS_PASSWORD: redis_pass_2024
    LIVEKIT_URL: http://livekit:7880
    LIVEKIT_API_KEY: APIjqJzKvMmrEWU9x7pL2nK8fG4hT5s
    LIVEKIT_API_SECRET: secretABCDEF123456789GHIJKL0987654321MNOPQRuvwxyz
```

---

## Important Notes

### Service Names vs Container Names

**Always use service names in environment variables, not container names!**

✅ **Correct** (service names):
- `DB_HOST: postgres`
- `REDIS_HOST: redis`
- `RTPENGINE_HOST: rtpengine`
- `FREESWITCH_HOST: freeswitch-1`

❌ **Wrong** (container names):
- `DB_HOST: voip-postgres`
- `REDIS_HOST: voip-redis`
- `RTPENGINE_HOST: voip-rtpengine`

### Port Number Format

Most services accept ports as integers:
```yaml
DB_PORT: 5432           # Integer - OK
REDIS_PORT: 6379        # Integer - OK
FREESWITCH_PORT: 8021   # Integer - OK
```

**Note**: LiveKit does not use environment variables for Redis configuration - it reads from `livekit.yaml` config file only.

### Complete Addresses

Some services need the complete address including port:
```yaml
# LiveKit
REDIS_ADDRESS: redis:6379           # ✅ Includes port

# Kamailio (in cfg file)
RTPENGINE_SOCKET: rtpengine:22222   # ✅ Includes port

# LIVEKIT_URL
LIVEKIT_URL: http://livekit:7880    # ✅ Includes port and protocol
```

### Security Requirements

**LiveKit Keys**:
- API Key: Must be at least 32 characters
- API Secret: Must be at least 32 characters
- Both must match in `livekit.yaml` and environment variables

**Passwords**:
- PostgreSQL: Change `voip_pass_2024` for production
- Redis: Change `redis_pass_2024` for production
- FreeSWITCH ESL: Change `ClueCon` for production
- Drachtio: Change `drachtio_secret_2024` for production

### DNS Resolution

All service names are automatically resolved by Docker's internal DNS:
- Service name: `redis` → Resolved to container IP (e.g., `172.18.0.3`)
- No need for /etc/hosts entries
- Works across all containers in the same network

---

## Environment Variable Validation

### Check Current Values

```bash
# View all environment variables for a service
docker-compose exec drachtio-app-1 env | sort

# Check specific variable
docker-compose exec drachtio-app-1 env | grep DB_HOST

# Check LiveKit environment
docker-compose exec livekit env | grep REDIS
```

### Test Connectivity

```bash
# Test database connection
docker-compose exec drachtio-app-1 sh -c 'echo $DB_HOST && nc -zv $DB_HOST $DB_PORT'

# Test Redis connection
docker-compose exec livekit sh -c 'nc -zv redis 6379'

# Test RTPEngine connection
docker-compose exec kamailio nc -zvu rtpengine 22222
```

### Common Issues

**Issue**: Service can't connect to database
```bash
# Check DB_HOST value
docker-compose exec drachtio-app-1 env | grep DB_HOST
# Should show: DB_HOST=postgres (not voip-postgres)

# Test connection
docker-compose exec drachtio-app-1 ping postgres
```

**Issue**: LiveKit can't connect to Redis
```bash
# Check the config file
cat livekit/livekit.yaml | grep -A 3 redis
# Should show:
# redis:
#   address: redis:6379
#   password: redis_pass_2024

# Verify no environment variables are set
docker-compose config | grep -A 20 "livekit:" | grep -i redis
# Should show NO Redis environment variables

# Test connection from LiveKit container
docker-compose exec livekit nc -zv redis 6379
# Should show: redis (172.x.x.x:6379) open
```

**Issue**: Drachtio app can't reach FreeSWITCH
```bash
# Check FREESWITCH_HOST
docker-compose exec drachtio-app-1 env | grep FREESWITCH_HOST
# Should show: FREESWITCH_HOST=freeswitch-1

# Test connection
docker-compose exec drachtio-app-1 nc -zv freeswitch-1 8021
```

---

## Using .env File (Optional)

You can create a `.env` file for easier credential management:

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

**Note**: docker-compose.yaml already has all values. The .env file is optional and mainly for reference or if you want to override values.

---

## Production Deployment Checklist

Before deploying to production, change these values:

- [ ] `POSTGRES_PASSWORD` - Generate strong password
- [ ] `REDIS_PASSWORD` - Generate strong password
- [ ] `LIVEKIT_API_KEY` - Generate 32+ character key
- [ ] `LIVEKIT_API_SECRET` - Generate 32+ character secret
- [ ] `DRACHTIO_SECRET` - Generate strong secret
- [ ] `ESL_PASSWORD` - Change from default ClueCon
- [ ] `PGADMIN_DEFAULT_PASSWORD` - Change admin password

**Generate secure values**:
```bash
# For passwords (24 characters)
openssl rand -base64 18

# For LiveKit keys (32+ characters)
openssl rand -base64 24 | tr -d /=+ | cut -c1-32

# For LiveKit secrets (48 characters)
openssl rand -base64 36 | tr -d /=+ | cut -c1-48
```

Then update in:
1. `docker-compose.yaml`
2. `livekit/livekit.yaml` (for LiveKit keys)
3. Any application code referencing these values

---

## Summary

**Key Principles**:
1. ✅ Use service names, not container names
2. ✅ Include ports where required
3. ✅ LiveKit REDIS_PORT must be string
4. ✅ LiveKit keys must be 32+ characters
5. ✅ Change all default passwords for production
6. ✅ Test connectivity with `nc -zv`

For troubleshooting, see **QUICK_FIXES.md** Error 12.
