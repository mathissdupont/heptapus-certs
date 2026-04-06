"""Add premium community feed tables.

Revision ID: 028_soc_feed
Revises: 027_org_public_profile_follow
Create Date: 2026-04-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "028_soc_feed"
down_revision = "027_org_public_profile_follow"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if "community_posts" not in inspector.get_table_names():
        op.create_table(
            "community_posts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("public_id", sa.String(length=64), nullable=False),
            sa.Column("org_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("author_public_member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="SET NULL"), nullable=True),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="visible"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_community_posts_public_id", "community_posts", ["public_id"], unique=True)
        op.create_index("ix_community_posts_org_id", "community_posts", ["org_id"], unique=False)
        op.create_index("ix_community_posts_author_user_id", "community_posts", ["author_user_id"], unique=False)
        op.create_index("ix_community_posts_author_public_member_id", "community_posts", ["author_public_member_id"], unique=False)
        op.create_index("ix_community_posts_status", "community_posts", ["status"], unique=False)

    if "community_post_likes" not in inspector.get_table_names():
        op.create_table(
            "community_post_likes",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("post_id", sa.Integer(), sa.ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("public_member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("post_id", "public_member_id", name="uq_comm_post_like_member"),
        )
        op.create_index("ix_community_post_likes_post_id", "community_post_likes", ["post_id"], unique=False)
        op.create_index("ix_community_post_likes_public_member_id", "community_post_likes", ["public_member_id"], unique=False)

    if "community_post_comments" not in inspector.get_table_names():
        op.create_table(
            "community_post_comments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("post_id", sa.Integer(), sa.ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("public_member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="visible"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_community_post_comments_post_id", "community_post_comments", ["post_id"], unique=False)
        op.create_index("ix_community_post_comments_public_member_id", "community_post_comments", ["public_member_id"], unique=False)
        op.create_index("ix_community_post_comments_status", "community_post_comments", ["status"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if "community_post_comments" in inspector.get_table_names():
        indexes = {index["name"] for index in inspector.get_indexes("community_post_comments")}
        if "ix_community_post_comments_status" in indexes:
            op.drop_index("ix_community_post_comments_status", table_name="community_post_comments")
        if "ix_community_post_comments_public_member_id" in indexes:
            op.drop_index("ix_community_post_comments_public_member_id", table_name="community_post_comments")
        if "ix_community_post_comments_post_id" in indexes:
            op.drop_index("ix_community_post_comments_post_id", table_name="community_post_comments")
        op.drop_table("community_post_comments")

    if "community_post_likes" in inspector.get_table_names():
        indexes = {index["name"] for index in inspector.get_indexes("community_post_likes")}
        if "ix_community_post_likes_public_member_id" in indexes:
            op.drop_index("ix_community_post_likes_public_member_id", table_name="community_post_likes")
        if "ix_community_post_likes_post_id" in indexes:
            op.drop_index("ix_community_post_likes_post_id", table_name="community_post_likes")
        op.drop_table("community_post_likes")

    if "community_posts" in inspector.get_table_names():
        indexes = {index["name"] for index in inspector.get_indexes("community_posts")}
        if "ix_community_posts_status" in indexes:
            op.drop_index("ix_community_posts_status", table_name="community_posts")
        if "ix_community_posts_author_public_member_id" in indexes:
            op.drop_index("ix_community_posts_author_public_member_id", table_name="community_posts")
        if "ix_community_posts_author_user_id" in indexes:
            op.drop_index("ix_community_posts_author_user_id", table_name="community_posts")
        if "ix_community_posts_org_id" in indexes:
            op.drop_index("ix_community_posts_org_id", table_name="community_posts")
        if "ix_community_posts_public_id" in indexes:
            op.drop_index("ix_community_posts_public_id", table_name="community_posts")
        op.drop_table("community_posts")
