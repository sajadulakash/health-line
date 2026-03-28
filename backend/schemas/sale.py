from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ---------- Sale ----------
class SaleCreate(BaseModel):
    batch_id: int
    quantity_sold: int
    sale_price: Decimal
    sale_number: Optional[str] = None


class SaleResponse(BaseModel):
    id: int
    batch_id: Optional[int] = None
    sale_order_id: Optional[int] = None
    sale_number: Optional[str] = None
    quantity_sold: Optional[int] = None
    sale_price: Optional[Decimal] = None
    sale_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------- Sale Order ----------
class SaleOrderItemCreate(BaseModel):
    batch_id: int
    quantity_sold: int
    sale_price: Decimal


class SaleOrderCreate(BaseModel):
    items: List[SaleOrderItemCreate]
    discount_pct: Optional[Decimal] = Decimal("0")


class SaleOrderUpdate(BaseModel):
    items: List[SaleOrderItemCreate]


class SaleOrderItemResponse(BaseModel):
    id: int
    batch_id: Optional[int] = None
    quantity_sold: Optional[int] = None
    sale_price: Optional[Decimal] = None
    sale_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class SaleOrderResponse(BaseModel):
    id: int
    order_number: Optional[str] = None
    discount_pct: Optional[Decimal] = None
    created_at: Optional[datetime] = None
    items: List[SaleOrderItemResponse] = []

    class Config:
        from_attributes = True
