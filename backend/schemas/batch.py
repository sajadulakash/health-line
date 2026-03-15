from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal


# ---------- Batch ----------
class BatchCreate(BaseModel):
    medicine_id: int
    batch_number: str
    purchase_price: Decimal
    quantity: int
    expiration_date: Optional[date] = None
    selling_price: Decimal


class BatchUpdate(BaseModel):
    batch_number: Optional[str] = None
    purchase_price: Optional[Decimal] = None
    quantity: Optional[int] = None
    initial_quantity: Optional[int] = None
    expiration_date: Optional[date] = None
    selling_price: Optional[Decimal] = None


class BatchResponse(BaseModel):
    id: int
    medicine_id: Optional[int] = None
    batch_number: Optional[str] = None
    purchase_price: Optional[Decimal] = None
    quantity: Optional[int] = None
    initial_quantity: Optional[int] = None
    expiration_date: Optional[date] = None
    selling_price: Optional[Decimal] = None

    class Config:
        from_attributes = True
