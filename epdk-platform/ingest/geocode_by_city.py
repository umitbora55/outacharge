import psycopg2
from psycopg2.extras import RealDictCursor
import os

DATABASE_DSN = os.getenv('DATABASE_DSN', 'postgresql://postgres:postgres123@localhost:5432/epdk_charging_stations')

# Turkiye illeri merkez koordinatlari
CITY_COORDINATES = {
    "ADANA": (37.0000, 35.3213),
    "ADIYAMAN": (37.7648, 38.2786),
    "AFYONKARAHISAR": (38.7507, 30.5567),
    "AGRI": (39.7191, 43.0503),
    "AKSARAY": (38.3687, 34.0370),
    "AMASYA": (40.6499, 35.8353),
    "ANKARA": (39.9334, 32.8597),
    "ANTALYA": (36.8969, 30.7133),
    "ARDAHAN": (41.1105, 42.7022),
    "ARTVIN": (41.1828, 41.8183),
    "AYDIN": (37.8560, 27.8416),
    "BALIKESIR": (39.6484, 27.8826),
    "BARTIN": (41.6344, 32.3375),
    "BATMAN": (37.8812, 41.1351),
    "BAYBURT": (40.2552, 40.2249),
    "BILECIK": (40.0567, 30.0665),
    "BINGOL": (38.8854, 40.4966),
    "BITLIS": (38.3938, 42.1232),
    "BOLU": (40.7392, 31.6089),
    "BURDUR": (37.4613, 30.0665),
    "BURSA": (40.1826, 29.0665),
    "CANAKKALE": (40.1553, 26.4142),
    "CANKIRI": (40.6013, 33.6134),
    "CORUM": (40.5506, 34.9556),
    "DENIZLI": (37.7765, 29.0864),
    "DIYARBAKIR": (37.9144, 40.2306),
    "DUZCE": (40.8438, 31.1565),
    "EDIRNE": (41.6818, 26.5623),
    "ELAZIG": (38.6810, 39.2264),
    "ERZINCAN": (39.7500, 39.5000),
    "ERZURUM": (39.9000, 41.2700),
    "ESKISEHIR": (39.7767, 30.5206),
    "GAZIANTEP": (37.0662, 37.3833),
    "GIRESUN": (40.9128, 38.3895),
    "GUMUSHANE": (40.4386, 39.5086),
    "HAKKARI": (37.5833, 43.7333),
    "HATAY": (36.4018, 36.3498),
    "IGDIR": (39.9167, 44.0333),
    "ISPARTA": (37.7648, 30.5566),
    "ISTANBUL": (41.0082, 28.9784),
    "IZMIR": (38.4192, 27.1287),
    "KAHRAMANMARAS": (37.5858, 36.9371),
    "KARABUK": (41.2061, 32.6204),
    "KARAMAN": (37.1759, 33.2287),
    "KARS": (40.6167, 43.1000),
    "KASTAMONU": (41.3887, 33.7827),
    "KAYSERI": (38.7312, 35.4787),
    "KILIS": (36.7184, 37.1212),
    "KIRIKKALE": (39.8468, 33.5153),
    "KIRKLARELI": (41.7333, 27.2167),
    "KIRSEHIR": (39.1425, 34.1709),
    "KOCAELI": (40.8533, 29.8815),
    "KONYA": (37.8667, 32.4833),
    "KUTAHYA": (39.4167, 29.9833),
    "MALATYA": (38.3552, 38.3095),
    "MANISA": (38.6191, 27.4289),
    "MARDIN": (37.3212, 40.7245),
    "MERSIN": (36.8000, 34.6333),
    "MUGLA": (37.2153, 28.3636),
    "MUS": (38.9462, 41.7539),
    "NEVSEHIR": (38.6939, 34.6857),
    "NIGDE": (37.9667, 34.6833),
    "ORDU": (40.9839, 37.8764),
    "OSMANIYE": (37.0742, 36.2478),
    "RIZE": (41.0201, 40.5234),
    "SAKARYA": (40.6940, 30.4358),
    "SAMSUN": (41.2867, 36.3300),
    "SANLIURFA": (37.1591, 38.7969),
    "SIIRT": (37.9333, 41.9500),
    "SINOP": (42.0231, 35.1531),
    "SIRNAK": (37.5164, 42.4611),
    "SIVAS": (39.7477, 37.0179),
    "TEKIRDAG": (40.9833, 27.5167),
    "TOKAT": (40.3167, 36.5500),
    "TRABZON": (41.0015, 39.7178),
    "TUNCELI": (39.1079, 39.5401),
    "USAK": (38.6823, 29.4082),
    "VAN": (38.4891, 43.4089),
    "YALOVA": (40.6500, 29.2667),
    "YOZGAT": (39.8181, 34.8147),
    "ZONGULDAK": (41.4564, 31.7987),
}

def normalize_city(city):
    """Sehir adini normalize et"""
    if not city:
        return None
    # Turkce karakterleri degistir
    replacements = {
        'İ': 'I', 'ı': 'I', 'Ş': 'S', 'ş': 'S',
        'Ğ': 'G', 'ğ': 'G', 'Ü': 'U', 'ü': 'U',
        'Ö': 'O', 'ö': 'O', 'Ç': 'C', 'ç': 'C'
    }
    result = city.upper().strip()
    for tr, en in replacements.items():
        result = result.replace(tr, en)
    return result

def main():
    conn = psycopg2.connect(DATABASE_DSN)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Koordinati olmayan istasyonlari al
    cursor.execute("""
        SELECT id, station_no, city 
        FROM stations 
        WHERE location IS NULL 
        AND city IS NOT NULL
    """)
    
    stations = cursor.fetchall()
    total = len(stations)
    success = 0
    failed = 0
    
    print(f"Il bazli geocoding basliyor: {total} istasyon")
    print("-" * 50)
    
    for i, station in enumerate(stations):
        normalized = normalize_city(station['city'])
        coords = CITY_COORDINATES.get(normalized)
        
        if coords:
            lat, lon = coords
            # Kucuk rastgele offset ekle (ayni noktada ust uste binmesin)
            import random
            lat += random.uniform(-0.05, 0.05)
            lon += random.uniform(-0.05, 0.05)
            
            cursor.execute("""
                UPDATE stations 
                SET location = ST_SetSRID(ST_MakePoint(%s, %s), 4326)
                WHERE id = %s
            """, (lon, lat, station['id']))
            success += 1
        else:
            failed += 1
            if i < 20:  # Sadece ilk 20 hatayi goster
                print(f"Bilinmeyen il: {station['city']} -> {normalized}")
        
        if (i + 1) % 1000 == 0:
            conn.commit()
            print(f"Ilerleme: {i+1}/{total} ({success} basarili)")
    
    conn.commit()
    print("-" * 50)
    print(f"Tamamlandi: {success} basarili, {failed} basarisiz")
    
    # Sonuclari kontrol et
    cursor.execute("SELECT COUNT(*) as c FROM stations WHERE location IS NOT NULL")
    with_location = cursor.fetchone()['c']
    print(f"Koordinatli istasyon sayisi: {with_location}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
