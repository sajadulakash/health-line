from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from backend.database import get_db
from backend.models.third_party_sale import ThirdPartySale

router = APIRouter(prefix="/api/third-party-sales", tags=["Third Party Sales"])


class ThirdPartySaleCreate(BaseModel):
    source_shop: Optional[str] = None
    buying_price: float
    sale_price: float


class ThirdPartySaleOut(BaseModel):
    id: int
    source_shop: Optional[str]
    buying_price: float
    sale_price: float
    date: Optional[datetime]

    class Config:
        from_attributes = True


@router.post("/", response_model=ThirdPartySaleOut)
def create_third_party_sale(data: ThirdPartySaleCreate, db: Session = Depends(get_db)):
    record = ThirdPartySale(
        source_shop=data.source_shop,
        buying_price=data.buying_price,
        sale_price=data.sale_price,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/")
def list_third_party_sales(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(ThirdPartySale).order_by(ThirdPartySale.date.desc()).offset(skip).limit(limit).all()


@router.delete("/{sale_id}")
def delete_third_party_sale(sale_id: int, db: Session = Depends(get_db)):
    record = db.query(ThirdPartySale).filter(ThirdPartySale.id == sale_id).first()
    if not record:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Third party sale not found")
    db.delete(record)
    db.commit()
    return {"detail": "Third party sale deleted"}
