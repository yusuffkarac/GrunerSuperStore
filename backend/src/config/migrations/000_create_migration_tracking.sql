-- Migration: Create migration tracking table
-- Date: 2025-01-17
-- Description: Creates a table to track which migrations have been executed
-- This migration should run FIRST before any other migrations

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64), -- SHA256 hash of migration file content
  execution_time_ms INTEGER, -- Execution time in milliseconds
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename ON schema_migrations(filename);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at ON schema_migrations(executed_at DESC);

-- Add comment
COMMENT ON TABLE schema_migrations IS 'Tracks executed database migrations to prevent duplicate execution';

