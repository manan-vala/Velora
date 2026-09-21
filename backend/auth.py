import re
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from config import JWT_EXPIRE_MINUTES, SECRET_KEY
from database import get_db
from db_models import User

ALGORITHM = "HS256"
BCRYPT_MAX_BYTES = 72  # bcrypt>=5 rejects longer input
USERNAME_RE = re.compile(r"^[a-z0-9._-]{3,32}$")

# Failed logins per username before it is locked for the rest of the window.
MAX_FAILED_LOGINS = 5
LOCKOUT_WINDOW_S = 15 * 60

# Checked against when the username doesn't exist, so both paths cost one bcrypt verify.
_DUMMY_HASH = bcrypt.hashpw(b"not-a-real-password", bcrypt.gensalt()).decode()


def normalize_username(value: str) -> str:
    return value.strip().lower()


class UserCreate(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def valid_username(cls, v: str) -> str:
        v = normalize_username(v)
        if not USERNAME_RE.fullmatch(v):
            raise ValueError("username must be 3-32 characters: letters, digits, '.', '_' or '-'")
        return v

    @field_validator("password")
    @classmethod
    def valid_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        if len(v.encode("utf-8")) > BCRYPT_MAX_BYTES:
            raise ValueError(f"password must be at most {BCRYPT_MAX_BYTES} bytes")
        return v


class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    username: str


class Me(BaseModel):
    username: str


class LoginThrottle:
    """In-memory failed-login counter per username (the API runs as a single process)."""

    def __init__(self, max_failures: int, window_s: float):
        self._max = max_failures
        self._window = window_s
        self._failures: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque:
        q = self._failures[key]
        while q and q[0] <= now - self._window:
            q.popleft()
        return q

    def retry_after(self, key: str) -> int:
        """Seconds until the username may try again, or 0 if it isn't locked."""
        with self._lock:
            now = time.monotonic()
            q = self._prune(key, now)
            if len(q) < self._max:
                return 0
            return max(1, int(q[0] + self._window - now) + 1)

    def failed(self, key: str) -> None:
        with self._lock:
            self._prune(key, time.monotonic()).append(time.monotonic())

    def succeeded(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)


login_throttle = LoginThrottle(MAX_FAILED_LOGINS, LOCKOUT_WINDOW_S)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    secret = plain_password.encode("utf-8")
    if len(secret) > BCRYPT_MAX_BYTES:
        return False
    return bcrypt.checkpw(secret, hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(username: str) -> Token:
    now = datetime.now(timezone.utc)
    expires = timedelta(minutes=JWT_EXPIRE_MINUTES)
    claims = {"sub": username, "iat": now, "exp": now + expires}
    return Token(
        access_token=jwt.encode(claims, SECRET_KEY, algorithm=ALGORITHM),
        token_type="bearer",
        expires_in=int(expires.total_seconds()),
        username=username,
    )


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise credentials_exception
    username = payload.get("sub")
    if not isinstance(username, str):
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=409, detail="That username is already taken.")

    db.add(User(username=user.username, hashed_password=get_password_hash(user.password)))
    db.commit()
    return create_access_token(user.username)


@router.post("/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    username = normalize_username(form_data.username)

    retry_after = login_throttle.retry_after(username)
    if retry_after:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )

    user = db.query(User).filter(User.username == username).first()
    valid = verify_password(form_data.password, user.hashed_password if user else _DUMMY_HASH)
    if not user or not valid:
        login_throttle.failed(username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    login_throttle.succeeded(username)
    return create_access_token(user.username)


@router.get("/me", response_model=Me)
def read_me(user: User = Depends(get_current_user)):
    return Me(username=user.username)
