from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Dict, Any

from backend.models.medicine import Medicine
from backend.models.batch import Batch


def search_with_alternatives(db: Session, query: str) -> Dict[str, Any]:
    """
    Search for medicines. If a match is out of stock (all batches qty=0),
    suggest alternatives based on generic_name or category.
    """
    pattern = f"%{query}%"

    # Search for matching medicines
    matches = (
        db.query(Medicine)
        .filter(
            or_(
                Medicine.name.ilike(pattern),
                Medicine.generic_name.ilike(pattern),
                Medicine.brand.ilike(pattern),
                Medicine.category.ilike(pattern),
            )
        )
        .all()
    )

    results = []
    out_of_stock_ids = []

    for med in matches:
        total_qty = (
            db.query(func.coalesce(func.sum(Batch.quantity), 0))
            .filter(Batch.medicine_id == med.id)
            .scalar()
        )
        item = {
            "id": med.id,
            "name": med.name,
            "brand": med.brand,
            "generic_name": med.generic_name,
            "category": med.category,
            "total_stock": int(total_qty),
            "in_stock": int(total_qty) > 0,
        }
        results.append(item)
        if int(total_qty) <= 0:
            out_of_stock_ids.append(med.id)

    # Find alternatives for out-of-stock items
    alternatives = []
    if out_of_stock_ids:
        # Collect generic names & categories of out-of-stock medicines
        oos_medicines = [m for m in matches if m.id in out_of_stock_ids]
        alt_filters = []
        for med in oos_medicines:
            if med.generic_name:
                alt_filters.append(Medicine.generic_name.ilike(f"%{med.generic_name}%"))
            if med.category:
                alt_filters.append(Medicine.category.ilike(f"%{med.category}%"))

        if alt_filters:
            alt_medicines = (
                db.query(Medicine)
                .filter(
                    Medicine.id.notin_(out_of_stock_ids),
                    or_(*alt_filters),
                )
                .all()
            )
            for med in alt_medicines:
                total_qty = (
                    db.query(func.coalesce(func.sum(Batch.quantity), 0))
                    .filter(Batch.medicine_id == med.id)
                    .scalar()
                )
                if int(total_qty) > 0:
                    alternatives.append({
                        "id": med.id,
                        "name": med.name,
                        "brand": med.brand,
                        "generic_name": med.generic_name,
                        "category": med.category,
                        "total_stock": int(total_qty),
                    })

    return {
        "results": results,
        "alternatives": alternatives,
    }
