-- Initial schema for PostgreSQL (adapted from SQLite schema)

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT,
  description TEXT,
  price TEXT,
  img TEXT,
  category_id INTEGER REFERENCES categories(id),
  badge TEXT,
  bread_types TEXT,
  is_spicy INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 0,
  is_popular INTEGER DEFAULT 0,
  is_customizable INTEGER DEFAULT 0,
  available_supplements TEXT
);

CREATE TABLE IF NOT EXISTS configuration (
  id SERIAL PRIMARY KEY,
  theme TEXT,
  hero_images TEXT,
  logo TEXT,
  restaurant_name TEXT,
  about_images TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  contact_address TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contact_hours TEXT
);

CREATE TABLE IF NOT EXISTS daily_specials (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  special_id INTEGER,
  note TEXT,
  price_override TEXT,
  ord INTEGER,
  date TEXT
);

CREATE TABLE IF NOT EXISTS specials (
  id SERIAL PRIMARY KEY,
  title TEXT,
  description TEXT,
  price TEXT,
  img TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  badge_text TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews_snapshots (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  place_id TEXT NOT NULL,
  fetched_at TIMESTAMP NOT NULL,
  avg_rating REAL,
  total_reviews INTEGER DEFAULT 0,
  reviews_json TEXT
);

-- end of migration
