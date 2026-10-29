import hashlib
import hmac
import os
import secrets
import uuid
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv

# Load configuration before importing database.py, which reads DATABASE_URL.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session, selectinload

from .database import Base, engine, get_db
from .models import Order, OrderItem, Product
from .schemas import CheckoutOut, OrderIn, OrderOut, OrderStatusUpdate, ProductIn, ProductOut, TrackingOut

SEED_PRODUCTS = [
    {"name":"Margherita Classica","description":"Molho da casa, fior di latte, manjericão fresco e azeite.","category":"Clássicas","price":39.90,"image":"https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85","badge":"Favorita"},
    {"name":"Diavola","description":"Salame picante, mozzarella, molho artesanal e mel apimentado.","category":"Especiais","price":48.90,"image":"https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=85","badge":"Picante"},
    {"name":"Quattro Formaggi","description":"Mozzarella, gorgonzola, parmesão e provolone.","category":"Especiais","price":46.90,"image":"https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=900&q=85","badge":"Cremosa"},
    {"name":"Pepperoni","description":"Pepperoni tostado, mozzarella e molho de tomate da casa.","category":"Clássicas","price":44.90,"image":"https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=85","badge":"Mais pedida"},
    {"name":"Funghi & Trufa","description":"Cogumelos salteados, creme de queijo e toque de azeite trufado.","category":"Autorais","price":52.90,"image":"https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=900&q=85","badge":"Autoral"},
    {"name":"Burrata e Pesto","description":"Burrata cremosa, pesto de manjericão e tomate confitado.","category":"Autorais","price":54.90,"image":"https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=900&q=85","badge":"Especial"},
    {"name":"Tiramisù da Casa","description":"Creme de mascarpone, café e cacau amargo.","category":"Sobremesas","price":18.90,"image":"https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=85","badge":"Feito aqui"},
    {"name":"Limonata Siciliana","description":"Limão siciliano, água com gás e toque de hortelã.","category":"Bebidas","price":12.90,"image":"https://images.unsplash.com/photo-1513558161293-cbef765edc0b?auto=format&fit=crop&w=900&q=85","badge":"Refrescante"},
]


def migrate_existing_database() -> None:
    """Add columns to existing SQLite databases without deleting local orders."""
    inspector = inspect(engine)
    if "orders" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("orders")}
    additions = {
        "payment_status": "VARCHAR(40) DEFAULT 'not_required'",
        "payment_provider_order_id": "VARCHAR(100)",
        "tracking_token": "VARCHAR(64)",
    }
    with engine.begin() as connection:
        for name, sql_type in additions.items():
            if name not in columns:
                connection.execute(text(f"ALTER TABLE orders ADD COLUMN {name} {sql_type}"))
        connection.execute(text("UPDATE orders SET payment_status = 'not_required' WHERE payment_status IS NULL OR payment_status = ''"))
        rows = connection.execute(text("SELECT id FROM orders WHERE tracking_token IS NULL OR tracking_token = ''")).fetchall()
        for row in rows:
            connection.execute(
                text("UPDATE orders SET tracking_token = :token WHERE id = :order_id"),
                {"token": secrets.token_urlsafe(32), "order_id": row[0]},
            )
        # Existing SQLite files did not have these indexes in the first release.
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_tracking_token ON orders (tracking_token)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_payment_provider_order_id ON orders (payment_provider_order_id)"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    migrate_existing_database()
    with next(get_db()) as db:
        if db.query(Product).count() == 0:
            db.add_all([Product(**item) for item in SEED_PRODUCTS])
            db.commit()
    yield


