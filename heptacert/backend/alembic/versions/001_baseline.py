"""Baseline — existing tables created by SQLAlchemy create_all + legacy SQL migrations.

Revision ID: 001baseline
Revises:
Create Date: 2026-03-01

This migration is a no-op for existing databases.
Tables will be created by initial database setup.
"""
from __future__ import annotations

revision: str = "001baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """No-op migration - tables created during initialization."""
    pass


def downgrade() -> None:
    pass
