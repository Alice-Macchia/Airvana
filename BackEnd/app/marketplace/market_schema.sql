-- ====================================
-- MARKETPLACE DATABASE SCHEMA
-- ====================================
-- Questo schema estende il database principale con funzionalità marketplace
-- Prerequisito: le tabelle users, farmers, society, agronomists devono già esistere

-- ====================================
-- 1. CATEGORIE PRODOTTI
-- ====================================
DROP TABLE IF EXISTS marketplace_categories CASCADE;
CREATE TABLE marketplace_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES marketplace_categories(id) ON DELETE SET NULL, -- Per categorie gerarchiche
    created_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- 2. PRODOTTI
-- ====================================
DROP TABLE IF EXISTS marketplace_products CASCADE;
CREATE TABLE marketplace_products (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Chi vende il prodotto
    category_id INTEGER REFERENCES marketplace_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0), -- Prezzo unitario
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0), -- Quantità disponibile
    unit VARCHAR(50) DEFAULT 'pz', -- Unità di misura (pz, kg, litri, ecc.)
    images TEXT[], -- Array di URL immagini
    is_active BOOLEAN DEFAULT TRUE, -- Prodotto attivo/disattivato
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_products_seller ON marketplace_products(seller_id);
CREATE INDEX idx_products_category ON marketplace_products(category_id);
CREATE INDEX idx_products_active ON marketplace_products(is_active);

-- ====================================
-- 3. CARRELLO
-- ====================================
DROP TABLE IF EXISTS marketplace_carts CASCADE;
CREATE TABLE marketplace_carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Un carrello per utente
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- 4. ITEMS NEL CARRELLO
-- ====================================
DROP TABLE IF EXISTS marketplace_cart_items CASCADE;
CREATE TABLE marketplace_cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES marketplace_carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cart_id, product_id) -- Un prodotto può apparire una sola volta nel carrello
);

-- ====================================
-- 5. ORDINI
-- ====================================
DROP TABLE IF EXISTS marketplace_orders CASCADE;
CREATE TABLE marketplace_orders (
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Chi compra
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, confirmed, shipped, completed, cancelled
    shipping_address TEXT NOT NULL,
    payment_method VARCHAR(50), -- stripe, paypal, bonifico, ecc.
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_orders_buyer ON marketplace_orders(buyer_id);
CREATE INDEX idx_orders_status ON marketplace_orders(status);

-- ====================================
-- 6. ITEMS DEGLI ORDINI
-- ====================================
DROP TABLE IF EXISTS marketplace_order_items CASCADE;
CREATE TABLE marketplace_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES marketplace_products(id) ON DELETE RESTRICT, -- Non eliminare prodotti con ordini
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Venditore al momento dell'ordine
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0), -- Prezzo al momento dell'ordine
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0), -- quantity * unit_price
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_order_items_order ON marketplace_order_items(order_id);
CREATE INDEX idx_order_items_seller ON marketplace_order_items(seller_id);

-- ====================================
-- 7. RECENSIONI
-- ====================================
DROP TABLE IF EXISTS marketplace_reviews CASCADE;
CREATE TABLE marketplace_reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Chi scrive la recensione
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- Valutazione da 1 a 5
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, user_id) -- Un utente può recensire un prodotto una sola volta
);

-- Indici per performance
CREATE INDEX idx_reviews_product ON marketplace_reviews(product_id);
CREATE INDEX idx_reviews_user ON marketplace_reviews(user_id);

-- ====================================
-- DATI DI ESEMPIO - CATEGORIE
-- ====================================
INSERT INTO marketplace_categories (name, description) VALUES
    ('Attrezzature Agricole', 'Macchinari e strumenti per l''agricoltura'),
    ('Sementi', 'Semi e piantine per coltivazione'),
    ('Fertilizzanti', 'Concimi organici e chimici'),
    ('Prodotti del Territorio', 'Prodotti alimentari locali'),
    ('Servizi', 'Servizi per l''agricoltura e consulenze');

-- ====================================
-- TRIGGER PER AGGIORNAMENTO AUTOMATICO
-- ====================================

-- Trigger per aggiornare updated_at su products
CREATE OR REPLACE FUNCTION update_products_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_products_timestamp
BEFORE UPDATE ON marketplace_products
FOR EACH ROW
EXECUTE FUNCTION update_products_timestamp();

-- Trigger per aggiornare updated_at su carts
CREATE OR REPLACE FUNCTION update_carts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_carts_timestamp
BEFORE UPDATE ON marketplace_carts
FOR EACH ROW
EXECUTE FUNCTION update_carts_timestamp();

-- Trigger per aggiornare updated_at su orders
CREATE OR REPLACE FUNCTION update_orders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orders_timestamp
BEFORE UPDATE ON marketplace_orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_timestamp();

-- ====================================
-- COMANDI PER ESEGUIRE LO SCHEMA
-- ====================================
-- Eseguire questo comando dalla directory BackEnd/app/marketplace:
-- psql -U postgres -d co2app -f market_schema.sql
