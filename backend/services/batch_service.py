from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date

from backend.models.batch import Batch
from backend.schemas.batch import BatchCreate, BatchUpdate


def create_batch(db: Session, data: BatchCreate) -> Batch:
    batch = Batch(**data.model_dump())
    batch.initial_quantity = batch.quantity  # preserve original stocked-in qty
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


def get_batch(db: Session, batch_id: int) -> Optional[Batch]:
    return db.query(Batch).filter(Batch.id == batch_id).first()


def get_batches(
    db: Session,
    medicine_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Batch]:
    """Get batches sorted by soonest expiration date."""
    query = db.query(Batch)
    if medicine_id:
        query = query.filter(Batch.medicine_id == medicine_id)
    return (
        query.order_by(Batch.expiration_date.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_expiring_soon(db: Session, days: int = 90, limit: int = 50) -> List[Batch]:
    """Get batches expiring within the given number of days, sorted soonest first."""
    cutoff = date.today()
    from datetime import timedelta
    deadline = cutoff + timedelta(days=days)
    return (
        db.query(Batch)
        .filter(Batch.expiration_date >= cutoff, Batch.expiration_date <= deadline)
        .filter(Batch.quantity > 0)
        .order_by(Batch.expiration_date.asc())
        .limit(limit)
        .all()
    )


def update_batch(db: Session, batch_id: int, data: BatchUpdate) -> Optional[Batch]:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(batch, key, value)
    db.commit()
    db.refresh(batch)
    return batch


def delete_batch(db: Session, batch_id: int) -> bool:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        return False
    db.delete(batch)
    db.commit()
    return True


def adjust_inventory(db: Session, batch_id: int, quantity_sold: int) -> Optional[Batch]:
    """Subtract sold quantity from batch inventory."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        return None
    if batch.quantity is None or batch.quantity < quantity_sold:
        raise ValueError(
            f"Insufficient stock. Available: {batch.quantity}, Requested: {quantity_sold}"
        )
    batch.quantity -= quantity_sold
    db.commit()
    db.refresh(batch)
    return batch
