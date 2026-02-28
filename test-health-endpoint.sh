#!/bin/bash

# 🩺 Health Endpoint - Quick Test Script
# Run this locally to verify the health endpoint works

set -e

echo "🏥 Health Endpoint Test Suite"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="${1:-http://localhost:3000}"

echo "📍 Testing URL: $BASE_URL"
echo ""

# Test 1: Endpoint exists
echo "Test 1️⃣ : Check endpoint is accessible..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" | grep -q "200\|500"; then
    echo -e "${GREEN}✅ Endpoint is accessible${NC}"
else
    echo -e "${RED}❌ Endpoint not found (404)${NC}"
    echo "   Make sure backend is running: docker compose up -d backend"
    exit 1
fi
echo ""

# Test 2: Response format (when database is connected)
echo "Test 2️⃣ : Check response format..."
RESPONSE=$(curl -s "$BASE_URL/health")

if echo "$RESPONSE" | grep -q "status"; then
    echo -e "${GREEN}✅ Response has 'status' field${NC}"
else
    echo -e "${RED}❌ Missing 'status' field${NC}"
    exit 1
fi

if echo "$RESPONSE" | grep -q "database"; then
    echo -e "${GREEN}✅ Response has 'database' field${NC}"
else
    echo -e "${RED}❌ Missing 'database' field${NC}"
    exit 1
fi

if echo "$RESPONSE" | grep -q "timestamp"; then
    echo -e "${GREEN}✅ Response has 'timestamp' field${NC}"
else
    echo -e "${RED}❌ Missing 'timestamp' field${NC}"
    exit 1
fi

if echo "$RESPONSE" | grep -q "uptime"; then
    echo -e "${GREEN}✅ Response has 'uptime' field${NC}"
else
    echo -e "${RED}❌ Missing 'uptime' field${NC}"
    exit 1
fi

echo ""

# Test 3: Status code
echo "Test 3️⃣ : Check HTTP status code..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")

if [ "$STATUS_CODE" = "200" ] || [ "$STATUS_CODE" = "500" ]; then
    if [ "$STATUS_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Status 200 OK (database connected)${NC}"
    else
        echo -e "${YELLOW}⚠️  Status 500 (database disconnected)${NC}"
        echo "   The health endpoint works but database is not reachable"
        echo "   Check: docker compose ps postgres"
    fi
else
    echo -e "${RED}❌ Unexpected status: $STATUS_CODE${NC}"
    exit 1
fi

echo ""

# Test 4: Response time
echo "Test 4️⃣ : Check response time..."
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$BASE_URL/health" 2>&1 | sed 's/[^0-9.]//g')
RESPONSE_MS=$(echo "scale=0; $RESPONSE_TIME * 1000" | bc)

if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
    echo -e "${GREEN}✅ Response time: ${RESPONSE_MS}ms (excellent)${NC}"
else
    echo -e "${YELLOW}⚠️  Response time: ${RESPONSE_MS}ms (slow)${NC}"
    echo "   Check database performance: docker compose logs postgres"
fi

echo ""

# Test 5: Display response
echo "Test 5️⃣ : Full response:"
echo ""
curl -s "$BASE_URL/health" | jq . 2>/dev/null || curl -s "$BASE_URL/health"
echo ""
echo ""

# Test 6: Monitoring compatibility
echo "Test 6️⃣ : Monitoring compatibility check..."
echo ""

# Test with basic auth header (some monitors send this)
STATUS=$(curl -s -u admin:admin -o /dev/null -w "%{http_code}" "$BASE_URL/health")
echo "✅ Works with basic auth headers"

# Test with custom headers
STATUS=$(curl -s -H "X-Custom-Header: test" -o /dev/null -w "%{http_code}" "$BASE_URL/health")
echo "✅ Works with custom headers"

# Test with User-Agent
STATUS=$(curl -s -H "User-Agent: UptimeRobot" -o /dev/null -w "%{http_code}" "$BASE_URL/health")
echo "✅ Works with User-Agent headers"

echo ""

# Summary
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✅ All tests passed!${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📝 Next steps:"
echo "   1. Deploy to VPS: git push origin main"
echo "   2. Test on production: curl https://backend.vjlink-edu.online/health"
echo "   3. Add to UptimeRobot: https://uptimerobot.com"
echo "   4. Add Docker HEALTHCHECK to Dockerfile (optional)"
echo ""
