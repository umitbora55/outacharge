from fastapi import FastAPI, Query, Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
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

load_dotenv()

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

DATABASE_DSN = os.getenv('DATABASE_DSN', 'postgresql://postgres:postgres123@localhost:5432/epdk_charging_stations')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-secret-key')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', '30'))
RATE_LIMIT = os.getenv('RATE_LIMIT_PER_MINUTE', '100')

limiter = Limiter(key_func=get_remote_address)
security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

DEMO_USERS = {
    "admin": {"username": "admin", "hashed_password": hash_password("admin123"), "role": "admin"},
    "user": {"username": "user", "hashed_password": hash_password("user123"), "role": "user"}
}

app = FastAPI(title=os.getenv('API_TITLE', 'EPDK Charging Stations API'), version=os.getenv('API_VERSION', '1.0.0'))

# CORS - Frontend'in API'ye erisimi icin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
Instrumentator().instrument(app).expose(app)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("sub") is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    logger.info("request_started", request_id=request_id, method=request.method, path=request.url.path)
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000
    logger.info("request_completed", request_id=request_id, status_code=response.status_code, duration_ms=round(duration_ms, 2))
    return response

@app.get("/")
def root():
    return {"message": "EPDK Charging Stations API", "version": "1.0"}

@app.get("/health")
def health():
    try:
        conn = psycopg2.connect(DATABASE_DSN)
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected"}

@app.post("/auth/login")
@limiter.limit("10/minute")
def login(request: Request, username: str = Query(...), password: str = Query(...)):
    user = DEMO_USERS.get(username)
    if not user or not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    access_token = create_access_token(data={"sub": username, "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer", "expires_in": JWT_EXPIRE_MINUTES * 60}

@app.get("/stats")
@limiter.limit(f"{RATE_LIMIT}/minute")
def stats(request: Request):
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
    return {"total_stations": total_stations, "total_connectors": total_connectors, "total_brands": total_brands, "total_cities": total_cities}

@app.get("/map/stations")
@limiter.limit(f"{RATE_LIMIT}/minute")
def get_stations_for_map(request: Request, city: str = Query(None), brand: str = Query(None), limit: int = Query(1000, ge=1, le=5000)):
    conn = psycopg2.connect(DATABASE_DSN)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    query = """
        SELECT station_no, station_name, brand, city, address,
               ST_Y(location) as lat, ST_X(location) as lng
        FROM stations WHERE location IS NOT NULL
    """
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
    return {"count": len(results), "stations": [dict(r) for r in results]}

@app.get("/map/cities")
@limiter.limit(f"{RATE_LIMIT}/minute")
def get_city_stats(request: Request):
    conn = psycopg2.connect(DATABASE_DSN)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT city, COUNT(*) as station_count,
               AVG(ST_Y(location)) as lat, AVG(ST_X(location)) as lng
        FROM stations WHERE location IS NOT NULL AND city IS NOT NULL
        GROUP BY city ORDER BY station_count DESC
    """)
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"cities": [dict(r) for r in results]}

@app.get("/stations")
@limiter.limit(f"{RATE_LIMIT}/minute")
def list_stations(request: Request, city: str = Query(None), brand: str = Query(None), limit: int = Query(50, ge=1, le=1000)):
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

@app.get("/station")
@limiter.limit(f"{RATE_LIMIT}/minute")
def get_station(request: Request, station_no: str = Query(..., description="Station numarasi")):
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

@app.get("/admin/users")
@limiter.limit("30/minute")
def list_users(request: Request, auth: dict = Depends(verify_token)):
    if auth.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"users": [{"username": u, "role": d["role"]} for u, d in DEMO_USERS.items()]}
