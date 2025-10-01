-- Commission Tracker Database Setup
-- Execute these queries in your Supabase SQL editor

-- 1. Add missing columns to existing payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS service_agreement_status TEXT DEFAULT 'pending' CHECK (service_agreement_status IN ('pending', 'completed'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS assigned_csm TEXT DEFAULT 'N/A' CHECK (assigned_csm IN ('Maia', 'Luiza', 'Talita', 'Tamara', 'Carolina', 'N/A'));

-- 2. Create deal_types table
CREATE TABLE IF NOT EXISTS deal_types (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    conversion_rate DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    is_backend BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create csms table
CREATE TABLE IF NOT EXISTS csms (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL CHECK (name IN ('Maia', 'Luiza', 'Talita', 'Tamara', 'Carolina', 'N/A')),
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create commission_calculations table
CREATE TABLE IF NOT EXISTS commission_calculations (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- YYYY-MM format
    deal_count_at_time INTEGER NOT NULL,
    six_month_equivalent DECIMAL(5,2) NOT NULL,
    tier_min_deals INTEGER NOT NULL,
    tier_max_deals INTEGER,
    closer_rate DECIMAL(4,2) NOT NULL,
    setter_rate DECIMAL(4,2) NOT NULL,
    closer_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
    setter_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
    csm_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payment_id)
);

-- 5. Insert commission deal types (for calculation logic)
INSERT INTO deal_types (name, display_name, conversion_rate, is_backend) VALUES
('google_ads', 'Google Ads', 0.33, FALSE),
('referral_network_6_months', 'Referral Network 6 Months', 1.00, FALSE),
('referral_network_3_months', 'Referral Network 3 Months', 0.50, FALSE),
('referral_network_4_months', 'Referral Network 4 Months', 0.50, FALSE),
('service_upgrade', 'Service Upgrade', 0.00, TRUE)
ON CONFLICT (name) DO NOTHING;

-- 5a. Insert payment types (what's actually in your payments table)
INSERT INTO deal_types (name, display_name, conversion_rate, is_backend) VALUES
('New Deal', 'New Deal', 1.00, FALSE),
('Rebill', 'Rebill', 1.00, FALSE)
ON CONFLICT (name) DO NOTHING;

-- 5b. Auto-discover any other payment types from existing payments
INSERT INTO deal_types (name, display_name, conversion_rate, is_backend)
SELECT DISTINCT
    deal_type as name,
    deal_type as display_name,
    1.00 as conversion_rate,
    FALSE as is_backend
FROM payments
WHERE deal_type IS NOT NULL
AND deal_type NOT IN (SELECT name FROM deal_types)
ON CONFLICT (name) DO NOTHING;

-- 6. Insert default CSMs
INSERT INTO csms (name, email, is_active) VALUES
('Maia', 'maia@company.com', TRUE),
('Luiza', 'luiza@company.com', TRUE),
('Talita', 'talita@company.com', TRUE),
('Tamara', 'tamara@company.com', TRUE),
('Carolina', 'carolina@company.com', TRUE),
('N/A', NULL, TRUE)
ON CONFLICT (name) DO NOTHING;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_service_agreement_status ON payments(service_agreement_status);
CREATE INDEX IF NOT EXISTS idx_payments_assigned_csm ON payments(assigned_csm);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_month ON commission_calculations(month);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_payment_id ON commission_calculations(payment_id);

-- 8. Enable Row Level Security (RLS) for new tables
ALTER TABLE deal_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE csms ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_calculations ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies (adjust based on your authentication setup)
-- Allow read access to authenticated users
CREATE POLICY "Allow read access to deal_types" ON deal_types FOR SELECT USING (true);
CREATE POLICY "Allow read access to csms" ON csms FOR SELECT USING (true);
CREATE POLICY "Allow read access to commission_calculations" ON commission_calculations FOR SELECT USING (true);

-- Allow insert/update/delete for authenticated users (you may want to restrict this further)
CREATE POLICY "Allow insert access to deal_types" ON deal_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to deal_types" ON deal_types FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to deal_types" ON deal_types FOR DELETE USING (true);

CREATE POLICY "Allow insert access to csms" ON csms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to csms" ON csms FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to csms" ON csms FOR DELETE USING (true);

CREATE POLICY "Allow insert access to commission_calculations" ON commission_calculations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to commission_calculations" ON commission_calculations FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to commission_calculations" ON commission_calculations FOR DELETE USING (true);

-- 10. Update existing payments RLS if needed
CREATE POLICY IF NOT EXISTS "Allow read access to payments" ON payments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow insert access to payments" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow update access to payments" ON payments FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Allow delete access to payments" ON payments FOR DELETE USING (true);