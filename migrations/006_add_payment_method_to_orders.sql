-- Add payment_method column to orders table
-- Stores the payment method used for the order: 'card', 'cash', 'ticket'

ALTER TABLE orders
ADD COLUMN payment_method VARCHAR(50) DEFAULT NULL;

-- Add comment to column
COMMENT ON COLUMN orders.payment_method IS 'Payment method: card (CB), cash (Espèces), ticket (Ticket resto)';
