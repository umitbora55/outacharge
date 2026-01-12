import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class DatabaseLoader:
    def __init__(self, config, batch_id):
        self.config = config
        self.batch_id = str(batch_id)  # Convert to string
        self.conn = None
        self.cursor = None
        
    def connect(self):
        self.conn = psycopg2.connect(self.config.database_dsn)
        self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        logger.info("Connected to database")
    
    def disconnect(self):
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
    
    def start_batch(self):
        query = """
            INSERT INTO ingestion_batches (id, started_at, status)
            VALUES (%s::uuid, %s, %s)
        """
        self.cursor.execute(query, (self.batch_id, datetime.now(), 'RUNNING'))
        self.conn.commit()
        logger.info(f"Started batch {self.batch_id}")
    
    def complete_batch(self, stats):
        query = """
            UPDATE ingestion_batches
            SET completed_at = %s, status = %s,
                files_processed = %s,
                stations_inserted = %s,
                stations_updated = %s,
                connectors_inserted = %s
            WHERE id = %s::uuid
        """
        self.cursor.execute(query, (
            datetime.now(), 'COMPLETED',
            stats.get('files_processed', 0),
            stats.get('stations_inserted', 0),
            stats.get('stations_updated', 0),
            stats.get('connectors_inserted', 0),
            self.batch_id
        ))
        self.conn.commit()
    
    def load_data(self, transformed_data):
        stations = transformed_data['stations']
        connectors = transformed_data['connectors']
        
        station_ids = {}
        stats = {
            'stations_inserted': 0,
            'stations_updated': 0,
            'connectors_inserted': 0
        }
        
        for station in stations:
            station_id, was_inserted = self._upsert_station(station)
            if station_id:
                station_ids[station['station_no']] = station_id
                if was_inserted:
                    stats['stations_inserted'] += 1
                else:
                    stats['stations_updated'] += 1
        
        for connector in connectors:
            station_id = station_ids.get(connector['station_no'])
            if station_id:
                if self._insert_connector(connector, station_id):
                    stats['connectors_inserted'] += 1
        
        self.conn.commit()
        return stats
    
    def _upsert_station(self, station):
        query = """
            INSERT INTO stations (
                station_no, station_name, service_type, brand,
                charge_network_operator, station_operator, is_green,
                address, city, district, source_file, ingestion_batch_id, data_hash
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::uuid, %s)
            ON CONFLICT (station_no) DO UPDATE SET
                station_name = EXCLUDED.station_name,
                service_type = EXCLUDED.service_type,
                brand = EXCLUDED.brand,
                updated_at = NOW()
            RETURNING id, (xmax = 0) AS was_inserted
        """
        
        self.cursor.execute(query, (
            station['station_no'],
            station['station_name'],
            station['service_type'],
            station.get('brand'),
            station.get('charge_network_operator'),
            station.get('station_operator'),
            station.get('is_green', False),
            station.get('address'),
            station.get('city'),
            station.get('district'),
            station.get('source_file'),
            self.batch_id,
            station.get('data_hash')
        ))
        
        result = self.cursor.fetchone()
        return result['id'], result['was_inserted']
    
    def _insert_connector(self, connector, station_id):
        query = """
            INSERT INTO connectors (
                station_id, connector_no, connector_type, connector_format,
                power_kw, source_file, ingestion_batch_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s::uuid)
            ON CONFLICT (connector_no) DO UPDATE SET
                power_kw = EXCLUDED.power_kw,
                updated_at = NOW()
        """
        
        try:
            self.cursor.execute(query, (
                station_id,
                connector['connector_no'],
                connector['connector_type'],
                connector['connector_format'],
                connector['power_kw'],
                connector.get('source_file'),
                self.batch_id
            ))
            return True
        except Exception as e:
            logger.error(f"Failed to insert connector: {e}")
            return False
