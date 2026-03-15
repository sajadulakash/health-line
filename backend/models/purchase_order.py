from sqlalchemy import Column, BigInteger, String, Numeric, Date
from backend.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_order"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    supplier = Column(String(200), nullable=True)
    order_date = Column(Date, nullable=True)
    total_amount = Column(Numeric(12, 2), nullable=True)
