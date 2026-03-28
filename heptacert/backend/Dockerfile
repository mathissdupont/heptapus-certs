FROM python:3.12-slim

WORKDIR /app

# Avoid apt cache usage on low-disk hosts: download only required font files.
RUN mkdir -p /usr/share/fonts/truetype/dejavu && \
    set -eux; \
    for f in \
        DejaVuSans.ttf \
        DejaVuSans-Bold.ttf \
        DejaVuSans-Oblique.ttf \
        DejaVuSans-BoldOblique.ttf; do \
        url="https://github.com/dejavu-fonts/dejavu-fonts/raw/version_2_37/ttf/$f"; \
        if curl -fsSL "$url" -o "/usr/share/fonts/truetype/dejavu/$f"; then \
            echo "Downloaded $f"; \
        else \
            echo "Failed to download $url"; \
            echo "Falling back to apt install fonts-dejavu-core"; \
            apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
            break; \
        fi; \
    done && \
    fc-cache -f -v || true

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install \
    --index-url https://pypi.org/simple \
    --default-timeout=300 \
    --retries 10 \
    --no-cache-dir \
    -r requirements.txt

COPY src ./src
COPY alembic ./alembic
COPY tests ./tests
COPY alembic.ini .
COPY pytest.ini .

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]