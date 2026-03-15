from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from backend.database import get_db
from backend.services import analytics_service
from backend.services import batch_service
from backend.schemas.batch import BatchResponse

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/top-selling")
def top_selling(
    limit: int = Query(20, description="Number of top products to return"),
    db: Session = Depends(get_db),
):
    """Get top-selling products sorted by total quantity sold."""
    return analytics_service.get_top_selling(db, limit=limit)


@router.get("/profit-report")
def profit_report(
    period: str = Query("daily", description="daily, weekly, or monthly"),
    db: Session = Depends(get_db),
):
    """Get profit report for a given period."""
    return analytics_service.get_profit_report(db, period=period)


@router.get("/expiring-soon", response_model=List[BatchResponse])
def expiring_soon(
    days: int = Query(90, description="Days from today"),
    limit: int = Query(50),
    db: Session = Depends(get_db),
):
    """Get soonest-to-expire stock."""
    return batch_service.get_expiring_soon(db, days=days, limit=limit)
