-- Initialize database for NewsCast Debate
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create any additional users or permissions if needed
-- (Currently using default postgres user)
