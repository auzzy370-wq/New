-- Phase 2: Add owner fields to merchant_settings, taxRate to locations,
-- and description/businessCategory to merchants

-- Merchant: add description and business_category
ALTER TABLE "merchants"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "business_category" VARCHAR;

-- Location: add tax_rate
ALTER TABLE "locations"
  ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0;

-- MerchantSettings: add owner fields
ALTER TABLE "merchant_settings"
  ADD COLUMN IF NOT EXISTS "owner_first_name" VARCHAR,
  ADD COLUMN IF NOT EXISTS "owner_last_name" VARCHAR,
  ADD COLUMN IF NOT EXISTS "owner_phone" VARCHAR,
  ADD COLUMN IF NOT EXISTS "owner_title" VARCHAR;
