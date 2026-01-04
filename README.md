# VoIP Application - Complete Solution

A complete, production-ready VoIP application stack with WebRTC support, IVR systems, agent management, and real-time call monitoring.

## 🎯 Features

- **Multi-platform Support**: Works on Linux (amd64/arm64), macOS (Intel/Apple Silicon)
- **Official Docker Images**: Uses pre-built images for RTPEngine and FreeSWITCH - no build required!
- **WebRTC Integration**: Browser-based calling with SIP.js
- **RTPEngine Media Proxy**: WebRTC ↔ RTP protocol conversion and media relay
  - Bridges browser WebRTC (SRTP) with FreeSWITCH RTP
  - Handles ICE, DTLS, and media encryption/decryption
  - Essential for browser-to-FreeSWITCH communication
- **IVR System**: Multi-level interactive voice response menus
- **Agent Portal**: Real-time agent dashboard with call management
- **Admin Dashboard**: Complete system monitoring and management
- **Load Balancing**: Automatic distribution across multiple servers
- **High Availability**: Redundant services for reliability
- **LiveKit Integration**: WebRTC media server for agent console
- **Database Management**: PgAdmin for easy database administration
- **DNS-Based Discovery**: Service names instead of static IPs for portability

## 📋 Prerequisites

- Docker (20.10 or later)
- Docker Compose (1.29 or later)
- 8GB RAM minimum (16GB recommended)
- 20GB disk space
- Ports available: 80, 443, 5060, 5080-5081, 7880-7881, 8080, 50000-50100

## 🚀 Quick Start

### 1. Clone and Start

```bash
# Make scripts executable
chmod +x start.sh stop.sh

# Start the entire stack
./start.sh
```

The startup script will:
- Check Docker installation
- Pull required images
- Build custom containers
- Start all services
- Wait for health checks
- Display access URLs

### 2. Access the Application

Once started, access these interfaces:

- **Customer Portal**: http://localhost/
- **Agent Portal**: http://localhost/agent.html
- **dSIPRouter**: http://localhost/dsiprouter/
- **Admin Dashboard API**: http://localhost/api/admin/
- **PgAdmin**: http://localhost:5050

## 🧪 End-to-End Testing Guide

### Test 1: Customer Direct Call (Extension 6000)

**Objective**: Test basic SIP calling functionality

1. Open browser to http://localhost/
2. Enter credentials:
   - Extension: `6000`
   - Password: `test123`
   - Server: `ws://localhost/ws`
3. Click "Connect"
4. Wait for status to show "Connected"
5. Select "Extension 6000 (Direct)" from dropdown
6. Click "📞 Call"
7. You should hear audio playback
8. Click "Hang Up" to end call

**Expected Result**: 
- Call connects successfully
- Audio plays
- Call logs appear in database

### Test 2: IVR System (Extension 9999)

**Objective**: Test Interactive Voice Response system

1. Open browser to http://localhost/
2. Login with extension `6000`
3. Select "Extension 9999 (IVR)" from dropdown
4. Click "📞 Call"
5. Listen to welcome menu
6. Use DTMF pad to press:
   - `1` for Sales menu
   - `2` for Support menu
   - `0` for Operator
7. Navigate through submenus using DTMF
8. Press `9` to return to main menu
9. Hang up when done

**Expected Result**:
- IVR menu plays correctly
- DTMF inputs are recognized
- Menus navigate properly
- Transfer options work

### Test 3: LiveKit WebRTC Call (Extension 555-XXXX)

**Objective**: Test WebRTC integration with LiveKit

1. Open browser to http://localhost/
2. Login with extension `6000`
3. Select "555-1234 (LiveKit)" from dropdown
4. Click "📞 Call"
5. Check LiveKit room creation:
   ```bash
   curl http://localhost:7880/
   ```

**Expected Result**:
- LiveKit room is created
- Call is established
- Media flows through LiveKit

