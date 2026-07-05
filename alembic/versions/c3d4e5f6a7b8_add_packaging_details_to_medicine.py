"""add_packaging_details_to_medicine

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-05 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable free-text column for long packaging notes; existing rows stay NULL.
    op.add_column('medicine', sa.Column('packaging_details', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('medicine', 'packaging_details')
