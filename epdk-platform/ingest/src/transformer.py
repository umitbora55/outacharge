import re
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

class DataTransformer:
    SERVICE_TYPE_MAP = {
        'HALKA_ACIK': 'HALKA_ACIK',
        'HALKA ACIK': 'HALKA_ACIK',
        'OZEL': 'OZEL',
        'ÖZEL': 'OZEL'
    }
    
    def __init__(self, config):
        self.config = config
    
    def transform(self, raw_data, source_file):
        stations = [self._transform_station(s) for s in raw_data['stations']]
        connectors = [self._transform_connector(c) for c in raw_data['connectors']]
        
        valid_stations = [s for s in stations if s and s.get('station_no')]
        valid_connectors = [c for c in connectors if c and c.get('connector_no')]
        
        logger.info(f"Transformed {len(valid_stations)} stations, {len(valid_connectors)} connectors")
        
        return {'stations': valid_stations, 'connectors': valid_connectors}
    
    def _transform_station(self, station):
        if not station.get('station_no'):
            return None
        
        service_type = station.get('service_type', '').upper().strip()
        service_type = self.SERVICE_TYPE_MAP.get(service_type, 'HALKA_ACIK')
        
        address = station.get('address', '')
        city, district = self._parse_address(address)
        
        data_hash = hashlib.md5(
            json.dumps(station, sort_keys=True).encode('utf-8')
        ).hexdigest()
        
        return {
            'station_no': station['station_no'],
            'station_name': station.get('station_name', ''),
            'service_type': service_type,
            'brand': station.get('brand'),
            'charge_network_operator': station.get('charge_network_operator'),
            'station_operator': station.get('station_operator'),
            'is_green': False,
            'address': address,
            'city': city,
            'district': district,
            'source_file': station.get('source_file'),
            'data_hash': data_hash
        }
    
    def _transform_connector(self, connector):
        if not connector.get('connector_no'):
            return None
        
        power_kw = self._parse_power(connector.get('power_kw'))
        if not power_kw or power_kw <= 0:
            return None
        
        connector_type = connector.get('connector_type', 'AC').upper()
        connector_format = connector.get('connector_format', 'AC_TYPE2').upper().replace(' ', '_')
        
        return {
            'station_no': connector['station_no'],
            'connector_no': connector['connector_no'],
            'connector_type': connector_type,
            'connector_format': connector_format,
            'power_kw': power_kw,
            'source_file': connector.get('source_file')
        }
    
    @staticmethod
    def _parse_power(power):
        if not power:
            return None
        if isinstance(power, (int, float)):
            return float(power)
        
        power_str = str(power).upper().strip()
        power_str = re.sub(r'\s*KW\s*$', '', power_str, flags=re.IGNORECASE)
        power_str = power_str.replace(',', '.')
        
        match = re.search(r'(\d+\.?\d*)', power_str)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                return None
        return None
    
    def _parse_address(self, address):
        if not address:
            return None, None
        
        match = re.search(r'/\s*([A-ZİŞĞÜÖÇ]+)\s*$', address.upper())
        if match:
            city = match.group(1).strip()
            district_match = re.search(r'([A-Za-zİşğüöçĞÜÖÇİŞ]+)\s*/\s*' + re.escape(city), address)
            if district_match:
                district = district_match.group(1).strip()
                return city, district
            return city, None
        
        return None, None
