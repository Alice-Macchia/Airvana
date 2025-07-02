-- PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- -- Users Natural Persons
-- DROP TABLE IF EXISTS natural_person CASCADE;
-- CREATE TABLE natural_person (
--     id SERIAL PRIMARY KEY,
--     user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, --Se una riga nella tabella users viene eliminata, allora automaticamente verrà eliminata anche la riga collegata in natural_person o society che ha lo stesso user_id
--     username VARCHAR(50) UNIQUE NOT NULL,
--     first_name VARCHAR(100) NOT NULL,
--     last_name VARCHAR(100) NOT NULL,
--     gender VARCHAR(10),
--     email VARCHAR(100) UNIQUE NOT NULL,
--     password VARCHAR(100) NOT NULL,
--     phone_number VARCHAR(20),
--     province VARCHAR(100),
--     city VARCHAR(100),
--     address VARCHAR(200),
--     created_at TIMESTAMP DEFAULT NOW()
-- );

-- Agricoltori (Fornitori di terreno che sono persone fisiche)
DROP TABLE IF EXISTS farmers CASCADE;
CREATE TABLE farmers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    cod_fis VARCHAR(16) UNIQUE NOT NULL,
    farm_name VARCHAR(150), -- Nome dell'azienda agricola (opzionale)
    phone_number VARCHAR(20),
    province VARCHAR(100),
    city VARCHAR(100),
    address VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW()
);


-- Users Society
DROP TABLE IF EXISTS society CASCADE;
CREATE TABLE society (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    ragione_sociale VARCHAR(150) NOT NULL,
    sede_legale VARCHAR(200),
    partita_IVA VARCHAR(20) UNIQUE NOT NULL, 
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    province VARCHAR(100),
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Tabella per i dati specifici degli Agronomi
-- Questa tabella estende il profilo di un utente che è anche una persona fisica.
DROP TABLE IF EXISTS agronomists CASCADE;
CREATE TABLE agronomists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    albo_number VARCHAR(50) UNIQUE NOT NULL, -- Numero di iscrizione all'albo professionale
    specialization VARCHAR(255), -- Es. 'Gestione forestale', 'Certificazione ambientale'
    is_certified BOOLEAN DEFAULT TRUE, -- Flag per indicare se l'agronomo è verificato dalla piattaforma
    created_at TIMESTAMP DEFAULT NOW()
);

-- Plots
DROP TABLE IF EXISTS plots CASCADE;
CREATE TABLE plots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(100),
    geom GEOMETRY(POLYGON, 4326),           -- Polygon
    centroid GEOMETRY(POINT, 4326),         -- Centroid point
    created_at TIMESTAMP DEFAULT NOW()
   
);

-- Plant Species
DROP TABLE IF EXISTS species CASCADE;
CREATE TABLE species (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    co2_absorption_rate FLOAT, -- kg/day/m²
    o2_production_rate  FLOAT -- kg/day/m²

);

-- Plot-Species Association
DROP TABLE IF EXISTS plot_species CASCADE;
CREATE TABLE plot_species (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER REFERENCES plots(id),
    species_id INTEGER REFERENCES species(id),
    surface_area FLOAT              -- Area occupied by the species (e.g., m² per unit)

);

-- Weather Data
DROP TABLE IF EXISTS weather_data CASCADE;
CREATE TABLE weather_data (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER REFERENCES plots(id)  ON DELETE CASCADE,
    date_time TIMESTAMP NOT NULL,
    temperature FLOAT,
    precipitation FLOAT,
    solar_radiation FLOAT,
    humidity INTEGER,
    total_co2_absorption FLOAT,
    total_o2_production FLOAT
);


-- database co2app già creato

-- questo comando crea le tabelle nel database che è gia creato su postgres:
-- psql -U postgres -d co2app -f 'C:\Users\Saria\Desktop\JDE\Project Work\CO-e-O-Il-tuo-terreno-respira\BackEnd\schema.sql'





--DA FARE
-- 4. Tabella per la certificazione dei terreni (NUOVA)
-- Collega un terreno, un agronomo e il documento di certificazione.
DROP TABLE IF EXISTS plot_certifications CASCADE;
CREATE TABLE plot_certifications (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER UNIQUE NOT NULL REFERENCES plots(id) ON DELETE CASCADE, -- Un terreno ha una sola certificazione attiva
    agronomist_id INTEGER NOT NULL REFERENCES agronomists(id), -- L'agronomo che ha certificato
    certification_document_url VARCHAR(255) NOT NULL, -- URL del documento di perizia
    certification_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Pending', -- Es. 'Pending', 'Approved', 'Rejected'
    notes TEXT, -- Note aggiuntive dall'agronomo o dall'admin
    created_at TIMESTAMP DEFAULT NOW()
);

