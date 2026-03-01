from fastapi.testclient import TestClient


def _register_and_login(client: TestClient):
    resp = client.post(
        "/api/auth/register",
        json={
            "firm_name": "Notice Firm",
            "name": "Notice User",
            "email": "notice@example.com",
            "password": "password123",
            "phone": "+91-8888888888",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    token = data["access_token"]
    return data["user"], token


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_client(client: TestClient, token: str) -> str:
    resp = client.post(
        "/api/clients",
        headers=_auth_header(token),
        json={
            "name": "Client One",
            "pan": "ABCDE1234F",
            "dob": "01/01/1990",
            "email": "client@example.com",
        },
    )
    assert resp.status_code == 200
    return resp.json()["id"]


def test_upload_list_approve_and_delete_notice(client: TestClient):
    user, token = _register_and_login(client)
    client_id = _create_client(client, token)

    # Upload a dummy PDF notice
    files = {
        "notice_pdf": ("notice.pdf", b"%PDF-1.4\n%dummy", "application/pdf"),
    }
    data = {
        "client_id": client_id,
        "assessment_year": "2023-24",
    }
    upload_resp = client.post(
        "/api/notices/upload",
        headers=_auth_header(token),
        data=data,
        files=files,
    )
    assert upload_resp.status_code == 200
    upload_data = upload_resp.json()
    notice_id = upload_data["notice_id"]

    # List notices for the firm
    list_resp = client.get("/api/notices", headers=_auth_header(token))
    assert list_resp.status_code == 200
    notices = list_resp.json()
    assert any(n["id"] == notice_id for n in notices)

    # Approve the notice (even if pipeline is still running, this should work)
    approve_resp = client.post(
        f"/api/notices/{notice_id}/approve",
        headers=_auth_header(token),
        json={"action": "approve", "ca_notes": "Looks good."},
    )
    assert approve_resp.status_code == 200
    approve_data = approve_resp.json()
    assert "status" in approve_data

    # Delete the notice
    delete_resp = client.delete(
        f"/api/notices/{notice_id}", headers=_auth_header(token)
    )
    assert delete_resp.status_code == 200

    # Ensure it no longer appears in the list
    list_after_delete = client.get("/api/notices", headers=_auth_header(token))
    assert list_after_delete.status_code == 200
    remaining = list_after_delete.json()
    assert all(n["id"] != notice_id for n in remaining)

