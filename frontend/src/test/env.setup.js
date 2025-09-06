// Jest environment setup for frontend tests
// This file is intentionally minimal to satisfy setupFiles reference.
// Add any required test-time environment variables here.
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
process.env.NEXT_SERVER_API_URL = process.env.NEXT_SERVER_API_URL || 'http://localhost:8080';

