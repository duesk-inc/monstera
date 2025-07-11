#!/bin/bash

# PostgreSQL Migration Script for Monstera Project
# 
# Description:
#   This script manages PostgreSQL database migrations for the Monstera project.
#   It supports various operations including up, down, status, and force migrations.
#
# Usage:
#   ./migrate-pg.sh [command] [options]
#
# Commands:
#   up          Run all pending migrations
#   down        Rollback migrations (specify number with -n)
#   status      Show current migration status
#   force       Force set migration version (use with caution)
#   create      Create a new migration file
#   validate    Validate migration files
#
# Options:
#   -n NUMBER   Number of migrations to rollback (for down command)
#   -v VERSION  Specific version to force (for force command)
#   -e ENV      Environment (development/staging/production)
#   -h          Show this help message

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="${PROJECT_ROOT}/migrations/postgresql-versions"
MIGRATE_TOOL="migrate"

# Default values
ENV="${ENV:-development}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-monstera}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_SSLMODE="${DB_SSLMODE:-disable}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if migrate tool is installed
    if ! command -v ${MIGRATE_TOOL} &> /dev/null; then
        print_error "migrate tool not found. Please install it first:"
        echo "  go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
        exit 1
    fi
    
    # Check if migrations directory exists
    if [ ! -d "${MIGRATIONS_DIR}" ]; then
        print_error "Migrations directory not found: ${MIGRATIONS_DIR}"
        exit 1
    fi
    
    # Check PostgreSQL connection
    export PGPASSWORD="${DB_PASSWORD}"
    if ! psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c '\q' 2>/dev/null; then
        print_error "Cannot connect to PostgreSQL database"
        print_error "Connection string: postgres://${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}"
        exit 1
    fi
    unset PGPASSWORD
    
    print_success "All prerequisites met"
}

get_database_url() {
    echo "postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}"
}

migrate_up() {
    print_info "Running migrations up..."
    
    DATABASE_URL=$(get_database_url)
    
    # Show current version
    print_info "Current migration version:"
    ${MIGRATE_TOOL} -path "${MIGRATIONS_DIR}" -database "${DATABASE_URL}" version || true
    
    # Run migrations
    if ${MIGRATE_TOOL} -path "${MIGRATIONS_DIR}" -database "${DATABASE_URL}" up; then
        print_success "Migrations completed successfully"
        
        # Show new version
        print_info "New migration version:"
        ${MIGRATE_TOOL} -path "${MIGRATIONS_DIR}" -database "${DATABASE_URL}" version
    else
        print_error "Migration failed"
        exit 1
    fi
}

migrate_down() {
    local steps="${1:-1}"
    print_warning "Rolling back ${steps} migration(s)..."
    
    DATABASE_URL=$(get_database_url)
    
    # Show current version
    print_info "Current migration version:"
    ${MIGRATE_TOOL} -path "${MIGRATIONS_DIR}" -database "${DATABASE_URL}" version || true
    
    # Confirm rollback
    read -p "Are you sure you want to rollback ${steps} migration(s)? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Rollback cancelled"
        exit 0
    fi
    
    # Run rollback
    if ${MIGRATE_TOOL} -path "${MIGRATIONS_DIR}" -database "${DATABASE_URL}" down ${steps}; then
        print_success "Rollback completed successfully"
        
        # Show new version
        print_info "New migration version:"
        ${MIGRATE_TOOL} -path "${MIGRATIONS_DIR}" -database "${DATABASE_URL}" version
    else
        print_error "Rollback failed"
        exit 1
    fi
}

