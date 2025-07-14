#!/bin/bash

# Test script for expense PDF export endpoints

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:8080/api/v1"
AUTH_TOKEN=""

echo -e "${YELLOW}=== Expense PDF Export Endpoints Test ===${NC}"
echo ""

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# Function to login and get token
login() {
    echo -e "${YELLOW}1. Logging in to get auth token...${NC}"
    
    RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@example.com",
            "password": "testpassword"
        }')
    
    AUTH_TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "$AUTH_TOKEN" ]; then
        print_result 0 "Login successful"
        echo "   Token: ${AUTH_TOKEN:0:20}..."
    else
        print_result 1 "Login failed"
        echo "   Response: $RESPONSE"
        exit 1
    fi
}

# Function to test single expense PDF
test_single_expense_pdf() {
    echo -e "\n${YELLOW}2. Testing single expense PDF export...${NC}"
    
    # First, let's get an expense ID (assuming we have expenses)
    EXPENSES=$(curl -s -X GET "${API_BASE}/expenses" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    EXPENSE_ID=$(echo $EXPENSES | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ -z "$EXPENSE_ID" ]; then
        echo -e "${YELLOW}   No expenses found. Creating a test expense...${NC}"
        
        # Create test expense
        CREATE_RESPONSE=$(curl -s -X POST "${API_BASE}/expenses" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "title": "Test Expense for PDF",
                "category": "transport",
                "category_id": "00000000-0000-0000-0000-000000000001",
                "amount": 5000,
                "expense_date": "2025-07-14T00:00:00Z",
                "description": "This is a test expense for PDF generation testing",
                "receipt_url": "https://example.com/receipt.jpg"
            }')
        
        EXPENSE_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
        
        if [ -n "$EXPENSE_ID" ]; then
            echo "   Created test expense: $EXPENSE_ID"
        else
            echo -e "${RED}   Failed to create test expense${NC}"
            echo "   Response: $CREATE_RESPONSE"
        fi
    fi
    
    if [ -n "$EXPENSE_ID" ]; then
        echo "   Using expense ID: $EXPENSE_ID"
        
        # Test PDF download
        HTTP_CODE=$(curl -s -o /tmp/expense_single.pdf -w "%{http_code}" \
            -X GET "${API_BASE}/expenses/${EXPENSE_ID}/pdf" \
            -H "Authorization: Bearer $AUTH_TOKEN")
        
        if [ "$HTTP_CODE" = "200" ]; then
            FILE_SIZE=$(stat -f%z /tmp/expense_single.pdf 2>/dev/null || stat -c%s /tmp/expense_single.pdf 2>/dev/null)
            if [ $FILE_SIZE -gt 0 ]; then
                print_result 0 "Single expense PDF generated successfully"
                echo "   File size: $FILE_SIZE bytes"
                echo "   Saved to: /tmp/expense_single.pdf"
            else
                print_result 1 "PDF file is empty"
            fi
        else
            print_result 1 "Failed to generate PDF (HTTP $HTTP_CODE)"
        fi
    else
        echo -e "${YELLOW}   Skipping single expense PDF test (no expense ID)${NC}"
    fi
}

# Function to test expense list PDF
test_expense_list_pdf() {
    echo -e "\n${YELLOW}3. Testing expense list PDF export...${NC}"
    
    # Test without filters
    echo "   Testing without filters..."
    HTTP_CODE=$(curl -s -o /tmp/expense_list.pdf -w "%{http_code}" \
        -X GET "${API_BASE}/expenses/pdf" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if [ "$HTTP_CODE" = "200" ]; then
        FILE_SIZE=$(stat -f%z /tmp/expense_list.pdf 2>/dev/null || stat -c%s /tmp/expense_list.pdf 2>/dev/null)
        if [ $FILE_SIZE -gt 0 ]; then
            print_result 0 "Expense list PDF generated successfully"
            echo "   File size: $FILE_SIZE bytes"
            echo "   Saved to: /tmp/expense_list.pdf"
        else
            print_result 1 "PDF file is empty"
        fi
    else
        print_result 1 "Failed to generate PDF (HTTP $HTTP_CODE)"
    fi
    
    # Test with filters
    echo -e "\n   Testing with filters (status=submitted)..."
    HTTP_CODE=$(curl -s -o /tmp/expense_list_filtered.pdf -w "%{http_code}" \
        -X GET "${API_BASE}/expenses/pdf?status=submitted&limit=10" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if [ "$HTTP_CODE" = "200" ]; then
        FILE_SIZE=$(stat -f%z /tmp/expense_list_filtered.pdf 2>/dev/null || stat -c%s /tmp/expense_list_filtered.pdf 2>/dev/null)
        if [ $FILE_SIZE -gt 0 ]; then
            print_result 0 "Filtered expense list PDF generated successfully"
            echo "   File size: $FILE_SIZE bytes"
            echo "   Saved to: /tmp/expense_list_filtered.pdf"
        else
            print_result 1 "PDF file is empty"
        fi
    else
        print_result 1 "Failed to generate filtered PDF (HTTP $HTTP_CODE)"
    fi
}

# Function to test error cases
test_error_cases() {
    echo -e "\n${YELLOW}4. Testing error cases...${NC}"
    
    # Test invalid expense ID
    echo "   Testing invalid expense ID..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "${API_BASE}/expenses/invalid-id/pdf" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if [ "$HTTP_CODE" = "400" ]; then
        print_result 0 "Invalid expense ID returns 400 as expected"
    else
        print_result 1 "Invalid expense ID returned $HTTP_CODE (expected 400)"
    fi
    
    # Test non-existent expense
    echo "   Testing non-existent expense..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "${API_BASE}/expenses/00000000-0000-0000-0000-000000000000/pdf" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "500" ]; then
        print_result 0 "Non-existent expense returns error as expected"
    else
        print_result 1 "Non-existent expense returned $HTTP_CODE (expected 404 or 500)"
    fi
    
    # Test without authentication
    echo "   Testing without authentication..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "${API_BASE}/expenses/pdf")
    
    if [ "$HTTP_CODE" = "401" ]; then
        print_result 0 "Unauthenticated request returns 401 as expected"
    else
        print_result 1 "Unauthenticated request returned $HTTP_CODE (expected 401)"
    fi
}

# Main test execution
echo "Starting tests..."
echo ""

# Login first
login

# Run tests
test_single_expense_pdf
test_expense_list_pdf
test_error_cases

echo -e "\n${YELLOW}=== Test Summary ===${NC}"
echo "Generated PDF files:"
ls -la /tmp/expense*.pdf 2>/dev/null || echo "No PDF files generated"

echo -e "\n${GREEN}Test completed!${NC}"