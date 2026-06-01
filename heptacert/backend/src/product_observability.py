"""Lightweight observability hooks for product endpoints."""

import logging
from time import perf_counter

from fastapi import FastAPI, Request

logger = logging.getLogger("heptacert")


PRODUCT_PATH_PREFIXES = (
    "/api/admin/crm",
    "/api/admin/training",
    "/api/admin/events",
    "/api/admin/certificate-template-presets",
)


def install_product_observability(app: FastAPI, *, slow_ms: int = 750) -> None:
    @app.middleware("http")
    async def product_response_time_logger(request: Request, call_next):
        started = perf_counter()
        response = await call_next(request)
        elapsed_ms = int((perf_counter() - started) * 1000)
        path = request.url.path
        if elapsed_ms >= slow_ms and path.startswith(PRODUCT_PATH_PREFIXES):
            logger.info(
                "Product endpoint slow response: method=%s path=%s status=%s elapsed_ms=%s",
                request.method,
                path,
                response.status_code,
                elapsed_ms,
            )
        response.headers["X-HeptaCert-Response-Time-Ms"] = str(elapsed_ms)
        return response
