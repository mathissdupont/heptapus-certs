"""Follow-up no-op migration after registration_answers column addition.

Revision ID: 019_reg_answers_guard
Revises: 018_att_reg_answers
Create Date: 2026-04-05
"""


revision = "019_reg_answers_guard"
down_revision = "018_att_reg_answers"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
