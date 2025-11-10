-- Migration: Add latitude and longitude to addresses table
-- Date: 2025-11-09
-- Description: Adds latitude and longitude columns to addresses table for distance calculation

-- Add latitude and longitude columns to addresses table
ALTER TABLE addresses 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add comments to columns
COMMENT ON COLUMN addresses.latitude IS 'Adres enlemi (latitude)';
COMMENT ON COLUMN addresses.longitude IS 'Adres boylamı (longitude)';

