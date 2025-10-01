-- Fix commission_calculations table to accept decimal values
-- Run this in your Supabase SQL Editor

ALTER TABLE commission_calculations
  ALTER COLUMN deal_count_at_time TYPE numeric(10,2);

ALTER TABLE commission_calculations
  ALTER COLUMN six_month_equivalent TYPE numeric(10,2);

-- Optional: If these columns also need to accept decimals, uncomment:
-- ALTER TABLE commission_calculations
--   ALTER COLUMN closer_commission TYPE numeric(10,2);
--
-- ALTER TABLE commission_calculations
--   ALTER COLUMN setter_commission TYPE numeric(10,2);
--
-- ALTER TABLE commission_calculations
--   ALTER COLUMN csm_commission TYPE numeric(10,2);
