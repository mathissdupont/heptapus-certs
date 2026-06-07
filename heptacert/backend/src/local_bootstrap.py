from __future__ import annotations

import asyncio

import sqlalchemy as sa

from .main import Base, engine


def _has_column(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _add_column_if_missing(sync_conn: sa.Connection, inspector: sa.Inspector, table_name: str, ddl: str) -> None:
    column_name = ddl.split()[0].strip('"')
    if not _has_column(inspector, table_name, column_name):
        sync_conn.execute(sa.text(f'ALTER TABLE "{table_name}" ADD COLUMN {ddl}'))


def _sync_additive_schema(sync_conn: sa.Connection) -> None:
    inspector = sa.inspect(sync_conn)
    table_names = set(inspector.get_table_names())
    if "events" not in table_names:
        return

    _add_column_if_missing(sync_conn, inspector, "events", '"event_type" VARCHAR(64) NOT NULL DEFAULT \'certificate_event\'')
    _add_column_if_missing(sync_conn, inspector, "events", '"certificate_enabled" BOOLEAN NOT NULL DEFAULT TRUE')
    _add_column_if_missing(sync_conn, inspector, "events", '"checkin_enabled" BOOLEAN NOT NULL DEFAULT TRUE')
    _add_column_if_missing(sync_conn, inspector, "events", '"ticketing_enabled" BOOLEAN NOT NULL DEFAULT FALSE')
    _add_column_if_missing(sync_conn, inspector, "events", '"registration_enabled" BOOLEAN NOT NULL DEFAULT TRUE')
    _add_column_if_missing(sync_conn, inspector, "events", '"requires_approval" BOOLEAN NOT NULL DEFAULT FALSE')
    _add_column_if_missing(sync_conn, inspector, "events", '"raffles_enabled" BOOLEAN NOT NULL DEFAULT FALSE')
    _add_column_if_missing(sync_conn, inspector, "events", '"gamification_enabled" BOOLEAN NOT NULL DEFAULT FALSE')

    if "attendees" in table_names:
        _add_column_if_missing(sync_conn, inspector, "attendees", '"unsubscribed_at" TIMESTAMP WITH TIME ZONE')

    if "users" in table_names:
        _add_column_if_missing(sync_conn, inspector, "users", '"deleted_at" TIMESTAMP WITH TIME ZONE')

    if "public_members" in table_names:
        _add_column_if_missing(sync_conn, inspector, "public_members", '"deleted_at" TIMESTAMP WITH TIME ZONE')

    if "email_delivery_logs" in table_names:
        _add_column_if_missing(sync_conn, inspector, "email_delivery_logs", '"clicked_at" TIMESTAMP WITH TIME ZONE')
        _add_column_if_missing(sync_conn, inspector, "email_delivery_logs", '"click_count" INTEGER NOT NULL DEFAULT 0')
        _add_column_if_missing(sync_conn, inspector, "email_delivery_logs", '"open_count" INTEGER NOT NULL DEFAULT 0')

    if "bulk_email_jobs" in table_names:
        _add_column_if_missing(sync_conn, inspector, "bulk_email_jobs", '"scheduled_at" TIMESTAMP WITH TIME ZONE')
        _add_column_if_missing(sync_conn, inspector, "bulk_email_jobs", '"cron_expression" VARCHAR(120)')

    if "superadmin_bulk_email_jobs" in table_names:
        _add_column_if_missing(sync_conn, inspector, "superadmin_bulk_email_jobs", '"job_kind" VARCHAR(32) NOT NULL DEFAULT \'manual\'')

    if "training_courses" in table_names:
        _add_column_if_missing(sync_conn, inspector, "training_courses", '"is_marketplace_listed" BOOLEAN NOT NULL DEFAULT FALSE')
        _add_column_if_missing(sync_conn, inspector, "training_courses", '"marketplace_price" NUMERIC(10, 2)')
        _add_column_if_missing(sync_conn, inspector, "training_courses", '"marketplace_description" TEXT')
        _add_column_if_missing(sync_conn, inspector, "training_courses", '"preview_video_url" TEXT')

    if "course_modules" in table_names:
        _add_column_if_missing(sync_conn, inspector, "course_modules", '"quiz_id" INTEGER')
        _add_column_if_missing(sync_conn, inspector, "course_modules", '"lti_tool_id" INTEGER')
        _add_column_if_missing(sync_conn, inspector, "course_modules", '"lti_custom_params" TEXT')

    if "course_enrollments" in table_names:
        _add_column_if_missing(sync_conn, inspector, "course_enrollments", '"final_grade" INTEGER')
        _add_column_if_missing(sync_conn, inspector, "course_enrollments", '"cert_pdf_url" TEXT')
        _add_column_if_missing(sync_conn, inspector, "course_enrollments", '"status" VARCHAR(32) NOT NULL DEFAULT \'enrolled\'')

    if "lms_journey_enrollments" in table_names:
        _add_column_if_missing(sync_conn, inspector, "lms_journey_enrollments", '"cert_pdf_url" TEXT')


def _create_schema_if_empty(sync_conn: sa.Connection) -> None:
    inspector = sa.inspect(sync_conn)
    table_names = set(inspector.get_table_names())
    app_tables = table_names - {"alembic_version"}
    if not app_tables:
        Base.metadata.create_all(sync_conn)


async def _create_schema() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(_create_schema_if_empty)
        await conn.run_sync(_sync_additive_schema)


def main() -> None:
    asyncio.run(_create_schema())


if __name__ == "__main__":
    main()
