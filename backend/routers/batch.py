from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import get_db
from backend.schemas.batch import BatchCreate, BatchUpdate, BatchResponse, BatchCorrectQuantity
from backend.services import batch_service

router = APIRouter(prefix="/api/batches", tags=["Batches"])


@router.post("/", response_model=BatchResponse, status_code=201)
def create_batch(data: BatchCreate, db: Session = Depends(get_db)):
    return batch_service.create_batch(db, data)


@router.get("/", response_model=List[BatchResponse])
def list_batches(
    medicine_id: Optional[int] = Query(None, description="Filter by medicine"),
    skip: int = 0,
    limit: int = 10000,
    db: Session = Depends(get_db),
):
    """List batches sorted by soonest expiration date."""
    return batch_service.get_batches(db, medicine_id=medicine_id, skip=skip, limit=limit)


@router.get("/expiring-soon", response_model=List[BatchResponse])
def expiring_soon(
    days: int = Query(90, description="Days from today to check"),
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Get batches expiring within the given number of days."""
    return batch_service.get_expiring_soon(db, days=days, limit=limit)


@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = batch_service.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.put("/{batch_id}", response_model=BatchResponse)
def update_batch(batch_id: int, data: BatchUpdate, db: Session = Depends(get_db)):
    batch = batch_service.update_batch(db, batch_id, data)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.patch("/{batch_id}/correct-quantity", response_model=BatchResponse)
def correct_batch_quantity(batch_id: int, data: BatchCorrectQuantity, db: Session = Depends(get_db)):
    """Correct the original stocked quantity while preserving sales already made."""
    try:
        batch = batch_service.correct_initial_quantity(db, batch_id, data.new_initial_quantity)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.delete("/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db)):
    success = batch_service.delete_batch(db, batch_id)
    if not success:
        raise HTTPException(status_code=404, detail="Batch not found")
    return {"detail": "Batch deleted"}
