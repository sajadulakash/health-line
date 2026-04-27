from sqlalchemy import Column, BigInteger, Numeric, String, DateTime, func
from backend.database import Base


class ThirdPartySale(Base):
    __tablename__ = "third_party_sale"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    source_shop = Column(String(200), nullable=True)
    buying_price = Column(Numeric(12, 2), nullable=False)
    sale_price = Column(Numeric(12, 2), nullable=False)
    date = Column(DateTime, server_default=func.now())
