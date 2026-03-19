from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any

from backend.models.sale import Sale
from backend.models.sale_order import SaleOrder
from backend.models.batch import Batch
from backend.models.medicine import Medicine


def get_profit_report(db: Session, period: str = "daily") -> Dict[str, Any]:
    """
    Get profit report for a given period: daily, weekly, monthly.
    Returns summary + orders with items grouped by sale_order_id.
    """
    now = datetime.now()
    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "weekly":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    else:  # monthly
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Get sale orders in this period
    orders = (
        db.query(SaleOrder)
        .filter(SaleOrder.created_at >= start)
        .order_by(SaleOrder.created_at.desc())
        .all()
    )

    # Precompute original batch quantities for per-unit cost
    batch_total_sold = {}
    all_sales = db.query(Sale.batch_id, func.sum(Sale.quantity_sold)).group_by(Sale.batch_id).all()
    for bid, total in all_sales:
        batch_total_sold[bid] = int(total or 0)

    # Build batch info cache
    batch_cache = {}
    all_batches = db.query(Batch).all()
    for b in all_batches:
        batch_cache[b.id] = b

    # Medicine cache
    med_cache = {}
    all_meds = db.query(Medicine).all()
    for m in all_meds:
        med_cache[m.id] = m

    total_buying = 0
    total_selling = 0
    order_list = []

    for order in orders:
        items = []
        order_buy = 0
        order_sell = 0
        # Determine if sale_price is a line total (POS with discount) or per-unit (StockOut)
        discount_pct = float(order.discount_pct or 0)
        is_line_total = discount_pct > 0

        for sale in (order.items or []):
            qty = sale.quantity_sold or 0
            batch = batch_cache.get(sale.batch_id)
            med = med_cache.get(batch.medicine_id) if batch else None
            if batch:
                original_qty = (batch.quantity or 0) + batch_total_sold.get(batch.id, 0)
                buy_unit = float(batch.purchase_price or 0) / original_qty if original_qty > 0 else 0
            else:
                buy_unit = 0
            sale_price_val = float(sale.sale_price or 0)
            if is_line_total:
                sell_total = sale_price_val
                sell_unit = sell_total / qty if qty > 0 else 0
            else:
                sell_unit = sale_price_val
                sell_total = sell_unit * qty
            buy_total = buy_unit * qty
            profit = sell_total - buy_total
            order_buy += buy_total
            order_sell += sell_total
            items.append({
                "sale_id": sale.id,
                "medicine_name": med.name if med else "—",
                "brand": med.brand if med else "",
                "batch_number": batch.batch_number if batch else "—",
                "quantity": qty,
                "buying_price": round(buy_unit, 2),
                "selling_price": round(sell_unit, 2),
                "total_buying": round(buy_total, 2),
                "total_selling": round(sell_total, 2),
                "profit": round(profit, 2),
            })
        total_buying += order_buy
        total_selling += order_sell
        order_list.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "discount_pct": float(order.discount_pct or 0),
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "total_buying": round(order_buy, 2),
            "total_selling": round(order_sell, 2),
            "profit": round(order_sell - order_buy, 2),
            "items": items,
        })

    return {
        "period": period,
        "start": start.isoformat(),
        "total_buying": round(total_buying, 2),
        "total_selling": round(total_selling, 2),
        "total_profit": round(total_selling - total_buying, 2),
        "order_count": len(order_list),
        "orders": order_list,
    }


def get_top_selling(db: Session, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Get top-selling products sorted by total quantity sold.
    Aggregates sales across all batches of the same medicine.
    """
    results = (
        db.query(
            Medicine.id,
            Medicine.name,
            Medicine.brand,
            Medicine.generic_name,
            Medicine.category,
            func.coalesce(func.sum(Sale.quantity_sold), 0).label("total_sold"),
        )
        .join(Batch, Batch.medicine_id == Medicine.id)
        .join(Sale, Sale.batch_id == Batch.id)
        .group_by(Medicine.id, Medicine.name, Medicine.brand, Medicine.generic_name, Medicine.category)
        .order_by(func.sum(Sale.quantity_sold).desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "medicine_id": r.id,
            "name": r.name,
            "brand": r.brand,
            "generic_name": r.generic_name,
            "category": r.category,
            "total_sold": int(r.total_sold),
        }
        for r in results
    ]
