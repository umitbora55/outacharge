import psycopg2
from psycopg2.extras import RealDictCursor
import requests
import time
import os

DATABASE_DSN = os.getenv('DATABASE_DSN', 'postgresql://postgres:postgres123@localhost:5432/epdk_charging_stations')

def geocode_address(address, city):
    """Adresi koordinata cevir (Nominatim API)"""
    try:
        # Adresi temizle ve formatla
        full_address = f"{address}, {city}, Turkey"
        
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": full_address,
            "format": "json",
            "limit": 1,
            "countrycodes": "tr"
        }
        headers = {
            "User-Agent": "EPDK-Charging-Stations-App/1.0"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        data = response.json()
        
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
        return None, None
    except Exception as e:
        print(f"Geocoding error: {e}")
        return None, None

def update_station_location(cursor, station_id, lat, lon):
    """Istasyon koordinatini guncelle"""
    cursor.execute("""
        UPDATE stations 
        SET location = ST_SetSRID(ST_MakePoint(%s, %s), 4326)
        WHERE id = %s
    """, (lon, lat, station_id))

def main():
    conn = psycopg2.connect(DATABASE_DSN)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Koordinati olmayan istasyonlari al
    cursor.execute("""
        SELECT id, station_no, address, city 
        FROM stations 
        WHERE location IS NULL 
        AND address IS NOT NULL
        LIMIT 100
    """)
    
    stations = cursor.fetchall()
    total = len(stations)
    success = 0
    failed = 0
    
    print(f"Geocoding basliyor: {total} istasyon")
    print("-" * 50)
    
    for i, station in enumerate(stations):
        lat, lon = geocode_address(station['address'], station['city'])
        
        if lat and lon:
            update_station_location(cursor, station['id'], lat, lon)
            conn.commit()
            success += 1
            print(f"[{i+1}/{total}] OK: {station['station_no']} -> {lat:.4f}, {lon:.4f}")
        else:
            failed += 1
            print(f"[{i+1}/{total}] FAIL: {station['station_no']}")
        
        # Rate limit: 1 request/second (Nominatim kurali)
        time.sleep(1.1)
    
    print("-" * 50)
    print(f"Tamamlandi: {success} basarili, {failed} basarisiz")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
