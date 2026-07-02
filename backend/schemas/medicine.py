from pydantic import BaseModel, field_validator
from typing import Optional, List
from backend.schemas.batch import BatchResponse


def _strip(v: Optional[str]) -> Optional[str]:
    """Strip leading/trailing whitespace from string fields."""
    return v.strip() if isinstance(v, str) else v


# ---------- Medicine ----------
class MedicineCreate(BaseModel):
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    strip_size: Optional[int] = None

    @field_validator("name", "generic_name", "category", "brand", mode="before")
    @classmethod
    def strip_strings(cls, v):
        return _strip(v)


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    strip_size: Optional[int] = None

    @field_validator("name", "generic_name", "category", "brand", mode="before")
    @classmethod
    def strip_strings(cls, v):
        return _strip(v)


class MedicineResponse(BaseModel):
    id: int
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    strip_size: Optional[int] = None

    class Config:
        from_attributes = True


class MedicineWithBatches(MedicineResponse):
    batches: List[BatchResponse] = []

    class Config:
        from_attributes = True
