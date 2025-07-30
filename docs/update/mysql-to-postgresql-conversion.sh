#!/bin/bash

# MySQL to PostgreSQL conversion script
# This script converts MySQL-specific syntax to PostgreSQL

echo "Starting MySQL to PostgreSQL conversion..."

# List of files to convert
FILES=(
    "docs/05_design/work-history-comprehensive-design.md"
    "docs/05_design/sales/basic-design.md"
    "docs/05_design/accounting/basic-design.md"
    "docs/03_database/ddl-specification-postgresql.md"
    "docs/05_design/proposal/detailed-design.md"
    "docs/05_design/leave_management/basic-design.md"
    "docs/05_design/expense_application/detailed-design.md"
    "docs/05_design/expense_application/basic-design.md"
    "docs/05_design/engineer_management/detailed-design.md"
    "docs/05_design/engineer_management/basic-design.md"
    "docs/05_design/accounting/detailed-design.md"
    "docs/01_backend/testing/testing-guide.md"
    "docs/01_backend/specification.md"
    "docs/01_backend/implementation/common-packages.md"
)

# Conversion patterns
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Converting $file..."
        
        # Create backup
        cp "$file" "$file.bak"
        
        # Convert CHAR(36) to UUID
        sed -i '' 's/CHAR(36)/UUID/g' "$file"
        sed -i '' 's/VARCHAR(36)/UUID/g' "$file"
        
        # Convert DEFAULT (UUID()) to DEFAULT gen_random_uuid()
        sed -i '' 's/DEFAULT (UUID())/DEFAULT gen_random_uuid()/g' "$file"
        
        # Remove MySQL-specific character set and collation
        sed -i '' 's/ CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci//g' "$file"
        sed -i '' 's/ CHARACTER SET utf8mb4//g' "$file"
        sed -i '' 's/ COLLATE utf8mb4_0900_ai_ci//g' "$file"
        
        # Convert DATETIME(3) to TIMESTAMP
        sed -i '' 's/DATETIME(3)/TIMESTAMP/g' "$file"
        
        # Convert ON UPDATE CURRENT_TIMESTAMP to PostgreSQL trigger comment
        sed -i '' 's/ON UPDATE CURRENT_TIMESTAMP(3)/-- Requires UPDATE trigger in PostgreSQL/g' "$file"
        sed -i '' 's/ON UPDATE CURRENT_TIMESTAMP/-- Requires UPDATE trigger in PostgreSQL/g' "$file"
        
        echo "Converted $file"
    else
        echo "Warning: $file not found"
    fi
done

echo "Conversion complete!"
echo "Backup files created with .bak extension"