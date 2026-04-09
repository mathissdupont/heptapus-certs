"""Add comment nesting support for community post comments.

Revision ID: 020_comment_nesting
Revises: 019_reg_answers_guard
Create Date: 2026-04-09

This migration adds:
- parent_comment_id foreign key for nested replies (nullable)
- Index on parent_comment_id for query performance
- Enforces max depth of 2-3 levels via application logic
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision = "020_comment_nesting"
down_revision = "019_reg_answers_guard"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add parent_comment_id column to support nested comment replies."""
    
    # Add parent_comment_id column (nullable, initially all are top-level)
    op.add_column(
        'community_post_comments',
        sa.Column(
            'parent_comment_id',
            sa.Integer,
            sa.ForeignKey('community_post_comments.id', ondelete='CASCADE'),
            nullable=True
        )
    )
    
    # Add index for efficient nested comment queries
    op.create_index(
        'ix_community_post_comments_parent_id',
        'community_post_comments',
        ['parent_comment_id']
    )
    
    # Add upvote/downvote support columns
    op.add_column(
        'community_post_comments',
        sa.Column('upvote_count', sa.Integer, server_default='0', nullable=False)
    )
    op.add_column(
        'community_post_comments',
        sa.Column('downvote_count', sa.Integer, server_default='0', nullable=False)
    )
    
    # Create vote tracking table for comments (like posts have)
    op.create_table(
        'community_comment_votes',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('comment_id', sa.Integer, sa.ForeignKey('community_post_comments.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('member_id', sa.Integer, sa.ForeignKey('public_members.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('vote_type', sa.String(20), nullable=False),  # 'upvote', 'downvote', or 'none'
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('comment_id', 'member_id', name='uq_comment_member_vote')
    )
    
    op.create_index(
        'ix_community_comment_votes_member',
        'community_comment_votes',
        ['member_id']
    )


def downgrade() -> None:
    """Rollback nested comment support."""
    
    # Drop vote tracking table
    op.drop_table('community_comment_votes')
    
    # Drop upvote/downvote columns
    op.drop_column('community_post_comments', 'downvote_count')
    op.drop_column('community_post_comments', 'upvote_count')
    
    # Drop parent_comment_id index and column
    op.drop_index('ix_community_post_comments_parent_id')
    op.drop_column('community_post_comments', 'parent_comment_id')
