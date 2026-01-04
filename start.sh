#!/bin/bash

echo "=========================================="
echo "  Starting VoIP Application Stack"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose not found. Please install docker-compose."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p postgres redis kamailio/logs freeswitch/conf

# Pull images first to show progress
echo "📥 Pulling Docker images (this may take a while)..."
docker-compose pull

# Build custom images
echo "🔨 Building custom images..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to become healthy..."
echo ""

# Wait for critical services
services=("postgres" "redis" "rtpengine" "kamailio" "drachtio-1" "drachtio-2" "freeswitch-1" "freeswitch-2" "livekit" "admin-dashboard" "dsiprouter" "nginx")
for service in "${services[@]}"; do
    echo -n "Checking $service... "
    
    max_attempts=60
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose ps $service | grep -q "healthy\|Up"; then
            echo "✅ Ready"
            break
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -eq $max_attempts ]; then
            echo "⚠️  Timeout (continuing anyway)"
            break
        fi
        
        sleep 2
    done
done

echo ""
echo "=========================================="
echo "  🎉 VoIP Application Started Successfully!"
echo "=========================================="
echo ""
echo "📱 Access Points:"
echo "  • Customer Portal:  http://localhost/"
echo "  • Agent Portal:     http://localhost/agent.html"
echo "  • dSIPRouter:       http://localhost/dsiprouter/"
echo "  • Admin Dashboard:  http://localhost/api/admin/"
echo "  • PgAdmin:          http://localhost:5050"
echo "    - Email: admin@voip.local"
echo "    - Password: admin123"
echo ""
echo "🔧 Service Ports:"
echo "  • Kamailio SIP:     5060 (UDP/TCP)"
echo "  • Kamailio WS:      8080 (TCP)"
echo "  • RTPEngine Ctrl:   22222 (UDP)"
echo "  • RTPEngine Media:  30000-30100 (UDP)"
echo "  • Drachtio-1:       5080 (SIP), 9022 (Control)"
echo "  • Drachtio-2:       5081 (SIP), 9023 (Control)"
echo "  • FreeSWITCH-1:     5062 (SIP), 8021 (ESL), 16384-16583 (RTP)"
echo "  • FreeSWITCH-2:     5063 (SIP), 8022 (ESL), 16584-16783 (RTP)"
echo "  • LiveKit:          7880 (HTTP), 7881 (gRPC), 50000-50100 (RTC)"
echo "  • PostgreSQL:       5432"
echo "  • Redis:            6379"
echo "  • dSIPRouter:       5000"
echo "  • Admin Dashboard:  3000"
echo ""
echo "📊 View Logs:"
echo "  docker-compose logs -f [service_name]"
echo ""
echo "🛑 Stop Services:"
echo "  ./stop.sh"
echo ""
echo "✨ Test Credentials:"
echo "  • Extension: 6000"
echo "  • Password:  test123"
echo ""
echo "For detailed testing instructions, see README.md"
echo "=========================================="
