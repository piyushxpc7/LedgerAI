from datetime import datetime, timedelta

from fastapi.testclient import TestClient


def _register_firm(client: TestClient, email: str, password: str = "password123"):
    payload = {
        "firm_name": "Test Firm",
        "name": "Test User",
        "email": email,
        "password": password,
        "phone": "+91-9999999999",
    }
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 200
    return resp.json()


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_and_login_flow(client: TestClient):
    data = _register_firm(client, email="firm1@example.com")
    token = data["access_token"]
    user = data["user"]

    # /auth/me should return the same user
    me_resp = client.get("/api/auth/me", headers=_auth_header(token))
    assert me_resp.status_code == 200
    me = me_resp.json()
    assert me["email"] == user["email"]
    assert me["firm_id"] == user["firm_id"]

    # Login with correct credentials
    login_resp = client.post(
        "/api/auth/login",
        json={"email": user["email"], "password": "password123"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data

    # Login with wrong password should fail
    bad_login = client.post(
        "/api/auth/login",
        json={"email": user["email"], "password": "wrong-password"},
    )
    assert bad_login.status_code == 401


def test_reset_password_flow(client: TestClient):
    data = _register_firm(client, email="reset@example.com")
    user = data["user"]

    # Seed a reset token directly into the in-memory store
    from api.routes import auth as auth_module
    import hashlib

    raw_token = "test-reset-token"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    auth_module._reset_tokens[token_hash] = {
        "user_id": user["id"],
        "expires_at": datetime.utcnow() + timedelta(hours=1),
    }

    # Reset password using the seeded token
    reset_resp = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "newpassword123"},
    )
    assert reset_resp.status_code == 200

    # Login with new password should succeed
    good_login = client.post(
        "/api/auth/login",
        json={"email": user["email"], "password": "newpassword123"},
    )
    assert good_login.status_code == 200

    # Old password should no longer work
    bad_login = client.post(
        "/api/auth/login",
        json={"email": user["email"], "password": "password123"},
    )
    assert bad_login.status_code == 401

