from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "database" in data
    assert data["database"] in {"ok", "error"}
    assert data["env"] in {"development", "production", "test"}


def test_register_login_and_me_flow():
    # Use a unique email per test run to avoid collisions
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    password = "ledgerai-test-123"

    register_payload = {
        "firm_name": "Test Firm",
        "name": "Test User",
        "email": email,
        "password": password,
        "phone": "",
    }

    r = client.post("/api/auth/register", json=register_payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == email

    # Login with same credentials
    r_login = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert r_login.status_code == 200, r_login.text
    login_data = r_login.json()
    token = login_data["access_token"]

    # Get current user
    r_me = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r_me.status_code == 200, r_me.text
    me = r_me.json()
    assert me["email"] == email

