-- Create loyalty/customer tracking table
CREATE TABLE IF NOT EXISTS loyalty (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    total_spent DECIMAL(10,2) DEFAULT 0,
    points_balance DECIMAL(10,2) DEFAULT 0,
    free_products_earned INT DEFAULT 0,
    free_products_used INT DEFAULT 0,
    last_order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_loyalty_phone ON loyalty(phone_number);

-- Enable RLS
ALTER TABLE loyalty ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Enable insert for all users" ON loyalty;
DROP POLICY IF EXISTS "Enable select for all users" ON loyalty;
DROP POLICY IF EXISTS "Enable update for all users" ON loyalty;

-- Policy: Anyone can insert (for new customer loyalty)
CREATE POLICY "Enable insert for all users" ON loyalty
    FOR INSERT WITH CHECK (true);

-- Policy: Anyone can select/update (loyalty is semi-public)
CREATE POLICY "Enable select for all users" ON loyalty
    FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON loyalty
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_loyalty_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loyalty_timestamp_trigger ON loyalty;

CREATE TRIGGER loyalty_timestamp_trigger
BEFORE UPDATE ON loyalty
FOR EACH ROW
EXECUTE FUNCTION update_loyalty_timestamp();
