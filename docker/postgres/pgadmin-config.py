# pgAdmin configuration for development

# Allow all IP addresses to connect
DEFAULT_SERVER = '0.0.0.0'

# Disable email verification
SECURITY_EMAIL_REQUIRED = False

# Enable password-less login for development
SERVER_MODE = False

# Set default paths
LOG_FILE = '/var/lib/pgadmin/pgadmin4.log'
SQLITE_PATH = '/var/lib/pgadmin/pgadmin4.db'
SESSION_DB_PATH = '/var/lib/pgadmin/sessions'
STORAGE_DIR = '/var/lib/pgadmin/storage'

# Development settings
DEBUG = False
CONSOLE_LOG_LEVEL = 20  # INFO level

# Increase timeout for large queries
QUERY_TIMEOUT = 600  # 10 minutes