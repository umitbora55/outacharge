import pandas as pd
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class ExcelParser:
    def __init__(self, config):
        self.config = config
    
    def parse_file(self, file_path):
        logger.info(f"Parsing file: {file_path}")
        
        # Detect engine
        engine = 'xlrd' if file_path.suffix == '.xls' else 'openpyxl'
        
        # Read Excel
        df = pd.read_excel(file_path, engine=engine, header=None)
        logger.info(f"Read {len(df)} rows, {len(df.columns)} columns")
        
        # Find header row
        header_row_idx = None
        for idx, row in df.iterrows():
            if any('İstasyon No' in str(val) for val in row.values if pd.notna(val)):
                header_row_idx = idx
                break
        
        if header_row_idx is None:
            raise ValueError("Could not find header row")
        
        # Parse stations and connectors
        stations = []
        connectors = []
        current_station = None
        
        for idx in range(header_row_idx + 1, len(df)):
            row = df.iloc[idx]
            sira_no = row[0]
            
            # Station row (has Sıra No)
            if pd.notna(sira_no) and str(sira_no).strip():
                station = {
                    'station_no': self._safe_str(row[1]),
                    'station_name': self._safe_str(row[2]),
                    'service_type': self._safe_str(row[3]),
                    'brand': self._safe_str(row[4]),
                    'charge_network_operator': self._safe_str(row[5]),
                    'station_operator': self._safe_str(row[6]),
                    'is_green': self._safe_str(row[7]),
                    'address': self._safe_str(row[8]),
                    'source_file': file_path.name
                }
                if station['station_no']:
                    stations.append(station)
                    current_station = station
            
            # Connector row
            elif current_station and len(row) > 9:
                connector_no = self._safe_str(row[9])
                if connector_no and 'SKT' in connector_no:
                    connector = {
                        'station_no': current_station['station_no'],
                        'connector_no': connector_no,
                        'connector_type': self._safe_str(row[10]),
                        'connector_format': self._safe_str(row[11]),
                        'power_kw': self._safe_str(row[12]),
                        'source_file': file_path.name
                    }
                    connectors.append(connector)
        
        logger.info(f"Parsed {len(stations)} stations, {len(connectors)} connectors")
        return {'stations': stations, 'connectors': connectors}
    
    @staticmethod
    def _safe_str(value):
        if pd.isna(value):
            return None
        s = str(value).strip()
        return s if s else None
