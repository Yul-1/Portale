-- Creazione schema per il portale prenotazioni
CREATE SCHEMA IF NOT EXISTS portale;

-- Tabella per gli alloggi
CREATE TABLE IF NOT EXISTS portale.alloggi (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descrizione TEXT,
    posizione VARCHAR(500),
    prezzo_notte DECIMAL(10, 2) NOT NULL,
    numero_ospiti_max INTEGER DEFAULT 2,
    numero_camere INTEGER DEFAULT 1,
    numero_bagni INTEGER DEFAULT 1,
    servizi JSONB,
    disponibile BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella per le foto degli alloggi
CREATE TABLE IF NOT EXISTS portale.foto_alloggi (
    id SERIAL PRIMARY KEY,
    alloggio_id INTEGER REFERENCES portale.alloggi(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    descrizione VARCHAR(255),
    ordine INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella per le prenotazioni
CREATE TABLE IF NOT EXISTS portale.prenotazioni (
    id SERIAL PRIMARY KEY,
    alloggio_id INTEGER REFERENCES portale.alloggi(id),
    ospite_nome VARCHAR(255) NOT NULL,
    ospite_email VARCHAR(255) NOT NULL,
    ospite_telefono VARCHAR(50),
    data_checkin DATE NOT NULL,
    data_checkout DATE NOT NULL,
    numero_ospiti INTEGER NOT NULL,
    prezzo_totale DECIMAL(10, 2) NOT NULL,
    stato VARCHAR(50) DEFAULT 'pending',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella per i documenti contratto
CREATE TABLE IF NOT EXISTS portale.contratti (
    id SERIAL PRIMARY KEY,
    prenotazione_id INTEGER REFERENCES portale.prenotazioni(id),
    documento_url VARCHAR(500),
    firmato BOOLEAN DEFAULT false,
    data_firma TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX idx_prenotazioni_date ON portale.prenotazioni(data_checkin, data_checkout);
CREATE INDEX idx_prenotazioni_alloggio ON portale.prenotazioni(alloggio_id);
CREATE INDEX idx_foto_alloggio ON portale.foto_alloggi(alloggio_id);

-- Trigger per update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_alloggi_updated_at BEFORE UPDATE ON portale.alloggi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prenotazioni_updated_at BEFORE UPDATE ON portale.prenotazioni
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();