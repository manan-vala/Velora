import logging
import re
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import JWT_EXPIRE_MINUTES, SECRET_KEY, SUPERADMIN_PASSWORD, SUPERADMIN_USERNAME
from database import SessionLocal, get_db
from db_models import User

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
BCRYPT_MAX_BYTES = 72  # bcrypt>=5 rejects longer input
USERNAME_RE = re.compile(r"^[a-z0-9._-]{3,32}$")
GENERATED_PASSWORD_BYTES = 12  # ~16 characters of base64url

# Failed logins per username before it is locked for the rest of the window.
MAX_FAILED_LOGINS = 5
LOCKOUT_WINDOW_S = 15 * 60

# Checked against when the username doesn't exist, so both paths cost one bcrypt verify.
_DUMMY_HASH = bcrypt.hashpw(b"not-a-real-password", bcrypt.gensalt()).decode()


def normalize_username(value: str) -> str:
    return value.strip().lower()


def generate_password() -> str:
    return secrets.token_urlsafe(GENERATED_PASSWORD_BYTES)


class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    username: str
    is_admin: bool


class Me(BaseModel):
    username: str
    is_admin: bool


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


def create_access_token(user: User) -> Token:
    now = datetime.now(timezone.utc)
    expires = timedelta(minutes=JWT_EXPIRE_MINUTES)
    claims = {"sub": user.username, "iat": now, "exp": now + expires, "ver": user.token_version or 0}
    return Token(
        access_token=jwt.encode(claims, SECRET_KEY, algorithm=ALGORITHM),
        token_type="bearer",
        expires_in=int(expires.total_seconds()),
        username=user.username,
        is_admin=user.is_admin,
    )


def ensure_superadmin() -> None:
    """Create the superadmin from the environment, or bring it back in line on restart."""
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.username == SUPERADMIN_USERNAME).first()
        if user is None:
            session.add(User(username=SUPERADMIN_USERNAME, hashed_password=get_password_hash(SUPERADMIN_PASSWORD),
                             is_admin=True, is_active=True))
            logger.info("Created superadmin %s", SUPERADMIN_USERNAME)
        else:
            user.is_admin = True
            user.is_active = True
            if not verify_password(SUPERADMIN_PASSWORD, user.hashed_password):
                # SUPERADMIN_PASSWORD changed: rotate it and drop sessions signed with the old one.
                user.hashed_password = get_password_hash(SUPERADMIN_PASSWORD)
                user.token_version = (user.token_version or 0) + 1
                logger.info("Rotated the superadmin password from the environment")
        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Could not ensure the superadmin account exists")
    finally:
        session.close()


def _credentials_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise _credentials_error()
    username = payload.get("sub")
    if not isinstance(username, str):
        raise _credentials_error()

    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise _credentials_error()

    # Tokens from before a password change or a revoke are dead, even if the account is active again.
    if payload.get("ver") != (user.token_version or 0):
        raise _credentials_error()
    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required.")
    return user


router = APIRouter(prefix="/auth", tags=["Authentication"])


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
    # A revoked account behaves exactly like a wrong password.
    if not user or not user.is_active or not valid:
        login_throttle.failed(username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    login_throttle.succeeded(username)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return create_access_token(user)


@router.get("/me", response_model=Me)
def read_me(user: User = Depends(get_current_user)):
    return Me(username=user.username, is_admin=user.is_admin)
