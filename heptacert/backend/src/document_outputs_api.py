"""Official document output endpoints for logs and operational reports."""

from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field

from .document_outputs import render_log_document_body, render_log_document_pdf_bytes, render_official_document_html
from .main import CurrentUser, get_current_user

router = APIRouter(prefix="/api/admin/document-outputs", tags=["document-outputs"])


class OfficialLogDocumentIn(BaseModel):
    title: str = Field(default="Resmi Kayit Ciktisi", max_length=160)
    document_no: str | None = Field(default=None, max_length=80)
    intro: str | None = Field(default=None, max_length=1000)
    summary: dict[str, Any] | None = None
    records: list[dict[str, Any]] = Field(default_factory=list)
    columns: list[str] | None = None
    left_signer_name: str = Field(default="Heptapus Group", max_length=120)
    left_signer_title: str = Field(default="Yetkili Birim", max_length=120)
    right_signer_name: str = Field(default="HeptaCert", max_length=120)
    right_signer_title: str = Field(default="Sistem Kaydi", max_length=120)


@router.post("/official-log", response_class=HTMLResponse)
async def render_official_log_document(
    payload: OfficialLogDocumentIn,
    _me: CurrentUser = Depends(get_current_user),
):
    body_html = render_log_document_body(
        summary=payload.summary,
        records=payload.records,
        columns=payload.columns,
        intro=payload.intro,
    )
    html = render_official_document_html(
        title=payload.title,
        body_html=body_html,
        document_no=payload.document_no,
        left_signer_name=payload.left_signer_name,
        left_signer_title=payload.left_signer_title,
        right_signer_name=payload.right_signer_name,
        right_signer_title=payload.right_signer_title,
    )
    return HTMLResponse(html)


@router.post("/official-log/pdf")
async def render_official_log_document_pdf(
    payload: OfficialLogDocumentIn,
    _me: CurrentUser = Depends(get_current_user),
):
    pdf = render_log_document_pdf_bytes(
        title=payload.title,
        summary=payload.summary,
        records=payload.records,
        columns=payload.columns,
        intro=payload.intro,
        document_no=payload.document_no,
        left_signer_name=payload.left_signer_name,
        left_signer_title=payload.left_signer_title,
        right_signer_name=payload.right_signer_name,
        right_signer_title=payload.right_signer_title,
    )
    return Response(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="official-log.pdf"'},
    )
