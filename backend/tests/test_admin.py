import uuid

import pytest
from fastapi.testclient import TestClient

import auth
import main
from auth import LoginThrottle
from database import SessionLocal
from db_models import User
from jobs import JobQueue

PASSWORD = "correct horse battery"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "job_queue", JobQueue(max_pending=2, result_ttl_s=60))
    monkeypatch.setattr(auth, "login_throttle", LoginThrottle(auth.MAX_FAILED_LOGINS, auth.LOCKOUT_WINDOW_S))
    with TestClient(main.app) as c:
        yield c


def _sign_in(client, username, password):
    token = client.post("/auth/login", data={"username": username, "password": password}).json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return token


@pytest.fixture
def admin(client, make_account):
    username, password = make_account(f"admin-{uuid.uuid4().hex[:6]}", is_admin=True)
    _sign_in(client, username, password)
    return username


def _new_name():
    return f"member-{uuid.uuid4().hex[:6]}"


class TestAccess:
    def test_anonymous_callers_get_401(self, client):
        assert client.get("/admin/users").status_code == 401

    def test_ordinary_users_get_403(self, client, make_account):
        username, password = make_account()
        _sign_in(client, username, password)
        assert client.get("/admin/users").status_code == 403
        assert client.post("/admin/users", json={"username": _new_name()}).status_code == 403

    def test_admins_get_in(self, client, admin):
        resp = client.get("/admin/users")
        assert resp.status_code == 200
        assert admin in [u["username"] for u in resp.json()]


class TestCreating:
    def test_creating_a_user_returns_a_working_password_once(self, client, admin):
        name = _new_name()
        resp = client.post("/admin/users", json={"username": name})
        assert resp.status_code == 201
        body = resp.json()
        assert body["username"] == name
        assert body["is_active"] is True and body["is_admin"] is False
        password = body["password"]
        assert len(password) >= 16

        # The password works, and it is not readable anywhere afterwards.
        anon = TestClient(main.app)
        assert anon.post("/auth/login", data={"username": name, "password": password}).status_code == 200
        with SessionLocal() as session:
            stored = session.query(User).filter(User.username == name).first().hashed_password
        assert password not in stored
        assert "password" not in client.get("/admin/users").text

    def test_each_password_is_different(self, client, admin):
        first = client.post("/admin/users", json={"username": _new_name()}).json()["password"]
        second = client.post("/admin/users", json={"username": _new_name()}).json()["password"]
        assert first != second

    def test_duplicate_username_is_409(self, client, admin):
        name = _new_name()
        assert client.post("/admin/users", json={"username": name}).status_code == 201
        assert client.post("/admin/users", json={"username": name.upper()}).status_code == 409

    @pytest.mark.parametrize("username", ["ab", "x" * 33, "has space", "emoji-😀", ""])
    def test_invalid_usernames_are_rejected(self, client, admin, username):
        assert client.post("/admin/users", json={"username": username}).status_code == 422

    def test_usernames_are_normalized(self, client, admin):
        name = _new_name().upper()
        assert client.post("/admin/users", json={"username": f"  {name}  "}).json()["username"] == name.lower()


class TestRevoking:
    def test_revoking_blocks_login_and_kills_live_sessions(self, client, admin, make_account):
        name = _new_name()
        password = client.post("/admin/users", json={"username": name}).json()["password"]

        member = TestClient(main.app)
        token = _sign_in(member, name, password)
        assert member.get("/auth/me").status_code == 200

        assert client.post(f"/admin/users/{name}/revoke").json()["is_active"] is False

        assert member.get("/auth/me").status_code == 401
        assert member.post("/auth/login", data={"username": name, "password": password}).status_code == 401
        assert token  # the token still exists, it is simply refused

    def test_restoring_lets_them_log_in_again_but_old_tokens_stay_dead(self, client, admin):
        name = _new_name()
        password = client.post("/admin/users", json={"username": name}).json()["password"]
        member = TestClient(main.app)
        old_token = _sign_in(member, name, password)

        client.post(f"/admin/users/{name}/revoke")
        assert client.post(f"/admin/users/{name}/restore").json()["is_active"] is True

        assert member.post("/auth/login", data={"username": name, "password": password}).status_code == 200
        assert TestClient(main.app).get("/auth/me", headers={"Authorization": f"Bearer {old_token}"}).status_code == 401

    def test_resetting_a_password_replaces_it_and_ends_sessions(self, client, admin):
        name = _new_name()
        first = client.post("/admin/users", json={"username": name}).json()["password"]
        member = TestClient(main.app)
        token = _sign_in(member, name, first)

        second = client.post(f"/admin/users/{name}/password").json()["password"]
        assert second != first

        assert member.get("/auth/me").status_code == 401
        anon = TestClient(main.app)
        assert anon.post("/auth/login", data={"username": name, "password": first}).status_code == 401
        assert anon.post("/auth/login", data={"username": name, "password": second}).status_code == 200

    def test_deleting_removes_the_account(self, client, admin):
        name = _new_name()
        password = client.post("/admin/users", json={"username": name}).json()["password"]
        assert client.delete(f"/admin/users/{name}").status_code == 204
        assert name not in [u["username"] for u in client.get("/admin/users").json()]
        assert TestClient(main.app).post(
            "/auth/login", data={"username": name, "password": password}).status_code == 401

    def test_admins_cannot_lock_themselves_out(self, client, admin):
        assert client.post(f"/admin/users/{admin}/revoke").status_code == 400
        assert client.delete(f"/admin/users/{admin}").status_code == 400
        assert client.get("/admin/users").status_code == 200

    @pytest.mark.parametrize("method,path", [
        ("post", "/admin/users/ghost-account/revoke"),
        ("post", "/admin/users/ghost-account/restore"),
        ("post", "/admin/users/ghost-account/password"),
        ("delete", "/admin/users/ghost-account"),
    ])
    def test_unknown_users_are_404(self, client, admin, method, path):
        assert getattr(client, method)(path).status_code == 404


def test_listing_shows_status_and_last_login(client, admin):
    name = _new_name()
    password = client.post("/admin/users", json={"username": name}).json()["password"]
    TestClient(main.app).post("/auth/login", data={"username": name, "password": password})

    row = next(u for u in client.get("/admin/users").json() if u["username"] == name)
    assert row["is_active"] is True
    assert row["is_admin"] is False
    assert row["created_at"] and row["last_login_at"]