### Test 4: Agent Portal

**Objective**: Test agent interface and call handling

1. Open http://localhost/agent.html in a new browser window
2. Login as agent:
   - Extension: `6001`
   - Password: `test123`
3. Change status to "Online"
4. In another window, make a call to extension `6001`
5. Agent portal should show incoming call notification
6. Accept the call
7. View active call in agent dashboard
8. Use agent controls to manage call
9. Hang up call

**Expected Result**:
- Agent receives call notification
- Call appears in active calls list
- Call statistics update
- Call history records the call

### Test 5: Multi-Agent Load Balancing

**Objective**: Test load distribution across Drachtio servers

1. Open two agent portals in different browsers:
   - Agent 1: Extension `6001`
   - Agent 2: Extension `6002`
2. Set both to "Online" status
3. Make multiple calls from customer portal
4. Observe calls distributed between agents
5. Check logs:
   ```bash
   docker-compose logs drachtio-1 drachtio-2
   ```

**Expected Result**:
- Calls distributed across both Drachtio servers
- Both agents receive calls
- Load balancing works correctly

### Test 6: Database Verification

**Objective**: Verify call logging and data storage

1. Access PgAdmin: http://localhost:5050
2. Login:
   - Email: `admin@voip.local`
   - Password: `admin123`
3. Add server:
   - Host: `postgres`
   - Port: `5432`
   - Database: `voip_db`
   - Username: `voip_user`
   - Password: `voip_pass_2024`
4. Browse tables:
   - `call_logs` - View call history
   - `agents` - Check agent statistics
   - `active_calls` - See current calls
   - `ivr_menus` - Review IVR configuration

**Expected Result**:
- All calls are logged
- Agent statistics are updated
- Data is properly stored

### Test 7: System Monitoring

**Objective**: Test monitoring and statistics

1. Access dSIPRouter: http://localhost/dsiprouter/
2. View dashboard showing:
   - Total calls
   - Active calls
   - Online agents
   - Calls today
3. Check recent calls table
4. Monitor agent status
5. Verify statistics update in real-time

**Expected Result**:
- Statistics display correctly
- Real-time updates work
- Call history shows all calls

### Test 8: FreeSWITCH Integration

**Objective**: Test media server functionality

1. Make a call to extension `9999`
2. Check FreeSWITCH logs:
   ```bash
   docker-compose logs freeswitch-1
   ```
3. Verify media processing:
   ```bash
   docker-compose exec freeswitch-1 fs_cli -x "show calls"
   ```
4. **Verify RTPEngine is converting media**:
   ```bash
   # Check active RTPEngine sessions
   docker-compose logs rtpengine
   
   # Should see: "Creating new session" when call starts
   # Should see: WebRTC -> RTP conversion happening
   ```

**Expected Result**:
- FreeSWITCH processes media correctly
- RTPEngine shows active sessions
- Audio playback works
- Calls appear in FreeSWITCH status

### Test 9: DTMF Testing

**Objective**: Test DTMF tone detection

