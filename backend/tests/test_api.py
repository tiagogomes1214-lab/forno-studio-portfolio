"""Testes de integração da API: rodar com PYTHONPATH=backend pytest -q backend/tests."""
from collections.abc import Iterator
import time

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.admin_auth import clear_login_failures
from app.database import Base, get_db
from app.main import app
from app.models import Product

TEST_SECRET = "segredo-de-testes-apenas-na-memoria-com-mais-de-32-caracteres"


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("ADMIN_USERNAME", "admin-teste")
    monkeypatch.setenv("ADMIN_PASSWORD", "senha-de-teste")
    monkeypatch.setenv("ADMIN_SESSION_SECRET", TEST_SECRET)
    monkeypatch.setenv("DEMO_MODE", "true")
    clear_login_failures("testclient")

    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with session_factory() as db:
        db.add(Product(name="Margherita", description="Massa e queijo", category="Pizzas", price=42.0, image="", badge=""))
        db.commit()

    def override_get_db() -> Iterator[Session]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()
        clear_login_failures("testclient")


def login(client: TestClient) -> str:
    response = client.post(
        "/api/admin/session",
        json={"username": "admin-teste", "password": "senha-de-teste"},
    )
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["expires_in"] == 1800
    return response.json()["access_token"]


def test_health_and_products_are_public(client: TestClient) -> None:
    assert client.get("/api/health").json()["status"] == "ok"
    response = client.get("/api/products")
    assert response.status_code == 200
    assert response.json()[0]["name"] == "Margherita"


def test_admin_requires_session_and_expires(client: TestClient) -> None:
    assert client.get("/api/admin/orders").status_code == 401
    token = login(client)
    auth = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/admin/orders", headers=auth).status_code == 200
    assert client.get("/api/admin/products", headers=auth).status_code == 200
    assert client.get("/api/admin/orders", headers={"Authorization": "Bearer invalido"}).status_code == 401

    expired = jwt.encode(
        {"sub": "admin-teste", "iat": int(time.time()) - 3600, "exp": int(time.time()) - 1800},
        TEST_SECRET,
        algorithm="HS256",
    )
    assert client.get("/api/admin/orders", headers={"Authorization": f"Bearer {expired}"}).status_code == 401


def test_wrong_password_has_rate_limit(client: TestClient) -> None:
    payload = {"username": "admin-teste", "password": "senha-incorreta"}
    for _ in range(5):
        assert client.post("/api/admin/session", json=payload).status_code == 401
    response = client.post("/api/admin/session", json=payload)
    assert response.status_code == 429
    assert response.headers["retry-after"] == "300"


def test_demo_order_is_anonymized_and_manageable(client: TestClient) -> None:
    data = {
        "customer_name": "Nome de teste digitado",
        "phone": "11912345678",
        "order_type": "delivery",
        "address": "Rua de Testes, 123",
        "notes": "Contato demonstrativo",
        "items": [{"product_id": 1, "quantity": 2}],
    }
    response = client.post("/api/orders", json=data)
    assert response.status_code == 201, response.text
    order = response.json()
    assert order["customer_name"] == "Cliente de demonstração"
    assert order["phone"] == "00000000000"
    assert order["address"] == "Endereço fictício (demonstração)"
    assert order["total"] == 84.0

    track = client.get(f"/api/tracking/{order['tracking_token']}")
    assert track.status_code == 200
    assert "customer_name" not in track.json()
    assert "address" not in track.json()

    auth = {"Authorization": f"Bearer {login(client)}"}
    changed = client.patch(
        f"/api/admin/orders/{order['id']}/status",
        json={"status": "Em preparo"},
        headers=auth,
    )
    assert changed.status_code == 200
    assert changed.json()["status"] == "Em preparo"


def test_payment_disabled_and_input_validated(client: TestClient) -> None:
    assert client.get("/api/payments/config").json()["online_payment_enabled"] is False
    response = client.post("/api/checkout/mercadopago", json={
        "customer_name": "Exemplo",
        "phone": "11912345678",
        "order_type": "pickup",
        "address": "",
        "items": [{"product_id": 1, "quantity": 1}],
    })
    assert response.status_code == 403
    token = login(client)
    response = client.post(
        "/api/admin/products",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Produto", "price": -5},
    )
    assert response.status_code == 422
