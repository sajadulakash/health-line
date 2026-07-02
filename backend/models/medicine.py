from sqlalchemy import Column, BigInteger, Integer, String
from sqlalchemy.orm import relationship
from backend.database import Base


class Medicine(Base):
    __tablename__ = "medicine"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    generic_name = Column(String(200), nullable=True)
    category = Column(String(120), nullable=True)
    brand = Column(String(120), nullable=True)
    image_url = Column(String(500), nullable=True)
    strip_size = Column(Integer, nullable=True)  # units (e.g. tablets) per strip

    # Relationships
    batches = relationship("Batch", back_populates="medicine", lazy="selectin", cascade="all, delete-orphan")
