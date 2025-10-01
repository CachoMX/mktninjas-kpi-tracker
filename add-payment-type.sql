-- Add payment_type column to payments table
-- This separates Payment Type (New Deal, Rebill) from Deal Type (Google Ads, Referral Network, etc.)

-- 1. Add payment_type column
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'New Deal' CHECK (payment_type IN ('New Deal', 'Rebill'));

-- 2. Populate payment_type based on existing deal_type values
UPDATE payments
SET payment_type = CASE
    WHEN deal_type = 'New Deal' THEN 'New Deal'
    WHEN deal_type = 'Rebill' THEN 'Rebill'
    ELSE 'New Deal' -- Default for other types
END
WHERE payment_type IS NULL OR payment_type = 'New Deal';

-- 3. Update deal_type for payments that currently have 'New Deal' or 'Rebill' as deal_type
-- These should now have proper deal types like 'Google Ads', 'Referral Network 6 Months', etc.
-- For now, set them to a default that makes sense
UPDATE payments
SET deal_type = 'referral_network_6_months'
WHERE deal_type IN ('New Deal', 'Rebill');

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);