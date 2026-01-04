#!/bin/bash

echo "=========================================="
echo "  Stopping VoIP Application Stack"
echo "=========================================="
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose not found."
    exit 1
fi

# Stop services
echo "🛑 Stopping all services..."
docker-compose down

echo ""
echo "✅ All services stopped successfully"
echo ""

# Ask about cleanup
read -p "Do you want to remove volumes (all data will be lost)? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing volumes..."
    docker-compose down -v
    echo "✅ Volumes removed"
else
    echo "📦 Volumes preserved"
fi

echo ""
echo "=========================================="
echo "  VoIP Application Stopped"
echo "=========================================="
echo ""
echo "To start again, run: ./start.sh"
echo ""
