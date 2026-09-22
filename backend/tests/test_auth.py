import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from jose import jwt

import auth
import main
from auth import LoginThrottle, ensure_superadmin
from config import SECRET_KEY, SUPERADMIN_PASSWORD, SUPERADMIN_USERNAME
from database import SessionLocal, init_db
from db_models import User
from jobs import JobQueue

PASSWORD = "correct horse battery"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "job_queue", JobQueue(max_pending=2, result_ttl_s=60))
    monkeypatch.setattr(auth, "login_throttle", LoginThrottle(auth.MAX_FAILED_LOGINS, auth.LOCKOUT_WINDOW_S))
    with TestClient(main.app) as c:
        yield c


def _login(client, username, password=PASSWORD):
    return client.post("/auth/login", data={"username": username, "password": password})


def _me(client, token):
    return client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})


def _stored(username):
    with SessionLocal() as session:
        return session.query(User).filter(User.username == username).first()


class TestLogin:
    def test_login_returns_a_usable_token(self, client, make_account):
        username, password = make_account()
        resp = _login(client, username, password)
        assert resp.status_code == 200
        body = resp.json()
        assert body["token_type"] == "bearer"
        assert body["username"] == username
        assert body["is_admin"] is False
        assert body["expires_in"] == auth.JWT_EXPIRE_MINUTES * 60
        assert _me(client, body["access_token"]).json() == {"username": username, "is_admin": False}

    def test_token_lifetime_defaults_to_a_day(self):
        assert auth.JWT_EXPIRE_MINUTES == 24 * 60

    def test_usernames_are_case_insensitive(self, client, make_account):
        username, password = make_account(f"mixed.case-{uuid.uuid4().hex[:6]}")
        assert _login(client, username.upper(), password).status_code == 200

    def test_wrong_password(self, client, make_account):
        username, _ = make_account()
        resp = _login(client, username, "wrong password")
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Incorrect username or password."

    def test_unknown_user_looks_the_same_and_still_costs_a_bcrypt_check(self, client, monkeypatch):
        calls = []
        real = auth.verify_password
        monkeypatch.setattr(auth, "verify_password", lambda p, h: calls.append(h) or real(p, h))
        resp = _login(client, f"ghost-{uuid.uuid4().hex[:6]}", "whatever-password")
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Incorrect username or password."
        assert calls == [auth._DUMMY_HASH]

    def test_overlong_password_is_401_not_500(self, client, make_account):
        username, _ = make_account()
        assert _login(client, username, "y" * 100).status_code == 401

    def test_last_login_is_recorded(self, client, make_account):
        username, password = make_account()
        assert _stored(username).last_login_at is None
        _login(client, username, password)
        assert _stored(username).last_login_at is not None


class TestLockout:
    def test_repeated_failures_lock_the_username(self, client, make_account):
        username, password = make_account()
        for _ in range(auth.MAX_FAILED_LOGINS):
            assert _login(client, username, "wrong password").status_code == 401
        locked = _login(client, username, password)  # even the right password
        assert locked.status_code == 429
        assert int(locked.headers["Retry-After"]) > 0

        other, other_password = make_account()
        assert _login(client, other, other_password).status_code == 200

    def test_success_resets_the_failure_count(self, client, make_account):
        username, password = make_account()
        for _ in range(auth.MAX_FAILED_LOGINS - 1):
            _login(client, username, "wrong password")
        assert _login(client, username, password).status_code == 200
        for _ in range(auth.MAX_FAILED_LOGINS - 1):
            assert _login(client, username, "wrong password").status_code == 401
        assert _login(client, username, password).status_code == 200

    def test_lockout_expires_after_the_window(self, monkeypatch):
        now = [1000.0]
        monkeypatch.setattr(auth.time, "monotonic", lambda: now[0])
        throttle = LoginThrottle(max_failures=2, window_s=60)
        throttle.failed("u")
        throttle.failed("u")
        assert throttle.retry_after("u") == 61
        now[0] += 61
        assert throttle.retry_after("u") == 0


