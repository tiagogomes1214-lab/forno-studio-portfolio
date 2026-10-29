from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ProductIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=1000)
    category: str = Field(default="Pizzas", max_length=60)
    price: float = Field(gt=0, le=10000)
    image: str = Field(default="", max_length=500)
    badge: str = Field(default="", max_length=40)
    active: bool = True


class ProductOut(ProductIn):
    id: int
    model_config = ConfigDict(from_attributes=True)


class OrderLineIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=30)


class OrderIn(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=40)
    order_type: str = Field(pattern="^(delivery|pickup)$")
    address: str = Field(default="", max_length=300)
    notes: str = Field(default="", max_length=1000)
    items: list[OrderLineIn] = Field(min_length=1, max_length=40)


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(Aguardando pagamento|Recebido|Em preparo|Saiu para entrega|Pronto para retirada|Concluído|Cancelado)$")


class OrderOut(BaseModel):
    id: int
    customer_name: str
    phone: str
    order_type: str
    address: str
    notes: str
    status: str
    total: float
    payment_status: str
    payment_provider_order_id: str | None = None
    tracking_token: str
    created_at: datetime
    items: list[OrderItemOut]
    model_config = ConfigDict(from_attributes=True)


class CheckoutOut(BaseModel):
    order_id: int
    tracking_token: str
    tracking_url: str
    checkout_url: str
    payment_status: str


class TrackingOut(BaseModel):
    id: int
    status: str
    payment_status: str
    order_type: str
    total: float
    created_at: datetime
    tracking_token: str
    items: list[OrderItemOut]
    model_config = ConfigDict(from_attributes=True)
