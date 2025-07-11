#!/bin/bash

# API test script for Monstera backend
BASE_URL="http://localhost:8080/api/v1"
EMAIL="daichiro.uesaka@duesk.co.jp"
PASSWORD="password"
COOKIE_FILE="/tmp/monstera_cookies.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Monstera API Test ===${NC}"
echo ""

# Step 1: Login
echo -e "${GREEN}1. Testing Login API${NC}"
echo "POST ${BASE_URL}/auth/login"
echo "Credentials: ${EMAIL}"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  -c "${COOKIE_FILE}" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*//')

echo "HTTP Status: ${HTTP_STATUS}"
echo "Response:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

# Check if login was successful
if [ "$HTTP_STATUS" != "200" ]; then
    echo -e "${RED}Login failed! Exiting...${NC}"
    exit 1
fi

# Step 2: Get Weekly Reports
echo -e "${GREEN}2. Testing Weekly Reports List API${NC}"
echo "GET ${BASE_URL}/weekly-reports"
echo ""

REPORTS_RESPONSE=$(curl -s -X GET "${BASE_URL}/weekly-reports" \
  -b "${COOKIE_FILE}" \
  -H "Accept: application/json" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$REPORTS_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$REPORTS_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*//')

echo "HTTP Status: ${HTTP_STATUS}"
echo "Response:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"

# Check status field type
echo ""
echo -e "${BLUE}Checking status field type:${NC}"
if echo "$RESPONSE_BODY" | grep -q '"status":.*[0-9]'; then
    echo -e "${RED}WARNING: Status field appears to be numeric!${NC}"
else
    echo -e "${GREEN}Status field appears to be string (good!)${NC}"
fi
echo ""

# Step 3: Get Profile
echo -e "${GREEN}3. Testing Profile API${NC}"
echo "GET ${BASE_URL}/profile"
echo ""

PROFILE_RESPONSE=$(curl -s -X GET "${BASE_URL}/profile" \
  -b "${COOKIE_FILE}" \
  -H "Accept: application/json" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$PROFILE_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$PROFILE_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*//')

echo "HTTP Status: ${HTTP_STATUS}"
echo "Response:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

# Step 4: Test Admin Dashboard (if user has admin role)
echo -e "${GREEN}4. Testing Admin Dashboard API${NC}"
echo "GET ${BASE_URL}/admin/dashboard"
echo ""

ADMIN_RESPONSE=$(curl -s -X GET "${BASE_URL}/admin/dashboard" \
  -b "${COOKIE_FILE}" \
  -H "Accept: application/json" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$ADMIN_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$ADMIN_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*//')

echo "HTTP Status: ${HTTP_STATUS}"
echo "Response:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

# Step 5: Get a specific weekly report if any exist
echo -e "${GREEN}5. Checking specific weekly report details${NC}"

# Extract first report ID from the reports list
FIRST_REPORT_ID=$(echo "$REPORTS_RESPONSE" | python3 -c "
import json
import sys
try:
    data = json.loads(sys.stdin.read().split('HTTP_STATUS:')[0])
    if 'items' in data and len(data['items']) > 0:
        print(data['items'][0]['id'])
except:
    pass
" 2>/dev/null)

if [ -n "$FIRST_REPORT_ID" ]; then
    echo "GET ${BASE_URL}/weekly-reports/${FIRST_REPORT_ID}"
    echo ""
    
    REPORT_DETAIL_RESPONSE=$(curl -s -X GET "${BASE_URL}/weekly-reports/${FIRST_REPORT_ID}" \
      -b "${COOKIE_FILE}" \
      -H "Accept: application/json" \
      -w "\nHTTP_STATUS:%{http_code}")
    
    HTTP_STATUS=$(echo "$REPORT_DETAIL_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$REPORT_DETAIL_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*//')
    
    echo "HTTP Status: ${HTTP_STATUS}"
    echo "Response:"
    echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
    
    # Check status field in detail response
    echo ""
    echo -e "${BLUE}Checking status field in detail response:${NC}"
    if echo "$RESPONSE_BODY" | grep -q '"status":.*[0-9]'; then
        echo -e "${RED}WARNING: Status field appears to be numeric!${NC}"
    else
        echo -e "${GREEN}Status field appears to be string (good!)${NC}"
    fi
else
    echo "No weekly reports found to check details"
fi

echo ""
echo -e "${BLUE}=== Test Complete ===${NC}"

# Cleanup
rm -f "${COOKIE_FILE}"