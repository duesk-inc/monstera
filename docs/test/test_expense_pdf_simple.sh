#!/bin/bash

# Simple test script for expense PDF export endpoints

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:8080/api/v1"

echo -e "${YELLOW}=== Simple Expense PDF Export Test ===${NC}"
echo ""

# Test health check first
echo -e "${YELLOW}1. Testing API health...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/health")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ API is healthy${NC}"
else
    echo -e "${RED}✗ API health check failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

# Test PDF endpoints without auth (to see if routes exist)
echo -e "\n${YELLOW}2. Testing PDF endpoints existence...${NC}"

# Test single expense PDF endpoint
echo "   Testing single expense PDF endpoint..."
RESPONSE=$(curl -s -X GET "${API_BASE}/expenses/00000000-0000-0000-0000-000000000001/pdf")
if echo "$RESPONSE" | grep -q "unauthorized\|Unauthorized\|auth"; then
    echo -e "${GREEN}✓ Single expense PDF endpoint exists (requires auth)${NC}"
else
    echo -e "${YELLOW}? Single expense PDF endpoint response: $RESPONSE${NC}"
fi

# Test expense list PDF endpoint  
echo -e "\n   Testing expense list PDF endpoint..."
RESPONSE=$(curl -s -X GET "${API_BASE}/expenses/pdf")
if echo "$RESPONSE" | grep -q "unauthorized\|Unauthorized\|auth"; then
    echo -e "${GREEN}✓ Expense list PDF endpoint exists (requires auth)${NC}"
else
    echo -e "${YELLOW}? Expense list PDF endpoint response: $RESPONSE${NC}"
fi

# Create a test with mock auth token
echo -e "\n${YELLOW}3. Testing with mock authorization...${NC}"

# Test single expense PDF with fake auth
echo "   Testing single expense PDF with auth header..."
HTTP_CODE=$(curl -s -o /tmp/test_expense_single.pdf -w "%{http_code}" \
    -X GET "${API_BASE}/expenses/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/pdf" \
    -H "Authorization: Bearer test-token-12345")

echo "   Response code: $HTTP_CODE"
if [ -f /tmp/test_expense_single.pdf ]; then
    FILE_SIZE=$(stat -f%z /tmp/test_expense_single.pdf 2>/dev/null || stat -c%s /tmp/test_expense_single.pdf 2>/dev/null || echo "0")
    echo "   File size: $FILE_SIZE bytes"
    
    # Check if it's actually a PDF
    if head -c 4 /tmp/test_expense_single.pdf | grep -q "%PDF"; then
        echo -e "${GREEN}✓ Generated file is a valid PDF${NC}"
    else
        echo -e "${YELLOW}? Generated file may not be a PDF${NC}"
        echo "   First 100 bytes:"
        head -c 100 /tmp/test_expense_single.pdf | od -c
    fi
fi

# Test expense list PDF with fake auth
echo -e "\n   Testing expense list PDF with auth header..."
HTTP_CODE=$(curl -s -o /tmp/test_expense_list.pdf -w "%{http_code}" \
    -X GET "${API_BASE}/expenses/pdf?limit=5" \
    -H "Authorization: Bearer test-token-12345")

echo "   Response code: $HTTP_CODE"
if [ -f /tmp/test_expense_list.pdf ]; then
    FILE_SIZE=$(stat -f%z /tmp/test_expense_list.pdf 2>/dev/null || stat -c%s /tmp/test_expense_list.pdf 2>/dev/null || echo "0")
    echo "   File size: $FILE_SIZE bytes"
fi

# Check direct access (bypassing auth for testing)
echo -e "\n${YELLOW}4. Checking backend logs for route registration...${NC}"
docker-compose logs backend | grep -E "expenses.*pdf|PDF" | tail -5

echo -e "\n${YELLOW}=== Test Summary ===${NC}"
echo "Generated test files:"
ls -la /tmp/test_expense*.pdf 2>/dev/null || echo "No PDF files generated"

echo -e "\n${GREEN}Test completed!${NC}"