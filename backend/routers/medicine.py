from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid

from backend.database import get_db
from backend.config import get_settings
from backend.schemas.medicine import (
    MedicineCreate, MedicineUpdate, MedicineResponse, MedicineWithBatches,
)
from backend.services import medicine_service

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])


@router.post("/", response_model=MedicineResponse, status_code=201)
def create_medicine(data: MedicineCreate, db: Session = Depends(get_db)):
    return medicine_service.create_medicine(db, data)


@router.get("/", response_model=List[MedicineResponse])
def list_medicines(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    return medicine_service.get_medicines(db, skip=skip, limit=limit)


@router.get("/{medicine_id}", response_model=MedicineWithBatches)
def get_medicine(medicine_id: int, db: Session = Depends(get_db)):
    medicine = medicine_service.get_medicine(db, medicine_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine


@router.put("/{medicine_id}", response_model=MedicineResponse)
def update_medicine(medicine_id: int, data: MedicineUpdate, db: Session = Depends(get_db)):
    medicine = medicine_service.update_medicine(db, medicine_id, data)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine


@router.delete("/{medicine_id}")
def delete_medicine(medicine_id: int, db: Session = Depends(get_db)):
    success = medicine_service.delete_medicine(db, medicine_id)
    if not success:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"detail": "Medicine deleted"}


@router.post("/{medicine_id}/upload-image", response_model=MedicineResponse)
async def upload_image(
    medicine_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload an optional image for a medicine."""
    settings = get_settings()
    medicine = medicine_service.get_medicine(db, medicine_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    # Create upload directory if it doesn't exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    ext = file.filename.split(".")[-1] if file.filename else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    # Update medicine with image URL
    update_data = MedicineUpdate(image_url=f"/uploads/images/{filename}")
    return medicine_service.update_medicine(db, medicine_id, update_data)


@router.put("/{medicine_id}/selling-price")
def update_selling_price(
    medicine_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    """Update selling_price on ALL batches of a medicine."""
    from backend.models.batch import Batch

    medicine = medicine_service.get_medicine(db, medicine_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    new_price = payload.get("selling_price")
    if new_price is None:
        raise HTTPException(status_code=400, detail="selling_price required")
    db.query(Batch).filter(Batch.medicine_id == medicine_id).update(
        {Batch.selling_price: new_price}
    )
    db.commit()
    return {"detail": f"Selling price updated to {new_price} for all batches"}


@router.get("/{medicine_id}/alternatives", response_model=List[MedicineWithBatches])
def get_alternatives(medicine_id: int, db: Session = Depends(get_db)):
    """Get alternative medicines (same generic name or category)."""
    return medicine_service.find_alternatives(db, medicine_id)
