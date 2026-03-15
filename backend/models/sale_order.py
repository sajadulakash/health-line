from sqlalchemy import Column, BigInteger, String, DateTime, Numeric, func
from sqlalchemy.orm import relationship
from backend.database import Base


class SaleOrder(Base):
    __tablename__ = "sale_order"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_number = Column(String(80), nullable=True)
    discount_pct = Column(Numeric(5, 2), default=0)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    items = relationship("Sale", back_populates="sale_order", lazy="selectin")
