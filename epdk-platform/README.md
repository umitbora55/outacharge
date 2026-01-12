# EPDK Charging Stations Platform

Turkiye'deki elektrikli arac sarj istasyonlarinin REST API platformu.

## Ozellikler

- **13,440+ sarj istasyonu** verisi
- **36,665+ connector** bilgisi
- **REST API** ile sorgulama
- **JWT Authentication** ile guvenlik
- **Rate Limiting** ile DDoS korumasi
- **Prometheus + Grafana** ile monitoring
- **%82 test coverage**
- **CI/CD Pipeline** ile otomasyon

## Hizli Baslangic

### Gereksinimler
- Docker & Docker Compose
- Python 3.9+

### Kurulum
```bash
# Repoyu klonla
git clone <repo-url>
cd epdk-platform

# Docker servislerini baslat
docker compose up -d

# API'yi baslat
cd api
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

### API Endpoints

| Endpoint | Method | Aciklama |
|----------|--------|----------|
| `/health` | GET | Sistem durumu |
| `/stats` | GET | Istatistikler |
| `/stations` | GET | Istasyon listesi |
| `/station?station_no=X` | GET | Istasyon detayi |
| `/auth/login` | POST | JWT token al |
| `/admin/users` | GET | Admin - kullanici listesi |

### Ornek Istekler
```bash
# Istatistikler
curl http://localhost:8000/stats

# Istanbul'daki istasyonlar
curl "http://localhost:8000/stations?city=istanbul&limit=10"

# Login
curl -X POST "http://localhost:8000/auth/login?username=admin&password=admin123"

# Token ile admin endpoint
curl -H "Authorization: Bearer <token>" http://localhost:8000/admin/users
```

## Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin123)

## Test
```bash
# Testleri calistir
python -m pytest tests/ -v

# Coverage raporu
python -m pytest tests/ --cov=api --cov-report=term-missing
```

## Proje Yapisi
```
epdk-platform/
├── api/
│   └── main.py              # FastAPI uygulamasi
├── tests/
│   └── test_api.py          # 29 test
├── monitoring/
│   ├── prometheus.yml       # Prometheus config
│   ├── alert_rules.yml      # Alert kurallari
│   └── grafana/             # Grafana dashboards
├── .github/
│   └── workflows/
│       └── ci.yml           # CI/CD pipeline
├── docker-compose.yml       # Docker servisleri
├── Dockerfile               # API container
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables
└── .gitignore
```

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Database | PostgreSQL 16 + PostGIS |
| API | FastAPI |
| Auth | JWT (python-jose) |
| Rate Limit | SlowAPI |
| Monitoring | Prometheus + Grafana |
| Logging | structlog (JSON) |
| Testing | pytest (%82 coverage) |
| CI/CD | GitHub Actions |
| Container | Docker |

## Lisans

MIT
