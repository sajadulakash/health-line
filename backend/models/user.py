from sqlalchemy import Column, BigInteger, String
from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    password = Column(String(255), nullable=True)
    role = Column(String(40), nullable=False)
