#!/bin/bash

# Test authentication and expense API

echo "=== Testing Monstera Authentication and Expense API ==="

# 1. Login and get JWT token
echo -e "\n1. Logging in as engineer_test@duesk.co.jp..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "engineer_test@duesk.co.jp",
    "password": "EmployeePass123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token' 2>/dev/null)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "Failed to get token. Response:"
  echo $LOGIN_RESPONSE | jq .
  exit 1
fi

echo "Successfully obtained JWT token"

# 2. Test expense list endpoint
echo -e "\n2. Testing expense list endpoint..."
EXPENSE_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/v1/expenses?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN")

echo "Expense list response:"
echo $EXPENSE_RESPONSE | jq .

# 3. Test expense creation (this should now work with approvers configured)
echo -e "\n3. Testing expense creation..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expense_date": "2025-07-30T00:00:00+09:00",
    "expense_type": "transportation",
    "amount": 1500,
    "description": "電車代（東京→横浜）",
    "title": "交通費精算",
    "category": "transport",
    "category_id": "bc633589-7ad6-42ca-8502-a4ac359f08bb",
    "project_id": null,
    "receipt_required": false
  }')

echo "Expense creation response:"
echo $CREATE_RESPONSE | jq .

echo -e "\n=== Test completed ==="