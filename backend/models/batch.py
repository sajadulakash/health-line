from sqlalchemy import Column, BigInteger, String, Integer, Numeric, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from backend.database import Base


class Batch(Base):
    __tablename__ = "batch"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    medicine_id = Column(BigInteger, ForeignKey("medicine.id"), nullable=True)
    batch_number = Column(String(80), nullable=True)
    purchase_price = Column(Numeric(12, 2), nullable=True)
    quantity = Column(Integer, nullable=True)
    initial_quantity = Column(Integer, nullable=True)
    expiration_date = Column(Date, nullable=True)
    selling_price = Column(Numeric(12, 2), nullable=True)
    # Set automatically for new batches; existing pre-migration rows stay NULL
    created_at = Column(DateTime, nullable=True, server_default=func.now())

    # Relationships
    medicine = relationship("Medicine", back_populates="batches")
    sales = relationship("Sale", back_populates="batch", lazy="selectin")
