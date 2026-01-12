-- Migration: 001_initial_schema
-- Description: EPDK charging stations and connectors schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create ENUM types
CREATE TYPE service_type_enum AS ENUM ('HALKA_ACIK', 'OZEL');
CREATE TYPE connector_type_enum AS ENUM ('AC', 'DC');
CREATE TYPE connector_format_enum AS ENUM (
    'AC_TYPE1', 'AC_TYPE2', 'AC_TYPE2_SOCKET', 'AC_TYPE2_CABLE',
    'DC_CCS', 'DC_CHADEMO', 'DC_GBT', 'OTHER'
);

-- Stations table
CREATE TABLE stations (
    id BIGSERIAL PRIMARY KEY,
    station_no VARCHAR(50) NOT NULL UNIQUE,
    station_name VARCHAR(500) NOT NULL,
    service_type service_type_enum NOT NULL DEFAULT 'HALKA_ACIK',
    brand VARCHAR(200),
    charge_network_operator TEXT,
    station_operator TEXT,
    is_green BOOLEAN DEFAULT FALSE,
    address TEXT NOT NULL,
    city VARCHAR(100),
    district VARCHAR(100),
    location GEOMETRY(POINT, 4326),
    source_file VARCHAR(255),
    ingestion_batch_id UUID,
    data_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Connectors table
CREATE TABLE connectors (
    id BIGSERIAL PRIMARY KEY,
    station_id BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    connector_no VARCHAR(50) NOT NULL UNIQUE,
    connector_type connector_type_enum NOT NULL,
    connector_format connector_format_enum NOT NULL,
    power_kw NUMERIC(8, 2) NOT NULL,
    source_file VARCHAR(255),
    ingestion_batch_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_power_range CHECK (power_kw > 0 AND power_kw <= 500)
);

-- Indexes
CREATE INDEX idx_stations_brand ON stations(brand);
CREATE INDEX idx_stations_city ON stations(city);
CREATE INDEX idx_stations_district ON stations(district);
CREATE INDEX idx_connectors_station_id ON connectors(station_id);
CREATE INDEX idx_connectors_type ON connectors(connector_type);
CREATE INDEX idx_connectors_power ON connectors(power_kw);

-- Ingestion tracking
CREATE TABLE ingestion_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    files_processed INTEGER DEFAULT 0,
    stations_inserted INTEGER DEFAULT 0,
    stations_updated INTEGER DEFAULT 0,
    connectors_inserted INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0
);

CREATE TABLE ingestion_errors (
    id BIGSERIAL PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES ingestion_batches(id),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_file VARCHAR(255) NOT NULL,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    raw_data JSONB
);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stations_updated_at
    BEFORE UPDATE ON stations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_connectors_updated_at
    BEFORE UPDATE ON connectors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
