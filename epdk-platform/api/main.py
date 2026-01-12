from fastapi import FastAPI, Query, Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import psycopg2
from psycopg2.extras import RealDictCursor
from jose import JWTError, jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import structlog
import hashlib
import uuid
import time
import os

# Load environment variables
load_dotenv()

# Structured logging setup
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger("api")

# Environment variables
DATABASE_DSN = os.getenv('DATABASE_DSN', 'postgresql://postgres:postgres123@localhost:5432/epdk_charging_stations')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-secret-key')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', '30'))
RATE_LIMIT = os.getenv('RATE_LIMIT_PER_MINUTE', '100')

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)

# Security
security = HTTPBearer(auto_error=False)

# Simple password hashing (production'da bcrypt kullan)
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

# Demo users
DEMO_USERS = {
    "admin": {
        "username": "admin",
        "hashed_password": hash_password("admin123"),
        "role": "admin"
    },
    "user": {
        "username": "user",
        "hashed_password": hash_password("user123"),
        "role": "user"
    }
}

app = FastAPI(
    title=os.getenv('API_TITLE', 'EPDK Charging Stations API'),
    version=os.getenv('API_VERSION', '1.0.0')
)

# Rate limit handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Prometheus metrics
Instrumentator().instrument(app).expose(app)


# ============== AUTH HELPERS ==============

def create_access_token(data: dict):
    """JWT token oluştur"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """JWT token doğrula"""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def optional_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Opsiyonel authentication"""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


# ============== MIDDLEWARE ==============

@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    
    logger.info("request_started",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        client_ip=request.client.host if request.client else "unknown"
    )
    
    response = await call_next(request)
    
    duration_ms = (time.time() - start_time) * 1000
    logger.info("request_completed",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round(duration_ms, 2)
    )
    
    return response


# ============== PUBLIC ENDPOINTS ==============

@app.get("/")
def root():
    return {"message": "EPDK Charging Stations API", "version": "1.0"}

@app.get("/health")
def health():
    try:
        conn = psycopg2.connect(DATABASE_DSN)
        conn.close()
        logger.info("health_check", status="healthy", database="connected")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error("health_check", status="unhealthy", error=str(e))
        return {"status": "unhealthy", "database": "disconnected"}

@app.post("/auth/login")
@limiter.limit("10/minute")
def login(request: Request, username: str = Query(...), password: str = Query(...)):
    """Login ve JWT token al"""
    logger.info("login_attempt", username=username)
    
    user = DEMO_USERS.get(username)
    if not user or not verify_password(password, user["hashed_password"]):
        logger.warning("login_failed", username=username)
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    access_token = create_access_token(data={"sub": username, "role": user["role"]})
    logger.info("login_success", username=username)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": JWT_EXPIRE_MINUTES * 60
    }


# ============== RATE LIMITED PUBLIC ENDPOINTS ==============

@app.get("/stats")
@limiter.limit(f"{RATE_LIMIT}/minute")
def stats(request: Request):
    logger.info("stats_requested")
    conn = psycopg2.connect(DATABASE_DSN)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT COUNT(*) as total FROM stations")
    total_stations = cursor.fetchone()['total']
    
    cursor.execute("SELECT COUNT(*) as total FROM connectors")
    total_connectors = cursor.fetchone()['total']
    
    cursor.execute("SELECT COUNT(DISTINCT brand) as total FROM stations WHERE brand IS NOT NULL")
    total_brands = cursor.fetchone()['total']
    
    cursor.execute("SELECT COUNT(DISTINCT city) as total FROM stations WHERE city IS NOT NULL")
    total_cities = cursor.fetchone()['total']
    
    cursor.close()
    conn.close()
    
    return {
        "total_stations": total_stations,
        "total_connectors": total_connectors,
        "total_brands": total_brands,
        "total_cities": total_cities
    }

@app.get("/stations")
@limiter.limit(f"{RATE_LIMIT}/minute")
def list_stations(
    request: Request,
    city: str = Query(None),
    brand: str = Query(None),
    limit: int = Query(50, ge=1, le=1000)
):
    logger.info("stations_list_requested", city=city, brand=brand, limit=limit)
    
    conn = psycopg2.connect(DATABASE_DSN)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    query = "SELECT station_no, station_name, brand, city, address FROM stations WHERE 1=1"
    params = []
    
    if city:
        query += " AND city ILIKE %s"
        params.append(f"%{city}%")
    
    if brand:
        query += " AND brand ILIKE %s"
        params.append(f"%{brand}%")
    
    query += f" LIMIT {limit}"
    
    cursor.execute(query, params)
    results = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {"count": len(results), "stations": results}


# ============== STATION DETAIL ENDPOINTS ==============

@app.get("/station")
@limiter.limit(f"{RATE_LIMIT}/minute")
def get_station(
    request: Request,
    station_no: str = Query(..., description="Station numarası")
):
    """Tek istasyon detayı"""
    logger.info("station_detail_requested", station_no=station_no)
    
    conn = psycopg2.connect(DATABASE_DSN)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT * FROM stations WHERE station_no = %s", (station_no,))
    station = cursor.fetchone()
    
    if not station:
        logger.warning("station_not_found", station_no=station_no)
        cursor.close()
        conn.close()
        return {"error": "Station not found", "station_no": station_no}
    
    cursor.execute("SELECT * FROM connectors WHERE station_id = %s", (station['id'],))
    connectors = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {"station": dict(station), "connectors": [dict(c) for c in connectors]}

@app.get("/stations/{station_no:path}")
@limiter.limit(f"{RATE_LIMIT}/minute")
def get_station_by_path(request: Request, station_no: str):
    """Backward compatible endpoint"""
    conn = psycopg2.connect(DATABASE_DSN)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT * FROM stations WHERE station_no = %s", (station_no,))
    station = cursor.fetchone()
    
    if not station:
        cursor.close()
        conn.close()
        return {"error": "Station not found", "station_no": station_no}
    
    cursor.execute("SELECT * FROM connectors WHERE station_id = %s", (station['id'],))
    connectors = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {"station": dict(station), "connectors": [dict(c) for c in connectors]}


# ============== PROTECTED ENDPOINTS ==============

@app.get("/admin/users")
@limiter.limit("30/minute")
def list_users(request: Request, auth: dict = Depends(verify_token)):
    """Admin endpoint - sadece admin rolü erişebilir"""
    if auth.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logger.info("admin_users_requested", by_user=auth.get("sub"))
    return {
        "users": [
            {"username": u, "role": d["role"]} 
            for u, d in DEMO_USERS.items()
        ]
    }