app = FastAPI(title="Forno Studio API", version="1.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip().rstrip("/") for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_admin(x_admin_user: str | None = Header(default=None), x_admin_password: str | None = Header(default=None)):
    """Validate credentials on the server; never ship admin secrets to the browser bundle."""
    expected_user = os.getenv("ADMIN_USERNAME", "").strip()
    expected_password = os.getenv("ADMIN_PASSWORD", "")
    if not expected_user or not expected_password:
        raise HTTPException(status_code=503, detail="Painel indisponível: configure ADMIN_USERNAME e ADMIN_PASSWORD no ambiente do backend.")
    user_ok = hmac.compare_digest((x_admin_user or "").encode("utf-8"), expected_user.encode("utf-8"))
    password_ok = hmac.compare_digest((x_admin_password or "").encode("utf-8"), expected_password.encode("utf-8"))
    if not (user_ok and password_ok):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais administrativas inválidas")


def create_order_record(payload: OrderIn, db: Session, *, order_status: str, payment_status: str) -> Order:
    if payload.order_type == "delivery" and len(payload.address.strip()) < 5:
        raise HTTPException(422, "Informe um endereço válido para entrega.")
    ids = list({line.product_id for line in payload.items})
    products = {product.id: product for product in db.query(Product).filter(Product.id.in_(ids), Product.active.is_(True)).all()}
    if len(products) != len(ids):
        raise HTTPException(400, "Um ou mais produtos não estão disponíveis.")

    order = Order(
        customer_name=payload.customer_name.strip(),
        phone=payload.phone.strip(),
        order_type=payload.order_type,
        address=payload.address.strip(),
        notes=payload.notes.strip(),
        status=order_status,
        payment_status=payment_status,
        total=0,
    )
    total = 0.0
    for line in payload.items:
        product = products[line.product_id]
        total += product.price * line.quantity
        order.items.append(OrderItem(product_id=product.id, product_name=product.name, quantity=line.quantity, unit_price=product.price))
    order.total = round(total, 2)
    db.add(order)
    db.commit()
    db.refresh(order)
    return db.query(Order).options(selectinload(Order.items)).filter(Order.id == order.id).first()


def frontend_url(path: str) -> str:
    base = os.getenv("FRONTEND_PUBLIC_URL", "http://localhost:3000").rstrip("/")
    return f"{base}/{path.lstrip('/')}"


def verify_mp_signature(signature: str | None, request_id: str | None, data_id: str | None, secret: str) -> bool:
    if not signature or not request_id or not data_id:
        return False
    parsed = {}
    for part in signature.split(","):
        if "=" in part:
            key, value = part.strip().split("=", 1)
            parsed[key] = value
    timestamp = parsed.get("ts")
    received_hash = parsed.get("v1")
    if not timestamp or not received_hash:
        return False
    manifest = f"id:{data_id.lower()};request-id:{request_id};ts:{timestamp};"
    expected_hash = hmac.new(secret.encode("utf-8"), manifest.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_hash, received_hash)


def get_mp_payment_result(mp_order: dict) -> str:
    """Return only a server-verified state from the Orders API response."""
    overall_status = str(mp_order.get("status", "")).lower()
    if overall_status == "processed":
        return "approved"
    if overall_status in {"failed", "cancelled", "canceled", "rejected"}:
        return "rejected"
    transactions = mp_order.get("transactions") or {}
    payments = transactions.get("payments") or [] if isinstance(transactions, dict) else []
    statuses = {str(payment.get("status", "")).lower() for payment in payments if isinstance(payment, dict)}
    if statuses & {"processed", "approved"}:
        return "approved"
    if statuses & {"failed", "rejected", "cancelled", "canceled"}:
        return "rejected"
    return "pending"


def apply_verified_payment_status(db: Session, mp_order: dict) -> None:
    provider_id = str(mp_order.get("id", ""))
    external_reference = str(mp_order.get("external_reference", ""))
    query = db.query(Order)
    local_order = None
    if provider_id:
        local_order = query.filter(Order.payment_provider_order_id == provider_id).first()
    if local_order is None and external_reference.isdigit():
        local_order = query.filter(Order.id == int(external_reference)).first()
    if local_order is None:
        return
    result = get_mp_payment_result(mp_order)
    if result == "approved":
        local_order.payment_status = "approved"
        if local_order.status == "Aguardando pagamento":
            local_order.status = "Recebido"
    elif result == "rejected":
        local_order.payment_status = "rejected"
    db.commit()


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Forno Studio API"}


@app.get("/api/payments/config")
def payment_config():
    # Deliberately exposes only whether checkout is configured, never the access token.
    demo_mode = os.getenv("DEMO_MODE", "false").strip().lower() == "true"
    return {"online_payment_enabled": (not demo_mode) and bool(os.getenv("MERCADOPAGO_ACCESS_TOKEN", "").strip()), "provider": "Mercado Pago", "demo_mode": demo_mode}


@app.get("/api/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.active.is_(True)).order_by(Product.id).all()


@app.get("/api/admin/products", response_model=list[ProductOut], dependencies=[Depends(require_admin)])
def admin_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.id).all()


@app.post("/api/orders", response_model=OrderOut, status_code=201)
def create_order(payload: OrderIn, db: Session = Depends(get_db)):
    # Public portfolio deployment can accept sample orders without storing customer PII.
    if os.getenv("DEMO_MODE", "false").strip().lower() == "true":
        payload = payload.model_copy(update={
            "customer_name": "Cliente de demonstração",
            "phone": "00000000000",
            "address": "Endereço fictício (demonstração)" if payload.order_type == "delivery" else "Retirada no balcão",
            "notes": "Pedido criado em modo de demonstração; não preparar.",
        })
    order = create_order_record(payload, db, order_status="Recebido", payment_status="pay_on_delivery")
    return order


@app.post("/api/checkout/mercadopago", response_model=CheckoutOut, status_code=201)
async def create_mercadopago_checkout(payload: OrderIn, db: Session = Depends(get_db)):
    if os.getenv("DEMO_MODE", "false").strip().lower() == "true":
        raise HTTPException(status_code=403, detail="Pagamentos online estão desativados no modo de demonstração.")
    access_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "").strip()
    if not access_token:
        raise HTTPException(
            status_code=503,
            detail="O Mercado Pago ainda não está configurado. Adicione o Access Token de teste no arquivo backend/.env e reinicie o backend.",
        )

    order = create_order_record(payload, db, order_status="Aguardando pagamento", payment_status="pending")
    public_frontend = os.getenv("FRONTEND_PUBLIC_URL", "").strip().rstrip("/")
    online_config = {}
    # Mercado Pago expects public HTTPS return URLs for deployed integrations.
    if public_frontend.startswith("https://"):
        tracking_path = f"/acompanhar/{order.tracking_token}"
        online_config = {
            "success_url": f"{public_frontend}{tracking_path}?retorno=aprovado",
            "failure_url": f"{public_frontend}{tracking_path}?retorno=falha",
            "pending_url": f"{public_frontend}{tracking_path}?retorno=pendente",
            "auto_return": "approved",
        }

    body = {
        "type": "online",
        "processing_mode": "manual",
        "capture_mode": "automatic_async",
        "total_amount": f"{order.total:.2f}",
        "external_reference": str(order.id),
        "description": f"Pedido Forno Studio #{order.id}",
        "items": [
            {"title": item.product_name, "quantity": item.quantity, "unit_price": f"{item.unit_price:.2f}"}
            for item in order.items
        ],
    }
    if online_config:
        body["config"] = {"online": online_config}

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://api.mercadopago.com/v1/orders",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-Idempotency-Key": str(uuid.uuid4()),
                },
                json=body,
            )
    except httpx.RequestError as exc:
        order.payment_status = "failed"
        db.commit()
        raise HTTPException(502, "Não foi possível conectar ao Mercado Pago. Verifique a conexão e tente novamente.") from exc

    if not response.is_success:
        order.payment_status = "failed"
        db.commit()
        # Keep provider details out of the public response; server logs can be added for production diagnosis.
        raise HTTPException(502, "O Mercado Pago recusou a criação do checkout. Confira as credenciais de teste e tente novamente.")

    result = response.json()
    checkout_url = result.get("checkout_url")
    provider_order_id = result.get("id")
    if not checkout_url or not provider_order_id:
        order.payment_status = "failed"
        db.commit()
        raise HTTPException(502, "O Mercado Pago não retornou o link de pagamento esperado.")

    order.payment_provider_order_id = str(provider_order_id)
    db.commit()
    return CheckoutOut(
        order_id=order.id,
        tracking_token=order.tracking_token,
        tracking_url=frontend_url(f"/acompanhar/{order.tracking_token}"),
        checkout_url=checkout_url,
        payment_status=order.payment_status,
    )


