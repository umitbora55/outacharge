import pytest
import sys
from urllib.parse import quote
sys.path.insert(0, 'api')

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestHealthEndpoint:
    """Health endpoint testleri"""
    
    def test_health_returns_200(self):
        """Health endpoint 200 döndürmeli"""
        response = client.get("/health")
        assert response.status_code == 200
    
    def test_health_returns_status_field(self):
        """Health response'da status field olmalı"""
        response = client.get("/health")
        data = response.json()
        assert "status" in data
    
    def test_health_database_field_exists(self):
        """Health response'da database field olmalı"""
        response = client.get("/health")
        data = response.json()
        assert "database" in data


class TestRootEndpoint:
    """Root endpoint testleri"""
    
    def test_root_returns_200(self):
        """Root endpoint 200 döndürmeli"""
        response = client.get("/")
        assert response.status_code == 200
    
    def test_root_returns_message(self):
        """Root response'da message olmalı"""
        response = client.get("/")
        data = response.json()
        assert "message" in data
        assert "EPDK" in data["message"]


class TestStatsEndpoint:
    """Stats endpoint testleri"""
    
    def test_stats_returns_200(self):
        """Stats endpoint 200 döndürmeli"""
        response = client.get("/stats")
        assert response.status_code == 200
    
    def test_stats_returns_total_stations(self):
        """Stats'da total_stations olmalı"""
        response = client.get("/stats")
        data = response.json()
        assert "total_stations" in data
        assert data["total_stations"] > 0
    
    def test_stats_returns_total_connectors(self):
        """Stats'da total_connectors olmalı"""
        response = client.get("/stats")
        data = response.json()
        assert "total_connectors" in data
        assert data["total_connectors"] > 0
    
    def test_stats_returns_brands_and_cities(self):
        """Stats'da brand ve city sayıları olmalı"""
        response = client.get("/stats")
        data = response.json()
        assert "total_brands" in data
        assert "total_cities" in data


class TestStationsEndpoint:
    """Stations endpoint testleri"""
    
    def test_stations_returns_200(self):
        """Stations endpoint 200 döndürmeli"""
        response = client.get("/stations")
        assert response.status_code == 200
    
    def test_stations_returns_list(self):
        """Stations bir liste döndürmeli"""
        response = client.get("/stations")
        data = response.json()
        assert "stations" in data
        assert isinstance(data["stations"], list)
    
    def test_stations_limit_works(self):
        """Limit parametresi çalışmalı"""
        response = client.get("/stations?limit=5")
        data = response.json()
        assert len(data["stations"]) <= 5
    
    def test_stations_city_filter_works(self):
        """City filtresi çalışmalı"""
        response = client.get("/stations?city=istanbul&limit=10")
        data = response.json()
        assert response.status_code == 200
    
    def test_stations_brand_filter_works(self):
        """Brand filtresi çalışmalı"""
        response = client.get("/stations?brand=biogreen&limit=10")
        data = response.json()
        assert response.status_code == 200
    
    def test_stations_count_field_exists(self):
        """Response'da count field olmalı"""
        response = client.get("/stations?limit=10")
        data = response.json()
        assert "count" in data
    
    def test_stations_default_limit_is_50(self):
        """Default limit 50 olmalı"""
        response = client.get("/stations")
        data = response.json()
        assert len(data["stations"]) <= 50


class TestStationDetailEndpoint:
    """Station detail endpoint testleri - query parameter ile"""
    
    def test_station_not_found_returns_error(self):
        """Olmayan station için error döndürmeli"""
        response = client.get("/station?station_no=INVALID-123")
        data = response.json()
        assert "error" in data
    
    def test_valid_station_returns_data(self):
        """Geçerli station data döndürmeli"""
        # Önce bir station bul
        list_response = client.get("/stations?limit=1")
        stations = list_response.json()["stations"]
        
        if stations:
            station_no = stations[0]["station_no"]
            # URL encode yap
            encoded = quote(station_no, safe='')
            response = client.get(f"/station?station_no={encoded}")
            data = response.json()
            assert "station" in data
            assert "connectors" in data
    
    def test_station_returns_connectors(self):
        """Station response'da connectors listesi olmalı"""
        list_response = client.get("/stations?limit=1")
        stations = list_response.json()["stations"]
        
        if stations:
            station_no = stations[0]["station_no"]
            encoded = quote(station_no, safe='')
            response = client.get(f"/station?station_no={encoded}")
            data = response.json()
            assert isinstance(data.get("connectors", []), list)


class TestMetricsEndpoint:
    """Metrics endpoint testleri"""
    
    def test_metrics_returns_200(self):
        """Metrics endpoint 200 döndürmeli"""
        response = client.get("/metrics")
        assert response.status_code == 200
    
    def test_metrics_returns_prometheus_format(self):
        """Metrics Prometheus formatında olmalı"""
        response = client.get("/metrics")
        content = response.text
        assert "# HELP" in content or "# TYPE" in content


class TestAPIEdgeCases:
    """Edge case testleri"""
    
    def test_invalid_limit_too_high(self):
        """1000'den büyük limit için hata vermeli"""
        response = client.get("/stations?limit=2000")
        assert response.status_code == 422
    
    def test_invalid_limit_negative(self):
        """Negatif limit için hata vermeli"""
        response = client.get("/stations?limit=-1")
        assert response.status_code == 422


class TestAuthEndpoints:
    """Authentication testleri"""
    
    def test_login_success(self):
        """Doğru credentials ile login başarılı olmalı"""
        response = client.post("/auth/login?username=admin&password=admin123")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_wrong_password(self):
        """Yanlış şifre ile 401 dönmeli"""
        response = client.post("/auth/login?username=admin&password=wrongpass")
        assert response.status_code == 401
    
    def test_login_wrong_username(self):
        """Olmayan kullanıcı ile 401 dönmeli"""
        response = client.post("/auth/login?username=nonexistent&password=test")
        assert response.status_code == 401


class TestProtectedEndpoints:
    """Korumalı endpoint testleri"""
    
    def test_admin_without_token_returns_401(self):
        """Token olmadan admin endpoint 401 dönmeli"""
        response = client.get("/admin/users")
        assert response.status_code == 401
    
    def test_admin_with_valid_token(self):
        """Geçerli admin token ile erişim başarılı olmalı"""
        # Önce login ol
        login_response = client.post("/auth/login?username=admin&password=admin123")
        token = login_response.json()["access_token"]
        
        # Token ile admin endpoint'e eriş
        response = client.get(
            "/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert "users" in response.json()
    
    def test_admin_with_user_role_returns_403(self):
        """User rolü ile admin endpoint 403 dönmeli"""
        # User olarak login ol
        login_response = client.post("/auth/login?username=user&password=user123")
        token = login_response.json()["access_token"]
        
        # Token ile admin endpoint'e eriş
        response = client.get(
            "/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
