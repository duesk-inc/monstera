#!/bin/bash

# Simple API test to check status field
echo "Testing Monstera API - Status Field Verification"
echo "================================================"
echo ""

# Step 1: Login
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daichiro.uesaka@duesk.co.jp","password":"password"}' \
  -c /tmp/monstera_cookies.txt)

echo "Login Response:"
echo "$LOGIN_RESPONSE" | python3 -m json.tool
echo ""

# Step 2: Get Weekly Reports
echo "2. Getting weekly reports..."
REPORTS_RESPONSE=$(curl -s -X GET http://localhost:8080/api/v1/weekly-reports \
  -b /tmp/monstera_cookies.txt \
  -H "Accept: application/json")

echo "Weekly Reports Response:"
echo "$REPORTS_RESPONSE" | python3 -m json.tool
echo ""

# Check status field
echo "3. Checking status field type..."
if echo "$REPORTS_RESPONSE" | grep -E '"status":\s*[0-9]' > /dev/null; then
    echo "❌ ERROR: Status field contains numeric values!"
    echo "$REPORTS_RESPONSE" | grep -E '"status":\s*[0-9]' 
else
    echo "✅ OK: Status field appears to be string type"
    echo "$REPORTS_RESPONSE" | grep -E '"status":\s*"[^"]*"' | head -5
fi

# Cleanup
rm -f /tmp/monstera_cookies.txt