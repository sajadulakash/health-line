from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, func
from typing import List, Optional

from backend.models.medicine import Medicine
from backend.schemas.medicine import MedicineCreate, MedicineUpdate


def create_medicine(db: Session, data: MedicineCreate) -> Medicine:
    """Create a medicine — if one with the same name (case-insensitive) already
    exists, return the existing record instead of creating a duplicate."""
    existing = (
        db.query(Medicine)
        .filter(func.lower(func.trim(Medicine.name)) == data.name.strip().lower())
        .first()
    )
    if existing:
        # Update empty fields on the existing record if the caller supplied them
        changed = False
        for field in ("generic_name", "category", "brand", "strip_size"):
            new_val = getattr(data, field, None)
            if new_val and not getattr(existing, field):
                setattr(existing, field, new_val)
                changed = True
        if changed:
            db.commit()
            db.refresh(existing)
        return existing

    medicine = Medicine(**data.model_dump())
    db.add(medicine)
    db.commit()
    db.refresh(medicine)
    return medicine


def get_medicine(db: Session, medicine_id: int) -> Optional[Medicine]:
    # Returned as MedicineWithBatches — eager-load batches for this one medicine.
    return (
        db.query(Medicine)
        .options(selectinload(Medicine.batches))
        .filter(Medicine.id == medicine_id)
        .first()
    )


def get_medicines(db: Session, skip: int = 0, limit: int = 100) -> List[Medicine]:
    return db.query(Medicine).order_by(Medicine.name).offset(skip).limit(limit).all()


def update_medicine(db: Session, medicine_id: int, data: MedicineUpdate) -> Optional[Medicine]:
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(medicine, key, value)
    db.commit()
    db.refresh(medicine)
    return medicine


def delete_medicine(db: Session, medicine_id: int) -> bool:
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        return False
    db.delete(medicine)
    db.commit()
    return True


def search_medicines(db: Session, query: str) -> List[Medicine]:
    """Search medicines by name, generic_name, brand, or category."""
    pattern = f"%{query}%"
    return db.query(Medicine).filter(
        or_(
            Medicine.name.ilike(pattern),
            Medicine.generic_name.ilike(pattern),
            Medicine.brand.ilike(pattern),
            Medicine.category.ilike(pattern),
        )
    ).all()


def find_alternatives(db: Session, medicine_id: int) -> List[Medicine]:
    """Find alternative medicines with the same generic_name or category."""
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        return []

    filters = []
    if medicine.generic_name:
        filters.append(Medicine.generic_name.ilike(f"%{medicine.generic_name}%"))
    if medicine.category:
        filters.append(Medicine.category.ilike(f"%{medicine.category}%"))

    if not filters:
        return []

    return (
        db.query(Medicine)
        .options(selectinload(Medicine.batches))
        .filter(Medicine.id != medicine_id, or_(*filters))
        .all()
    )
