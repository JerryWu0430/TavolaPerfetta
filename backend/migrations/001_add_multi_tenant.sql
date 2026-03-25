-- Migration: Add multi-tenant support
-- Run this in Supabase SQL Editor

-- 1. Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create restaurant_members table
CREATE TABLE IF NOT EXISTS restaurant_members (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    role VARCHAR(20) DEFAULT 'staff',
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_members_email ON restaurant_members(email);
CREATE INDEX IF NOT EXISTS idx_restaurant_members_user_id ON restaurant_members(user_id);

-- 3. Add restaurant_id to existing tables
-- NOTE: For existing data, you'll need to set a default restaurant_id first

-- Locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE locations ADD CONSTRAINT fk_locations_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
CREATE INDEX IF NOT EXISTS idx_locations_restaurant ON locations(restaurant_id);

-- Suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE suppliers ADD CONSTRAINT fk_suppliers_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant ON suppliers(restaurant_id);

-- Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE products ADD CONSTRAINT fk_products_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant_id);

-- Deliveries
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE deliveries ADD CONSTRAINT fk_deliveries_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
CREATE INDEX IF NOT EXISTS idx_deliveries_restaurant ON deliveries(restaurant_id);

-- Invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
CREATE INDEX IF NOT EXISTS idx_invoices_restaurant ON invoices(restaurant_id);

-- Inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE inventory ADD CONSTRAINT fk_inventory_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
CREATE INDEX IF NOT EXISTS idx_inventory_restaurant ON inventory(restaurant_id);

-- HACCP Templates
ALTER TABLE haccp_templates ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE haccp_templates ADD CONSTRAINT fk_haccp_templates_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
CREATE INDEX IF NOT EXISTS idx_haccp_templates_restaurant ON haccp_templates(restaurant_id);

-- HACCP Checklists
ALTER TABLE haccp_checklists ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE haccp_checklists ADD CONSTRAINT fk_haccp_checklists_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
CREATE INDEX IF NOT EXISTS idx_haccp_checklists_restaurant ON haccp_checklists(restaurant_id);

-- Recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE recipes ADD CONSTRAINT fk_recipes_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
CREATE INDEX IF NOT EXISTS idx_recipes_restaurant ON recipes(restaurant_id);

-- Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE orders ADD CONSTRAINT fk_orders_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);

-- Price History
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE price_history ADD CONSTRAINT fk_price_history_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
CREATE INDEX IF NOT EXISTS idx_price_history_restaurant ON price_history(restaurant_id);

-- 4. Enable RLS (optional but recommended)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_members ENABLE ROW LEVEL SECURITY;
-- ... etc for other tables

-- 5. Create first restaurant and admin (CUSTOMIZE THIS)
-- INSERT INTO restaurants (name, slug) VALUES ('My Restaurant', 'my-restaurant');
-- INSERT INTO restaurant_members (email, role, restaurant_id)
--     VALUES ('your-email@gmail.com', 'admin', 1);
