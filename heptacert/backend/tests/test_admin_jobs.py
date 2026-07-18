"""Regression tests for the admin Job Center (/api/admin/jobs).

Covers the fixes: document-export (report) jobs are now listed, and a superadmin sees
jobs created by other users (not only their own).
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from src.models import User
from src.main import SessionLocal, Role, app, create_access_token


@pytest.mark.asyncio
async def test_admin_jobs_lists_document_exports_and_superadmin_sees_others():
    from src.document_export_jobs import DocumentExportJob

    async with SessionLocal() as sess:
        async with sess.begin():
            admin = User(email=f"jobs-adm-{uuid.uuid4().hex[:8]}@test.com", password_hash="x", role=Role.admin)
            sess.add(admin)
            await sess.flush()
            superadmin = User(email=f"jobs-super-{uuid.uuid4().hex[:8]}@test.com", password_hash="x", role=Role.superadmin)
            sess.add(superadmin)
            await sess.flush()
            job = DocumentExportJob(
                export_type="audit_logs",
                export_format="pdf",
                requested_by=admin.id,          # created by the admin, NOT the superadmin
                status="completed",
                row_count=5,
                output_file_path="exports/report.pdf",
                output_filename="report.pdf",
            )
            sess.add(job)
            await sess.flush()
            super_id, job_id = superadmin.id, job.id

    token = create_access_token(user_id=super_id, role=Role.superadmin)
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/admin/jobs?limit=60", headers=headers)

    assert res.status_code == 200
    jobs = res.json()["jobs"]
    doc = next((j for j in jobs if j["type"] == "document_export" and j["id"] == job_id), None)
    assert doc is not None, "document export job should be listed for the superadmin"
    assert doc["can_download"] is True
    assert doc["download_url"] == f"/api/admin/document-export-jobs/{job_id}/download"


@pytest.mark.asyncio
async def test_admin_jobs_non_superadmin_only_sees_own_document_exports():
    from src.document_export_jobs import DocumentExportJob

    async with SessionLocal() as sess:
        async with sess.begin():
            owner = User(email=f"jobs-owner-{uuid.uuid4().hex[:8]}@test.com", password_hash="x", role=Role.admin)
            sess.add(owner)
            await sess.flush()
            other = User(email=f"jobs-other-{uuid.uuid4().hex[:8]}@test.com", password_hash="x", role=Role.admin)
            sess.add(other)
            await sess.flush()
            job = DocumentExportJob(
                export_type="audit_logs", export_format="csv", requested_by=owner.id,
                status="completed", row_count=1, output_file_path="exports/o.csv", output_filename="o.csv",
            )
            sess.add(job)
            await sess.flush()
            other_id, job_id = other.id, job.id

    token = create_access_token(user_id=other_id, role=Role.admin)
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/admin/jobs?limit=60", headers=headers)

    assert res.status_code == 200
    ids = [j["id"] for j in res.json()["jobs"] if j["type"] == "document_export"]
    assert job_id not in ids, "an admin must not see another admin's document export job"