migrate_status() {
    print_info "Checking migration status..."
    
    DATABASE_URL=$(get_database_url)
    
    # Show current version
    print_info "Current database version:"
    ${MIGRATE_TOOL} -path "${MIGRATIONS_DIR}" -database "${DATABASE_URL}" version || echo "No version set"
    
    # List migration files
    print_info "Available migrations:"
    ls -la "${MIGRATIONS_DIR}"/*.up.postgresql.sql 2>/dev/null | awk '{print $NF}' | xargs -n1 basename | sort || echo "No migrations found"
    
    # Check for pending migrations
    print_info "Checking for pending migrations..."
    # This is a simplified check - in production, you might want a more sophisticated approach
    CURRENT_VERSION=$(${MIGRATE_TOOL} -path "${MIGRATIONS_DIR}" -database "${DATABASE_URL}" version 2>/dev/null | grep -oE '[0-9]+' || echo "0")
    LATEST_VERSION=$(ls "${MIGRATIONS_DIR}"/*.up.postgresql.sql 2>/dev/null | xargs -n1 basename | grep -oE '^[0-9]+' | sort -n | tail -1 || echo "0")
    
    if [ "${CURRENT_VERSION}" = "${LATEST_VERSION}" ]; then
        print_success "Database is up to date"
    else
        print_warning "There are pending migrations (current: ${CURRENT_VERSION}, latest: ${LATEST_VERSION})"
    fi
}

migrate_force() {
    local version="$1"
    print_warning "Forcing migration version to ${version}..."
    print_warning "This operation should only be used in emergency situations!"
    
    DATABASE_URL=$(get_database_url)
    
    # Confirm force
    read -p "Are you absolutely sure you want to force version ${version}? (yes/NO) " -r
    if [[ ! "$REPLY" == "yes" ]]; then
        print_info "Force operation cancelled"
        exit 0
    fi
    
    # Force version
    if ${MIGRATE_TOOL} -path "${MIGRATIONS_DIR}" -database "${DATABASE_URL}" force ${version}; then
        print_success "Version forced to ${version}"
        
        # Show new version
        print_info "New migration version:"
        ${MIGRATE_TOOL} -path "${MIGRATIONS_DIR}" -database "${DATABASE_URL}" version
    else
        print_error "Force operation failed"
        exit 1
    fi
}

migrate_create() {
    print_info "Creating new migration..."
    
    read -p "Enter migration name (e.g., add_user_status_column): " migration_name
    
    if [ -z "${migration_name}" ]; then
        print_error "Migration name cannot be empty"
        exit 1
    fi
    
    # Create migration using migrate tool
    if ${MIGRATE_TOOL} create -ext sql -dir "${MIGRATIONS_DIR}" -seq "${migration_name}" -format "{{.Version}}_{{.Name}}.{{.Direction}}.postgresql.sql"; then
        print_success "Migration files created"
        
        # Show created files
        print_info "Created files:"
        ls -la "${MIGRATIONS_DIR}"/*"${migration_name}"*.sql
    else
        print_error "Failed to create migration"
        exit 1
    fi
}

validate_migrations() {
    print_info "Validating migration files..."
    
    local errors=0
    
    # Check for matching up/down files
    for up_file in "${MIGRATIONS_DIR}"/*.up.postgresql.sql; do
        if [ -f "${up_file}" ]; then
            down_file="${up_file%.up.postgresql.sql}.down.postgresql.sql"
            if [ ! -f "${down_file}" ]; then
                print_error "Missing down migration for: $(basename ${up_file})"
                ((errors++))
            fi
        fi
    done
    
    # Check for duplicate version numbers
    print_info "Checking for duplicate version numbers..."
    duplicates=$(ls "${MIGRATIONS_DIR}"/*.up.postgresql.sql 2>/dev/null | xargs -n1 basename | grep -oE '^[0-9]+' | sort | uniq -d)
    if [ -n "${duplicates}" ]; then
        print_error "Duplicate version numbers found: ${duplicates}"
        ((errors++))
    fi
    
    # Check for SQL syntax (basic check)
    print_info "Checking SQL syntax..."
    for sql_file in "${MIGRATIONS_DIR}"/*.sql; do
        if [ -f "${sql_file}" ]; then
            # Check for common SQL errors
            if grep -E '(;;|SELECT\s+\*\s+FROM\s+;)' "${sql_file}" > /dev/null; then
                print_warning "Potential SQL syntax error in: $(basename ${sql_file})"
                ((errors++))
            fi
        fi
    done
    
    if [ ${errors} -eq 0 ]; then
        print_success "All migration files validated successfully"
    else
        print_error "Found ${errors} error(s) in migration files"
        exit 1
    fi
}

show_help() {
    cat << EOF
PostgreSQL Migration Script for Monstera Project

Usage: $0 [command] [options]

Commands:
  up          Run all pending migrations
  down        Rollback migrations (specify number with -n)
  status      Show current migration status
  force       Force set migration version (use with caution)
  create      Create a new migration file
  validate    Validate migration files
  help        Show this help message

Options:
  -n NUMBER   Number of migrations to rollback (for down command)
  -v VERSION  Specific version to force (for force command)
  -e ENV      Environment (development/staging/production)
  -h          Show this help message

Environment Variables:
  DB_HOST      PostgreSQL host (default: localhost)
  DB_PORT      PostgreSQL port (default: 5432)
  DB_NAME      Database name (default: monstera)
  DB_USER      Database user (default: postgres)
  DB_PASSWORD  Database password (default: postgres)
  DB_SSLMODE   SSL mode (default: disable)

Examples:
  $0 up                    # Run all pending migrations
  $0 down -n 1            # Rollback last migration
  $0 down -n 5            # Rollback last 5 migrations
  $0 status               # Check migration status
  $0 force -v 20         # Force version to 20
  $0 create              # Create new migration files
  $0 validate            # Validate all migration files

EOF
}

# Main script
main() {
    local command="${1:-}"
    shift || true
    
    # Parse options
    local rollback_steps=1
    local force_version=""
    
    while getopts "n:v:e:h" opt; do
        case ${opt} in
            n)
                rollback_steps="${OPTARG}"
                ;;
            v)
                force_version="${OPTARG}"
                ;;
            e)
                ENV="${OPTARG}"
                ;;
            h)
                show_help
                exit 0
                ;;
            *)
                show_help
                exit 1
                ;;
        esac
    done
    
    # Load environment-specific configuration if exists
    ENV_FILE="${PROJECT_ROOT}/.env.${ENV}"
    if [ -f "${ENV_FILE}" ]; then
        print_info "Loading environment: ${ENV}"
        source "${ENV_FILE}"
    fi
    
    # Execute command
    case "${command}" in
        up)
            check_prerequisites
            migrate_up
            ;;
        down)
            check_prerequisites
            migrate_down "${rollback_steps}"
            ;;
        status)
            check_prerequisites
            migrate_status
            ;;
        force)
            if [ -z "${force_version}" ]; then
                print_error "Version required for force command. Use -v VERSION"
                exit 1
            fi
            check_prerequisites
            migrate_force "${force_version}"
            ;;
        create)
            migrate_create
            ;;
        validate)
            validate_migrations
            ;;
        help)
            show_help
            ;;
        *)
            print_error "Unknown command: ${command}"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"