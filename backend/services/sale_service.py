from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Integer
from typing import List

from backend.models.sale import Sale
from backend.models.sale_order import SaleOrder
from backend.models.batch import Batch
from backend.schemas.sale import SaleCreate, SaleOrderCreate, SaleOrderUpdate
from backend.services.batch_service import adjust_inventory


def record_sale(db: Session, data: SaleCreate) -> Sale:
    """Record a sale and subtract quantity from the batch."""
    adjust_inventory(db, data.batch_id, data.quantity_sold)

    sale = Sale(
        batch_id=data.batch_id,
        quantity_sold=data.quantity_sold,
        sale_price=data.sale_price,
        sale_number=data.sale_number,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale


def create_sale_order(db: Session, data: SaleOrderCreate) -> SaleOrder:
    """Create a sale order with multiple items in a single transaction."""
    # Compute next order number — cast to integer first to avoid lexicographic max
    max_num = db.query(func.max(cast(SaleOrder.order_number, Integer))).filter(
        SaleOrder.order_number.op('~')(r'^\d+$')
    ).scalar()
    next_num = str((max_num or 0) + 1)

    order = SaleOrder(order_number=next_num, discount_pct=data.discount_pct or 0)
    db.add(order)
    db.flush()  # get order.id

    for item in data.items:
        adjust_inventory(db, item.batch_id, item.quantity_sold)
        sale = Sale(
            batch_id=item.batch_id,
            quantity_sold=item.quantity_sold,
            sale_price=item.sale_price,
            sale_order_id=order.id,
            sale_number=next_num,
        )
        db.add(sale)

    db.commit()
    db.refresh(order)
    return order


def get_sale_orders(db: Session, skip: int = 0, limit: int = 200) -> List[SaleOrder]:
    return (
        db.query(SaleOrder)
        .order_by(SaleOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def delete_sale_order(db: Session, order_id: int) -> None:
    """Delete a sale order and restore batch quantities for all its items."""
    order = db.query(SaleOrder).filter(SaleOrder.id == order_id).first()
    if not order:
        raise ValueError("Sale order not found")

    # Restore inventory for each sale item
    for sale in (order.items or []):
        if sale.batch_id and sale.quantity_sold:
            batch = db.query(Batch).filter(Batch.id == sale.batch_id).first()
            if batch:
                batch.quantity = (batch.quantity or 0) + sale.quantity_sold
        db.delete(sale)

    db.delete(order)
    db.commit()


def update_sale_order(db: Session, order_id: int, data: SaleOrderUpdate) -> SaleOrder:
    """Update a sale order: restore old inventory, replace items with new ones."""
    order = db.query(SaleOrder).filter(SaleOrder.id == order_id).first()
    if not order:
        raise ValueError("Sale order not found")

    # Restore inventory from old items and delete them
    for sale in list(order.items or []):
        if sale.batch_id and sale.quantity_sold:
            batch = db.query(Batch).filter(Batch.id == sale.batch_id).first()
            if batch:
                batch.quantity = (batch.quantity or 0) + sale.quantity_sold
        db.delete(sale)

    db.flush()

    # Create new items
    for item in data.items:
        adjust_inventory(db, item.batch_id, item.quantity_sold)
        sale = Sale(
            batch_id=item.batch_id,
            quantity_sold=item.quantity_sold,
            sale_price=item.sale_price,
            sale_order_id=order.id,
            sale_number=order.order_number,
        )
        db.add(sale)

    db.commit()
    db.refresh(order)
    return order


def get_sales(db: Session, skip: int = 0, limit: int = 1000) -> List[Sale]:
    return (
        db.query(Sale)
        .order_by(Sale.sale_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
