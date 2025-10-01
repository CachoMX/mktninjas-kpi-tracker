-- Fix Payment Type vs Deal Type - Add proper FK relationship
-- This assumes you already renamed deal_type column to payment_type

-- 1. Add deal_type_id column as foreign key to deal_types table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deal_type_id INTEGER REFERENCES deal_types(id);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_payments_deal_type_id ON payments(deal_type_id);

-- 3. Populate deal_type_id based on existing data
-- Set default to 'referral_network_6_months' (assuming this exists)
UPDATE payments
SET deal_type_id = (
    SELECT id FROM deal_types WHERE name = 'referral_network_6_months' LIMIT 1
)
WHERE deal_type_id IS NULL;

-- 4. Make deal_type_id NOT NULL after populating
ALTER TABLE payments ALTER COLUMN deal_type_id SET NOT NULL;