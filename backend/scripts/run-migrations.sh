#!/bin/bash
# PostgreSQL migration runner script

set -e

echo "Running PostgreSQL migrations..."

# Install migrate tool if not exists
if ! command -v migrate &> /dev/null; then
    echo "Installing migrate tool..."
    go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
fi

# Export PATH to include GOPATH/bin
export PATH=$PATH:$(go env GOPATH)/bin

# Run migrations using docker exec
docker exec -e PGPASSWORD=postgres monstera-postgres psql -U postgres -d monstera -c "SELECT 1;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: Cannot connect to PostgreSQL container"
    exit 1
fi

# Use migrate with docker host IP
DOCKER_HOST_IP=$(docker network inspect monstera_monstera-network -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}')

# If on Mac, try localhost
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Try with localhost first
    migrate -path migrations/postgresql-versions -database "postgres://postgres:postgres@localhost:5433/monstera?sslmode=disable" up
else
    # On Linux, use docker gateway
    migrate -path migrations/postgresql-versions -database "postgres://postgres:postgres@${DOCKER_HOST_IP}:5433/monstera?sslmode=disable" up
fi

echo "Migration completed!"