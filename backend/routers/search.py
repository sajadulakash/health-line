from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services import search_service

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("/")
def search(
    q: str = Query(..., min_length=1, description="Search query"),
    db: Session = Depends(get_db),
):
    """
    Search medicines by name, generic name, brand, or category.
    If a result is out of stock, suggests alternatives automatically.
    """
    return search_service.search_with_alternatives(db, q)
