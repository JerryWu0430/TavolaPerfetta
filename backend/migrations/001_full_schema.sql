-- Full schema for TavolaPerfetta (fresh Supabase database)
-- Run this in Supabase SQL Editor

-- 1. Restaurants & Members
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE restaurant_members (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    role VARCHAR(20) DEFAULT 'staff',
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_restaurant_members_email ON restaurant_members(email);
CREATE INDEX idx_restaurant_members_user_id ON restaurant_members(user_id);

-- 2. Locations
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_locations_restaurant ON locations(restaurant_id);

-- 3. Suppliers
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    contact_name VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    address VARCHAR(255),
    reliability_score FLOAT DEFAULT 100.0,
    avg_delivery_days FLOAT DEFAULT 1.0,
    payment_terms VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_suppliers_restaurant ON suppliers(restaurant_id);

-- 4. Products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    unit VARCHAR(20),
    unit_price FLOAT DEFAULT 0.0,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE RESTRICT,
    sku VARCHAR(50),
    min_stock FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_products_restaurant ON products(restaurant_id);

-- 5. Deliveries
CREATE TABLE deliveries (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_deliveries_restaurant ON deliveries(restaurant_id);

CREATE TABLE delivery_items (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(100),
    quantity FLOAT NOT NULL,
    unit VARCHAR(20),
    unit_price FLOAT DEFAULT 0.0
);

-- 6. Invoices
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50),
    date DATE NOT NULL,
    total FLOAT DEFAULT 0.0,
    vat FLOAT DEFAULT 0.0,
    file_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_invoices_restaurant ON invoices(restaurant_id);

CREATE TABLE invoice_lines (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    description VARCHAR(255),
    quantity FLOAT NOT NULL,
    unit VARCHAR(20),
    unit_price FLOAT DEFAULT 0.0,
    total FLOAT DEFAULT 0.0
);

-- 7. Inventory
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE RESTRICT,
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    quantity FLOAT DEFAULT 0.0,
    theoretical_quantity FLOAT DEFAULT 0.0,
    last_count_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_inventory_restaurant ON inventory(restaurant_id);

-- 8. HACCP
CREATE TABLE haccp_templates (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    input_type VARCHAR(20) DEFAULT 'boolean',
    min_value FLOAT,
    max_value FLOAT,
    unit VARCHAR(20),
    frequency VARCHAR(20) DEFAULT 'daily',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_haccp_templates_restaurant ON haccp_templates(restaurant_id);

CREATE TABLE haccp_checklists (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    operator VARCHAR(100),
    shift VARCHAR(20),
    status VARCHAR(20) DEFAULT 'incomplete',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_haccp_checklists_restaurant ON haccp_checklists(restaurant_id);

CREATE TABLE haccp_items (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES haccp_checklists(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES haccp_templates(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    value VARCHAR(100),
    passed BOOLEAN,
    notes TEXT
);

-- 9. Recipes
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    description VARCHAR(500),
    price FLOAT DEFAULT 0.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_recipes_restaurant ON recipes(restaurant_id);

CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity FLOAT NOT NULL,
    unit VARCHAR(20),
    waste_pct FLOAT DEFAULT 0.0
);

-- 10. Orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    total FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
    quantity INTEGER DEFAULT 1,
    unit_price FLOAT NOT NULL
);

-- 11. Price History
CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    price FLOAT NOT NULL,
    recorded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_price_history_restaurant ON price_history(restaurant_id);

-- 12. Create your restaurant & admin (EDIT THIS)
INSERT INTO restaurants (name, slug) VALUES ('My Restaurant', 'my-restaurant');
INSERT INTO restaurant_members (email, role, restaurant_id)
VALUES ('your-email@example.com', 'admin', 1);
