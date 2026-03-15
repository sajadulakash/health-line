from sqlalchemy import Column, BigInteger, Integer, Numeric, DateTime, String, ForeignKey, func
from sqlalchemy.orm import relationship
from backend.database import Base


class Sale(Base):
    __tablename__ = "sale"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_id = Column(BigInteger, ForeignKey("batch.id"), nullable=True)
    sale_order_id = Column(BigInteger, ForeignKey("sale_order.id"), nullable=True)
    sale_number = Column(String(80), nullable=True)
    quantity_sold = Column(Integer, nullable=True)
    sale_price = Column(Numeric(12, 2), nullable=True)
    sale_date = Column(DateTime, server_default=func.now())

    # Relationships
    batch = relationship("Batch", back_populates="sales")
    sale_order = relationship("SaleOrder", back_populates="items")
