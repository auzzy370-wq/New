-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create additional databases for testing
CREATE DATABASE tapflow_test;
GRANT ALL PRIVILEGES ON DATABASE tapflow_test TO tapflow;
