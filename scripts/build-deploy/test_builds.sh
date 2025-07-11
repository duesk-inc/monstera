#!/bin/bash

echo "=== Monstera Build Test Script ==="
echo "Starting at: $(date)"
echo ""

# フロントエンドのビルドテスト
echo "=== Frontend Build Test ==="
cd /Users/daichirouesaka/Documents/90_duesk/monstera/frontend
echo "Running npm run build..."
npm run build
FRONTEND_RESULT=$?

if [ $FRONTEND_RESULT -eq 0 ]; then
    echo "✅ Frontend build succeeded!"
else
    echo "❌ Frontend build failed with exit code: $FRONTEND_RESULT"
fi

echo ""
echo "=== Backend Build Test ==="
cd /Users/daichirouesaka/Documents/90_duesk/monstera/backend
echo "Running go build..."
go build -o bin/server ./cmd/server
BACKEND_RESULT=$?

if [ $BACKEND_RESULT -eq 0 ]; then
    echo "✅ Backend build succeeded!"
else
    echo "❌ Backend build failed with exit code: $BACKEND_RESULT"
fi

echo ""
echo "=== Build Test Summary ==="
echo "Frontend: $([ $FRONTEND_RESULT -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "Backend: $([ $BACKEND_RESULT -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "Completed at: $(date)"

# Exit with appropriate code
if [ $FRONTEND_RESULT -ne 0 ] || [ $BACKEND_RESULT -ne 0 ]; then
    exit 1
else
    exit 0
fi