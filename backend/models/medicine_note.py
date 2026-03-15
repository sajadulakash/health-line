from sqlalchemy import Column, BigInteger, Integer, Text, UniqueConstraint, ForeignKey
from backend.database import Base


class MedicineNote(Base):
    __tablename__ = "medicine_note"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, default=1)
    medicine_id = Column(BigInteger, ForeignKey("medicine.id", ondelete="CASCADE"), nullable=False)
    note = Column(Text, nullable=False, default="")

    __table_args__ = (
        UniqueConstraint("user_id", "medicine_id", name="uq_user_medicine_note"),
    )
