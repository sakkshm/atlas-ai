"""add timezone column to users table

Revision ID: f1a2b3c4d5e6
Revises: 2e733f087366
Create Date: 2026-07-23 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "2e733f087366"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"))


def downgrade() -> None:
    op.drop_column("users", "timezone")
