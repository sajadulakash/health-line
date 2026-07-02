"""add_strip_size_to_medicine

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-02 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable: existing medicines keep NULL (unknown strip size);
    # it can be filled in later per medicine.
    op.add_column('medicine', sa.Column('strip_size', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('medicine', 'strip_size')
