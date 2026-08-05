-- Migration: Add tipe column to barang table
-- Created: 2026-07-17

-- Add optional tipe column to barang table
ALTER TABLE "barang" ADD COLUMN IF NOT EXISTS "tipe" TEXT;