def _token(**claims):
    base = {"sub": "someone", "iat": datetime.now(timezone.utc), "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
    base.update(claims)
    return jwt.encode(base, SECRET_KEY, algorithm="HS256")


class TestTokens:
    @pytest.mark.parametrize("make_token", [
        lambda username: _token(sub=username, exp=datetime.now(timezone.utc) - timedelta(seconds=5)),  # expired
        lambda username: jwt.encode({"sub": username}, "another-secret", algorithm="HS256"),  # wrong key
        lambda username: _token(sub=username) + "x",  # tampered
        lambda username: _token(sub="ghost-user-does-not-exist"),  # unknown user
        lambda username: _token(sub=None),  # no subject
        lambda username: "not-a-jwt",
    ])
    def test_bad_tokens_are_401(self, client, make_account, make_token):
        username, _ = make_account()
        resp = _me(client, make_token(username))
        assert resp.status_code == 401
        assert resp.headers["WWW-Authenticate"] == "Bearer"

    def test_me_requires_a_token(self, client):
        assert client.get("/auth/me").status_code == 401

    def test_tokens_issued_before_a_password_change_stop_working(self, client, make_account):
        username, password = make_account()
        token = _login(client, username, password).json()["access_token"]
        assert _me(client, token).status_code == 200

        with SessionLocal() as session:
            user = session.query(User).filter(User.username == username).first()
            user.token_version = (user.token_version or 0) + 1
            session.commit()

        assert _me(client, token).status_code == 401


class TestRevokedAccounts:
    def _deactivate(self, username):
        with SessionLocal() as session:
            user = session.query(User).filter(User.username == username).first()
            user.is_active = False
            session.commit()

    def test_a_revoked_user_cannot_log_in(self, client, make_account):
        username, password = make_account()
        self._deactivate(username)
        resp = _login(client, username, password)
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Incorrect username or password."

    def test_an_existing_token_dies_with_the_account(self, client, make_account):
        username, password = make_account()
        token = _login(client, username, password).json()["access_token"]
        assert _me(client, token).status_code == 200
        self._deactivate(username)
        assert _me(client, token).status_code == 401


class TestSuperadmin:
    def test_bootstrap_creates_the_account(self, client):
        init_db()
        with SessionLocal() as session:
            session.query(User).filter(User.username == SUPERADMIN_USERNAME).delete()
            session.commit()

        ensure_superadmin()
        user = _stored(SUPERADMIN_USERNAME)
        assert user.is_admin and user.is_active
        assert _login(client, SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD).json()["is_admin"] is True

    def test_bootstrap_restores_admin_rights_and_access(self, client):
        ensure_superadmin()
        with SessionLocal() as session:
            user = session.query(User).filter(User.username == SUPERADMIN_USERNAME).first()
            user.is_admin = False
            user.is_active = False
            session.commit()

        ensure_superadmin()
        user = _stored(SUPERADMIN_USERNAME)
        assert user.is_admin and user.is_active

    def test_changing_the_environment_password_rotates_it(self, client, monkeypatch):
        ensure_superadmin()
        before = _stored(SUPERADMIN_USERNAME).token_version
        monkeypatch.setattr(auth, "SUPERADMIN_PASSWORD", "a-brand-new-superadmin-password")
        ensure_superadmin()

        assert _login(client, SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD).status_code == 401
        assert _login(client, SUPERADMIN_USERNAME, "a-brand-new-superadmin-password").status_code == 200
        assert _stored(SUPERADMIN_USERNAME).token_version == before + 1
        monkeypatch.undo()
        ensure_superadmin()  # put the original password back for the other tests


def test_there_is_no_signup_route(client):
    assert client.post("/auth/register", json={"username": "someone", "password": PASSWORD}).status_code == 404
    assert client.post("/register", json={"username": "someone", "password": PASSWORD}).status_code == 404


def test_superadmin_credentials_are_required():
    from conftest import import_in_subprocess
    out = import_in_subprocess("main", drop=("SUPERADMIN_PASSWORD",))
    assert out.returncode != 0
    assert "Missing required environment variables: SUPERADMIN_PASSWORD" in out.stderr
