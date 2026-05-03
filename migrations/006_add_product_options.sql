-- Migration: Add product options and option values
-- Creates tables to store configurable options for products (sauces, supplements, number of meats, etc.)

CREATE TABLE IF NOT EXISTS product_options (
  id serial PRIMARY KEY,
  product_id integer,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('radio','checkbox','select','number')),
  required boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_options_product_id ON product_options(product_id);

CREATE TABLE IF NOT EXISTS product_option_values (
  id serial PRIMARY KEY,
  option_id integer NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
  value text NOT NULL,
  price_modifier numeric(8,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_option_values_option_id ON product_option_values(option_id);

-- Seed sensible defaults for Sandwich and Tacos products (if products table exists and products are named accordingly)
DO $$
DECLARE
  p RECORD;
  opt_id integer;
BEGIN
  -- Sandwiches: look for products with 'sandwich' in the title
  FOR p IN SELECT id FROM products WHERE LOWER(title) LIKE '%sandwich%' LOOP
    -- Sauce (single choice)
    INSERT INTO product_options(product_id, name, type, required) VALUES (p.id, 'Sauce', 'radio', true) RETURNING id INTO opt_id;
    INSERT INTO product_option_values(option_id, value, price_modifier) VALUES
      (opt_id, 'Algérienne', 0),
      (opt_id, 'Barbacue', 0),
      (opt_id, 'Mayo', 0),
      (opt_id, 'Ketchup', 0);

    -- Vegetables: salad/tomato/onion (checkboxes)
    INSERT INTO product_options(product_id, name, type, required) VALUES (p.id, 'Légumes', 'checkbox', false) RETURNING id INTO opt_id;
    INSERT INTO product_option_values(option_id, value, price_modifier) VALUES
      (opt_id, 'Salade', 0),
      (opt_id, 'Tomate', 0),
      (opt_id, 'Oignon', 0);

    -- Supplements (extra meats) - payant aussi comme les tacos
    INSERT INTO product_options(product_id, name, type, required) VALUES (p.id, 'Suppléments (viandes)', 'checkbox', false) RETURNING id INTO opt_id;
    INSERT INTO product_option_values(option_id, value, price_modifier) VALUES
      (opt_id, 'Falafel', 2.00),
      (opt_id, 'Poulet', 2.00),
      (opt_id, 'Tenders', 2.00),
      (opt_id, 'Nuggets', 2.00),
      (opt_id, 'Kebab', 2.00),
      (opt_id, 'Steak', 2.00);
  END LOOP;

  -- Tacos: look for products starting with 'tacos' or containing 'tacos'
  FOR p IN SELECT id FROM products WHERE LOWER(title) LIKE '%tacos%' LOOP
    -- Viande principale (radio): choix parmi les viandes disponibles
    INSERT INTO product_options(product_id, name, type, required) VALUES (p.id, 'Viande principale', 'radio', true) RETURNING id INTO opt_id;
    INSERT INTO product_option_values(option_id, value, price_modifier) VALUES
      (opt_id, 'Falafel', 0),
      (opt_id, 'Poulet', 0),
      (opt_id, 'Tenders', 0),
      (opt_id, 'Nuggets', 0),
      (opt_id, 'Kebab', 0),
      (opt_id, 'Steak', 0);

    -- Viandes supplémentaires (checkbox): chaque supplément coûte +2.00€
    INSERT INTO product_options(product_id, name, type, required) VALUES (p.id, 'Viandes supplémentaires', 'checkbox', false) RETURNING id INTO opt_id;
    INSERT INTO product_option_values(option_id, value, price_modifier) VALUES
      (opt_id, 'Falafel', 2.00),
      (opt_id, 'Poulet', 2.00),
      (opt_id, 'Tenders', 2.00),
      (opt_id, 'Nuggets', 2.00),
      (opt_id, 'Kebab', 2.00),
      (opt_id, 'Steak', 2.00);

    -- Frites: option mise en avant pour encourager l'ajout
    INSERT INTO product_options(product_id, name, type, required) VALUES (p.id, 'Frites', 'radio', true) RETURNING id INTO opt_id;
    INSERT INTO product_option_values(option_id, value, price_modifier) VALUES
      (opt_id, 'Avec frites', 2.00),
      (opt_id, 'Sans frites', 0);

    -- Sauces
    INSERT INTO product_options(product_id, name, type, required) VALUES (p.id, 'Sauce', 'radio', true) RETURNING id INTO opt_id;
    INSERT INTO product_option_values(option_id, value, price_modifier) VALUES
      (opt_id, 'Algérienne', 0),
      (opt_id, 'Barbacue', 0),
      (opt_id, 'Mayo', 0),
      (opt_id, 'Ketchup', 0);
  END LOOP;
END
$$ LANGUAGE plpgsql;