@app.get("/api/tracking/{tracking_token}", response_model=TrackingOut)
def track_order(tracking_token: str, db: Session = Depends(get_db)):
    order = db.query(Order).options(selectinload(Order.items)).filter(Order.tracking_token == tracking_token).first()
    if order is None:
        raise HTTPException(404, "Não encontramos um pedido com esse link de acompanhamento.")
    # Deliberately omit the customer's name, phone and address from the public tracking API.
    return TrackingOut(
        id=order.id,
        status=order.status,
        payment_status=order.payment_status,
        order_type=order.order_type,
        total=order.total,
        created_at=order.created_at,
        tracking_token=order.tracking_token,
        items=order.items,
    )


@app.post("/api/webhooks/mercadopago")
async def mercadopago_webhook(request: Request, db: Session = Depends(get_db)):
    secret = os.getenv("MERCADOPAGO_WEBHOOK_SECRET", "").strip()
    if not secret:
        raise HTTPException(503, "Configure MERCADOPAGO_WEBHOOK_SECRET antes de ativar webhooks públicos.")

    body = await request.json()
    data = body.get("data") if isinstance(body, dict) else None
    data_id = request.query_params.get("data.id") or (data.get("id") if isinstance(data, dict) else None)
    event_type = request.query_params.get("type") or (body.get("type") if isinstance(body, dict) else None)
    if event_type != "order" or not data_id:
        return {"received": True, "ignored": True}

    valid = verify_mp_signature(
        request.headers.get("x-signature"),
        request.headers.get("x-request-id"),
        str(data_id),
        secret,
    )
    if not valid:
        raise HTTPException(status_code=401, detail="Assinatura do webhook inválida.")

    access_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "").strip()
    if not access_token:
        raise HTTPException(503, "Mercado Pago não está configurado.")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"https://api.mercadopago.com/v1/orders/{data_id}",
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
    except httpx.RequestError as exc:
        raise HTTPException(502, "Falha ao consultar a ordem no Mercado Pago.") from exc
    if not response.is_success:
        raise HTTPException(502, "Não foi possível validar a ordem no Mercado Pago.")
    apply_verified_payment_status(db, response.json())
    return {"received": True}


@app.get("/api/admin/orders", response_model=list[OrderOut], dependencies=[Depends(require_admin)])
def admin_orders(db: Session = Depends(get_db)):
    return db.query(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc()).all()


@app.patch("/api/admin/orders/{order_id}/status", response_model=OrderOut, dependencies=[Depends(require_admin)])
def update_order_status(order_id: int, payload: OrderStatusUpdate, db: Session = Depends(get_db)):
    new_status = payload.status
    order = db.query(Order).options(selectinload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Pedido não encontrado.")
    if order.payment_status not in {"approved", "pay_on_delivery", "not_required"} and new_status not in {"Aguardando pagamento", "Cancelado"}:
        raise HTTPException(409, "Este pedido ainda não tem pagamento confirmado. Não o envie para preparo.")
    order.status = new_status
    db.commit()
    db.refresh(order)
    return order


@app.post("/api/admin/products", response_model=ProductOut, dependencies=[Depends(require_admin)])
def create_product(payload: ProductIn, db: Session = Depends(get_db)):
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@app.put("/api/admin/products/{product_id}", response_model=ProductOut, dependencies=[Depends(require_admin)])
def update_product(product_id: int, payload: ProductIn, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Produto não encontrado.")
    for key, value in payload.model_dump().items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product