1. Call extension `9999` (IVR)
2. Use DTMF pad to press each digit (0-9, *, #)
3. Verify each press triggers correct action
4. Test rapid DTMF input
5. Test invalid inputs

**Expected Result**:
- All DTMF tones detected correctly
- Invalid inputs show error message
- Menus respond to inputs

### Test 10: Call Transfer

**Objective**: Test call transfer functionality

1. Agent 1 receives a call
2. During call, agent initiates transfer to Agent 2
3. Verify transfer completes
4. Check call logs for transfer record

**Expected Result**:
- Transfer completes successfully
- Call continues to Agent 2
- Transfer is logged in database

## 🔍 Monitoring and Logs

### View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f kamailio
docker-compose logs -f drachtio-1
docker-compose logs -f freeswitch-1

# Last 100 lines
docker-compose logs --tail=100 drachtio-app-1
```

### Check Service Status

```bash
# View all services
docker-compose ps

# Check health status
docker-compose ps | grep healthy
```

### Monitor Resources

```bash
# Resource usage
docker stats

# Specific container
docker stats voip-kamailio
```

## 🛠️ Troubleshooting

### Issue: Services won't start

```bash
# Check Docker is running
docker info

# Check port availability
netstat -tuln | grep -E '80|5060|5432'

# Remove old containers
docker-compose down -v
./start.sh
```

### Issue: Call doesn't connect

```bash
# Check Kamailio logs
docker-compose logs kamailio | grep ERROR

# Verify WebSocket connection
docker-compose logs nginx | grep WebSocket

# Test SIP connectivity
docker-compose exec kamailio kamctl ul show
```

### Issue: No audio during call

```bash
# Check FreeSWITCH status
docker-compose exec freeswitch-1 fs_cli -x "sofia status"

# Verify RTP ports
netstat -uln | grep 16384

# Check media server logs
docker-compose logs freeswitch-1 | grep RTP
```

### Issue: Database connection error

```bash
# Check PostgreSQL status
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U voip_user -d voip_db -c "SELECT 1"

# Reset database
docker-compose down -v
./start.sh
```

### Issue: Redis connection error

```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# View Redis logs
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli -a redis_pass_2024 INFO
```

### Issue: WebSocket connection fails

```bash
# Check Nginx configuration
docker-compose exec nginx nginx -t

# Verify WebSocket proxy
docker-compose logs nginx | grep -i upgrade

# Test WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost/ws
```

## 📊 Performance Tuning

### For Production

1. **Increase Resources**:
   ```yaml
   # In docker-compose.yaml, add to each service:
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 4G
   ```

2. **Enable Logging**:
   ```bash
   # Add to docker-compose.yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

3. **Configure SSL**:
   - Add SSL certificates to `nginx/certs/`
   - Update `nginx/nginx.conf` for HTTPS
   - Redirect HTTP to HTTPS

4. **Database Optimization**:
   ```sql
   -- Connect to database
   docker-compose exec postgres psql -U voip_user -d voip_db
   
   -- Add indexes
   CREATE INDEX idx_call_logs_created ON call_logs(start_time DESC);
   CREATE INDEX idx_agents_status ON agents(status) WHERE status = 'online';
   ```

5. **Redis Persistence**:
   ```bash
   # Update Redis to enable AOF
   docker-compose exec redis redis-cli CONFIG SET appendonly yes
   ```

## 🔒 Security Hardening

### Production Checklist

- [ ] Change all default passwords
- [ ] Enable SSL/TLS for all services
- [ ] Configure firewall rules
- [ ] Enable authentication on all endpoints
- [ ] Regular security updates
- [ ] Implement rate limiting
- [ ] Enable audit logging
- [ ] Restrict network access
- [ ] Use secrets management
- [ ] Regular backups

### Change Default Passwords

```bash
# Update in docker-compose.yaml:
# - POSTGRES_PASSWORD
# - REDIS_PASSWORD
# - DRACHTIO_SECRET
# - LIVEKIT_API_KEY/SECRET
# - Extension passwords in database
```

## 💾 Backup and Restore

### Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U voip_user voip_db > backup_$(date +%Y%m%d).sql

# Backup Redis
docker-compose exec redis redis-cli --rdb /data/dump.rdb

# Backup volumes
docker run --rm -v voip-application_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

### Restore

```bash
# Restore database
cat backup_20240101.sql | docker-compose exec -T postgres psql -U voip_user voip_db

# Restore Redis
docker-compose exec redis redis-cli --rdb /data/restore.rdb
```

## 📈 Scaling

### Horizontal Scaling

Add more Drachtio servers:

```yaml
# Add to docker-compose.yaml
drachtio-3:
  image: drachtio/drachtio-server:latest
  # ... similar config to drachtio-1
```

Update Kamailio dispatcher:
```bash
# Add to kamailio/dispatcher.list
1 sip:172.20.0.32:5082 0 0
```

### Load Testing

```bash
# Install SIPp
apt-get install sipp

# Run load test
sipp -sn uac -d 10000 -s 6000 localhost:5060 -m 100 -r 10
```

## 🛑 Stopping the Application

```bash
# Stop all services (preserve data)
./stop.sh

# Stop and remove volumes (delete all data)
./stop.sh
# Then answer 'y' when prompted
```

## 📚 Additional Resources

- **Architecture**: See `architecture.md` for detailed system design
- **Kamailio Docs**: https://www.kamailio.org/docs/
- **Drachtio Docs**: https://drachtio.org/docs
- **FreeSWITCH Docs**: https://freeswitch.org/confluence/
- **LiveKit Docs**: https://docs.livekit.io/
- **SIP.js Docs**: https://sipjs.com/guides/

## 🐛 Known Issues

1. **ARM64 Support**: Some services may build slowly on ARM64
2. **WebSocket Timeout**: Adjust Nginx keepalive for long calls
3. **Port Conflicts**: Ensure ports are available before starting

## 🆕 What's New

See **UPGRADE_NOTES.md** for latest changes:
- ✅ Using official pre-built Docker images (RTPEngine & FreeSWITCH)
- ✅ No more build errors - faster deployment
- ✅ Increased RTP port capacity: 200 ports per FreeSWITCH (was 11)
- ✅ All Dockerfiles use netcat-openbsd for reliability

## 🐛 RTPEngine Troubleshooting

If you encounter RTPEngine build errors (404, GPG key issues):

**✅ SOLUTION**: The configuration now uses the **official Docker image** - no build required!

```bash
# Just pull and start
docker-compose pull rtpengine
docker-compose up -d rtpengine

# Verify it's working
docker-compose logs rtpengine
docker-compose exec kamailio nc -zvu rtpengine 22222
```

**Common Errors?** See **QUICK_FIXES.md** for:
- "version is obsolete" warning (fixed!)
- "Invalid interface specification" error (fixed!)
- Platform mismatch issues
- Port conflicts
- And more...

For complete RTPEngine troubleshooting, see **RTPENGINE_TROUBLESHOOTING.md**

## 📚 Documentation

- **README.md** - This file, complete setup and testing guide
- **QUICK_FIXES.md** - **START HERE!** Solutions for common errors
- **UPGRADE_NOTES.md** - Latest changes: pre-built images, port updates
- **SERVICE_CHECKLIST.md** - Complete inventory of all 15 services and configuration reference
- **FREESWITCH_DIALPLAN_EXPLAINED.md** - Why no XML dialplan needed (Drachtio controls FreeSWITCH)
- **architecture.md** - Complete system architecture with diagrams
- **MEDIA_FLOW_ARCHITECTURE.md** - Detailed WebRTC ↔ RTP media flow
- **DNS_ARCHITECTURE.md** - DNS-based service discovery guide  
- **RTPENGINE_TROUBLESHOOTING.md** - RTPEngine installation & debugging
- **PROJECT_STRUCTURE.md** - File organization reference

## 🤝 Support

For issues and questions:
1. Check logs: `docker-compose logs [service]`
2. Review `architecture.md` for system design
3. Check troubleshooting section above
4. Verify all prerequisites are met

## 📝 License

This VoIP application is provided as-is for educational and development purposes.

## 🎉 Credits

Built with:
- Kamailio SIP Server
- RTPEngine Media Proxy (WebRTC ↔ RTP conversion)
- Drachtio SIP Application Server
- FreeSWITCH Media Server
- LiveKit WebRTC Platform
- PostgreSQL Database
- Redis Cache
- Nginx Web Server
- Docker & Docker Compose

---

**Note**: This is a complete development/testing environment. For production use, implement proper security measures, SSL/TLS, and follow best practices for your specific deployment scenario.
