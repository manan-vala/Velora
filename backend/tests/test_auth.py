import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from jose import jwt

import auth
import main
from auth import LoginThrottle
from config import SECRET_KEY
from jobs import JobQueue

PASSWORD = "correct horse battery"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "job_queue", JobQueue(max_pending=2, result_ttl_s=60))
    monkeypatch.setattr(auth, "login_throttle", LoginThrottle(auth.MAX_FAILED_LOGINS, auth.LOCKOUT_WINDOW_S))
    with TestClient(main.app) as c:
        yield c


def _name():
    return f"user-{uuid.uuid4().hex[:8]}"


def _register(client, username=None, password=PASSWORD):
    return client.post("/auth/register", json={"username": _name() if username is None else username,
                                                 "password": password})


def _login(client, username, password=PASSWORD):
    return client.post("/auth/login", data={"username": username, "password": password})


def test_register_returns_a_usable_token(client):
    username = _name()
    resp = _register(client, username)
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["username"] == username
    assert body["expires_in"] == auth.JWT_EXPIRE_MINUTES * 60

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json() == {"username": username}


def test_token_carries_iat_and_configured_expiry(client):
    token = _register(client).json()["access_token"]
    claims = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    assert claims["exp"] - claims["iat"] == auth.JWT_EXPIRE_MINUTES * 60


def test_usernames_are_normalized(client):
    raw = f"  Mixed.Case-{uuid.uuid4().hex[:6]}  "
    assert _register(client, raw).json()["username"] == raw.strip().lower()
    assert _login(client, raw.strip().upper()).status_code == 200


def test_duplicate_username_is_409_even_with_different_case(client):
    username = _name()
    assert _register(client, username).status_code == 200
    resp = _register(client, username.upper())
    assert resp.status_code == 409
    assert resp.json()["detail"] == "That username is already taken."


@pytest.mark.parametrize("username", ["ab", "x" * 33, "has space", "emoji-😀", "semi;colon", ""])
def test_invalid_usernames_are_rejected(client, username):
    assert _register(client, username).status_code == 422


@pytest.mark.parametrize("password", ["short", "x" * 73, "é" * 37])
def test_passwords_bcrypt_cannot_handle_are_rejected(client, password):
    assert _register(client, password=password).status_code == 422


def test_registrations_are_unlimited(client):
    assert all(_register(client).status_code == 200 for _ in range(12))


def test_login_success_and_wrong_password(client):
    username = _name()
    _register(client, username)
    ok = _login(client, username)
    assert ok.status_code == 200 and ok.json()["username"] == username
    bad = _login(client, username, "wrong password")
    assert bad.status_code == 401
    assert bad.json()["detail"] == "Incorrect username or password."


def test_unknown_user_gets_the_same_401_as_a_wrong_password(client):
    resp = _login(client, _name(), "whatever-password")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Incorrect username or password."


def test_unknown_user_still_costs_a_bcrypt_check(client, monkeypatch):
    calls = []
    real = auth.verify_password
    monkeypatch.setattr(auth, "verify_password", lambda p, h: calls.append(h) or real(p, h))
    _login(client, _name(), "whatever-password")
    assert calls == [auth._DUMMY_HASH]


def test_overlong_login_password_is_401_not_500(client):
    username = _name()
    _register(client, username)
    assert _login(client, username, "y" * 100).status_code == 401


def test_repeated_failures_lock_the_username(client):
    username = _name()
    _register(client, username)
    for _ in range(auth.MAX_FAILED_LOGINS):
        assert _login(client, username, "wrong password").status_code == 401
    locked = _login(client, username)  # even the right password
    assert locked.status_code == 429
    assert int(locked.headers["Retry-After"]) > 0
    # other users are unaffected
    other = _name()
    _register(client, other)
    assert _login(client, other).status_code == 200


def test_success_resets_the_failure_count(client):
    username = _name()
    _register(client, username)
    for _ in range(auth.MAX_FAILED_LOGINS - 1):
        _login(client, username, "wrong password")
    assert _login(client, username).status_code == 200
    for _ in range(auth.MAX_FAILED_LOGINS - 1):
        assert _login(client, username, "wrong password").status_code == 401
    assert _login(client, username).status_code == 200


def test_lockout_expires_after_the_window(monkeypatch):
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


@pytest.mark.parametrize("make_token", [
    lambda username: _token(sub=username, exp=datetime.now(timezone.utc) - timedelta(seconds=5)),  # expired
    lambda username: jwt.encode({"sub": username}, "another-secret", algorithm="HS256"),  # wrong key
    lambda username: _token(sub=username) + "x",  # tampered
    lambda username: _token(sub="ghost-user-does-not-exist"),  # deleted/unknown user
    lambda username: _token(sub=None),  # no subject
    lambda username: "not-a-jwt",
])
def test_bad_tokens_are_401(client, make_token):
    username = _name()
    _register(client, username)
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {make_token(username)}"})
    assert resp.status_code == 401
    assert resp.headers["WWW-Authenticate"] == "Bearer"


def test_me_requires_a_token(client):
    assert client.get("/auth/me").status_code == 401


def test_old_unprefixed_routes_are_gone(client):
    assert client.post("/register", json={"username": _name(), "password": PASSWORD}).status_code == 404
    assert client.post("/login", data={"username": "x", "password": "y"}).status_code == 404
