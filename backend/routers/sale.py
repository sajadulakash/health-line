from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.schemas.sale import SaleCreate, SaleResponse, SaleOrderCreate, SaleOrderResponse, SaleOrderUpdate
from backend.services import sale_service

router = APIRouter(prefix="/api/sales", tags=["Sales"])


@router.post("/", response_model=SaleResponse, status_code=201)
def record_sale(data: SaleCreate, db: Session = Depends(get_db)):
    """Record a sale — automatically subtracts quantity from the batch."""
    try:
        return sale_service.record_sale(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[SaleResponse])
def list_sales(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    return sale_service.get_sales(db, skip=skip, limit=limit)


@router.post("/orders", response_model=SaleOrderResponse, status_code=201)
def create_sale_order(data: SaleOrderCreate, db: Session = Depends(get_db)):
    """Create a sale order with multiple items."""
    try:
        return sale_service.create_sale_order(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/orders", response_model=List[SaleOrderResponse])
def list_sale_orders(skip: int = 0, limit: int = 100000, db: Session = Depends(get_db)):
    return sale_service.get_sale_orders(db, skip=skip, limit=limit)


@router.delete("/orders/{order_id}")
def delete_sale_order(order_id: int, db: Session = Depends(get_db)):
    """Delete a sale order and restore inventory for all its items."""
    try:
        sale_service.delete_sale_order(db, order_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"detail": "Sale order deleted and inventory restored"}


@router.put("/orders/{order_id}", response_model=SaleOrderResponse)
def update_sale_order(order_id: int, data: SaleOrderUpdate, db: Session = Depends(get_db)):
    """Update a sale order: restore old inventory and record new items."""
    try:
        return sale_service.update_sale_order(db, order_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
