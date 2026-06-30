"""
HeptaCert PDF Digital Signing
Uses pyHanko to apply an invisible cryptographic signature to generated PDFs.
On first run, a self-signed certificate is created and reused.
"""

from __future__ import annotations

import io
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

logger = logging.getLogger("heptacert.signing")

_CERT_DIR = Path(__file__).parent
_P12_PATH = _CERT_DIR / "signing_cert.p12"


def _p12_password() -> bytes:
    # Env-overridable (PDF_SIGNING_P12_PASSWORD); legacy default keeps existing certs openable.
    try:
        from .config import settings
        return (settings.pdf_signing_p12_password or "heptacert-internal").encode()
    except Exception:
        return b"heptacert-internal"


_P12_PASSWORD = _p12_password()


def _ensure_self_signed_cert() -> None:
    """Generate a self-signed P12 certificate if one does not exist."""
    if _P12_PATH.exists():
        return

    logger.info("Generating self-signed signing certificate at %s", _P12_PATH)

    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives.serialization import pkcs12

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "TR"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "HeptaCert"),
        x509.NameAttribute(NameOID.COMMON_NAME, "HeptaCert Document Signing"),
    ])

    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + timedelta(days=3650))  # 10 years
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True, content_commitment=True,
                key_encipherment=False, data_encipherment=False,
                key_agreement=False, key_cert_sign=False,
                crl_sign=False, encipher_only=False, decipher_only=False,
            ),
            critical=True,
        )
        .sign(key, hashes.SHA256())
    )

    p12_bytes = pkcs12.serialize_key_and_certificates(
        name=b"HeptaCert",
        key=key,
        cert=cert,
        cas=None,
        encryption_algorithm=serialization.BestAvailableEncryption(_P12_PASSWORD),
    )
    _P12_PATH.write_bytes(p12_bytes)
    logger.info("Self-signed signing certificate created.")


def sign_pdf(pdf_bytes: bytes) -> bytes:
    """
    Apply an invisible pyHanko signature to a PDF.
    Returns signed PDF bytes.
    Falls back to original bytes if signing fails (non-fatal).
    """
    try:
        _ensure_self_signed_cert()

        from pyhanko.sign import signers, fields
        from pyhanko.sign.fields import SigFieldSpec
        from pyhanko_certvalidator import CertificateValidator
        from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter

        # Load signer from P12
        signer = signers.SimpleSigner.load_pkcs12(
            pfx_file=str(_P12_PATH),
            passphrase=_P12_PASSWORD,
        )

        # Write into an in-memory buffer
        in_buf = io.BytesIO(pdf_bytes)
        writer = IncrementalPdfFileWriter(in_buf)

        # Add invisible signature field
        fields.append_signature_field(
            writer,
            SigFieldSpec(sig_field_name="HeptaCertSig", on_page=0),
        )

        out_buf = io.BytesIO()
        signers.sign_pdf(
            writer,
            signers.PdfSignatureMetadata(
                field_name="HeptaCertSig",
                reason="Issued by HeptaCert™",
                location="heptacert.com",
                certify=False,
            ),
            signer=signer,
            output=out_buf,
        )
        return out_buf.getvalue()

    except Exception as exc:
        logger.warning("PDF signing failed (non-fatal): %s", exc)
        return pdf_bytes
