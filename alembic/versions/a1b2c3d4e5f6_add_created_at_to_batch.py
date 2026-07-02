"""add_created_at_to_batch

Revision ID: a1b2c3d4e5f6
Revises: 86677ff09934
Create Date: 2026-07-02 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '86677ff09934'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the column WITHOUT a default first, so all existing batches stay NULL
    # (they have no known creation date and should show none in the UI).
    op.add_column('batch', sa.Column('created_at', sa.DateTime(), nullable=True))
    # Only set the default afterwards, so future inserts get now() automatically
    # while existing rows are left untouched (NULL).
    op.alter_column('batch', 'created_at', server_default=sa.text('now()'))


def downgrade() -> None:
    op.drop_column('batch', 'created_at')
