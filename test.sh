#!/bin/bash

echo "=========================================="
echo "  VoIP Application Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_service() {
    local service=$1
    local test_command=$2
    local test_name=$3
    
    echo -n "Testing $test_name... "
    
    if eval $test_command > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "1. Testing Service Health Checks"
echo "-----------------------------------"

test_service "postgres" "docker-compose exec -T postgres pg_isready -U voip_user" "PostgreSQL"
test_service "redis" "docker-compose exec -T redis redis-cli -a redis_pass_2024 ping" "Redis"
test_service "rtpengine" "docker-compose exec -T kamailio nc -zvu rtpengine 22222" "RTPEngine"
test_service "nginx" "curl -s http://localhost/ > /dev/null" "Nginx"
test_service "kamailio" "docker-compose exec -T kamailio kamctl ping > /dev/null" "Kamailio"

echo ""
echo "2. Testing Database"
echo "-----------------------------------"

test_service "db_connection" "docker-compose exec -T postgres psql -U voip_user -d voip_db -c 'SELECT 1'" "Database connection"
test_service "db_tables" "docker-compose exec -T postgres psql -U voip_user -d voip_db -c '\\dt' | grep -q extensions" "Database tables"
test_service "db_data" "docker-compose exec -T postgres psql -U voip_user -d voip_db -c 'SELECT COUNT(*) FROM extensions' | grep -q '[0-9]'" "Database data"

echo ""
echo "3. Testing Web Interfaces"
echo "-----------------------------------"

test_service "customer_portal" "curl -s http://localhost/ | grep -q 'VoIP Customer Portal'" "Customer Portal"
test_service "agent_portal" "curl -s http://localhost/agent.html | grep -q 'Agent Portal'" "Agent Portal"
test_service "dsiprouter" "curl -s http://localhost/dsiprouter/ | grep -q 'dSIPRouter'" "dSIPRouter"

echo ""
echo "4. Testing API Endpoints"
echo "-----------------------------------"

test_service "admin_health" "curl -s http://localhost/api/admin/health | grep -q 'healthy'" "Admin Health API"
test_service "admin_stats" "curl -s http://localhost/api/admin/dashboard/stats | grep -q 'total_calls'" "Admin Stats API"
test_service "dsiprouter_api" "curl -s http://localhost/dsiprouter/api/stats | grep -q 'total_calls'" "dSIPRouter API"

echo ""
echo "5. Testing LiveKit"
echo "-----------------------------------"

test_service "livekit" "curl -s http://localhost:7880/ > /dev/null" "LiveKit HTTP"
test_service "livekit_health" "nc -zv localhost 7880 2>&1" "LiveKit Port"

echo ""
echo "6. Testing SIP Services"
echo "-----------------------------------"

test_service "kamailio_sip" "nc -zv -u localhost 5060 2>&1" "Kamailio SIP Port"
test_service "kamailio_ws" "nc -zv localhost 8080 2>&1" "Kamailio WebSocket"
test_service "rtpengine_ctrl" "nc -zvu localhost 22222 2>&1" "RTPEngine Control"
test_service "drachtio_1" "nc -zv localhost 5080 2>&1" "Drachtio-1 SIP"
test_service "drachtio_2" "nc -zv localhost 5081 2>&1" "Drachtio-2 SIP"

echo ""
echo "7. Testing FreeSWITCH"
echo "-----------------------------------"

test_service "freeswitch_1" "nc -zv localhost 8021 2>&1" "FreeSWITCH-1 ESL"
test_service "freeswitch_2" "nc -zv localhost 8022 2>&1" "FreeSWITCH-2 ESL"

echo ""
echo "8. Database Content Verification"
echo "-----------------------------------"

# Check extensions
EXTENSIONS=$(docker-compose exec -T postgres psql -U voip_user -d voip_db -t -c "SELECT COUNT(*) FROM extensions")
if [ "$EXTENSIONS" -gt 0 ]; then
    echo -e "Extensions in database: ${GREEN}$EXTENSIONS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "Extensions in database: ${RED}0 (ERROR)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Check IVR menus
IVR_MENUS=$(docker-compose exec -T postgres psql -U voip_user -d voip_db -t -c "SELECT COUNT(*) FROM ivr_menus")
if [ "$IVR_MENUS" -gt 0 ]; then
    echo -e "IVR menus configured: ${GREEN}$IVR_MENUS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "IVR menus configured: ${RED}0 (ERROR)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Check agents
AGENTS=$(docker-compose exec -T postgres psql -U voip_user -d voip_db -t -c "SELECT COUNT(*) FROM agents")
if [ "$AGENTS" -gt 0 ]; then
    echo -e "Agents configured: ${GREEN}$AGENTS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "Agents configured: ${RED}0 (ERROR)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "9. Service Container Status"
echo "-----------------------------------"

docker-compose ps

echo ""
echo "=========================================="
echo "  Test Results Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "🎉 System is ready for testing!"
    echo ""
    echo "Quick Start:"
    echo "  1. Open http://localhost/ for Customer Portal"
    echo "  2. Open http://localhost/agent.html for Agent Portal"
    echo "  3. Login with extension 6000, password test123"
    echo "  4. Make test calls to 6000, 9999, or 555-1234"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Check the output above.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check service logs: docker-compose logs [service]"
    echo "  2. Verify all services are running: docker-compose ps"
    echo "  3. Restart failed services: docker-compose restart [service]"
    echo ""
    exit 1
fi
